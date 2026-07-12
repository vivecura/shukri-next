// SERVER ONLY — nie in Client-Komponenten importieren (Service-Key + web-push!)
// ============================================================================
// companionReminders.js — Versand-Logik der Push-Erinnerungen (Stufe 3).
// Die EINZIGE Datei, die web-push importiert; die Cron-Route ruft nur
// runReminderSweep() auf.
//
// DEPENDENCY-HINWEIS (bewusste Abweichung vom fetch-only-Idiom von
// sendPracticeHelpEmail): Web Push verlangt pro Nachricht eine
// aes128gcm-Payload-Verschlüsselung gegen die Geräte-Keys (p256dh/auth) plus
// einen signierten VAPID-JWT. Das per Hand mit node:crypto nachzubauen wäre
// fehleranfällige Krypto — dafür ist die web-push-Dependency gerechtfertigt.
//
// ZEITBASIS: Vercel/Node läuft UTC. JEDE Fälligkeit wird über Europe/Berlin
// gerechnet — via berlinWindowMinutes(): die letzten 10 Minuten werden einzeln
// als Berlin-(date, HH:MM)-Paare enumeriert (Intl, Europe/Berlin). Fällig =
// Mengen-Mitgliedschaft statt Wall-Time→UTC-Rückrechnung; Mitternachts- und
// DST-Übergänge sind damit automatisch korrekt. Der 10-Minuten-Lookback fängt
// Lücken zwischen Läufen (launchd ~60 s, aber tolerant) ab; das Claim-Log
// verhindert Doppelversand bei Überlappung.
//
// DEDUPE = CLAIM-FIRST über companion_push_log (UNIQUE submission_id, ref_key,
// sent_on): erst Eligibility prüfen, dann Claim-INSERT, NUR nach erfolgreichem
// Insert senden. Unique-Konflikt (23505) = ein anderer/früherer Lauf hat schon
// geclaimt → kommentarlos überspringen. Die Race entscheidet die Datenbank.
// Semantik ist AT-MOST-ONCE: scheitert der Versand NACH dem Claim, wird an
// diesem Tag nicht erneut versucht (lieber eine verpasste als eine doppelte
// Erinnerung; Fehler landen laut im console.error).
//
// PAYLOAD-INVARIANTEN (§5/§6, im Schema-Kommentar festgenagelt):
//   * title konstant "ViveCura Companion" — NIE der Klarname (Lockscreens
//     sind fremdeinsehbar).
//   * Jeder Text ist als Shukris Verordnung/Empfehlung gelabelt ("deine
//     Verordnung" / "Empfehlung von Shukri"), NIE als Rat der App (MDR-Grenze:
//     die App dokumentiert und erinnert nur).
//   * Keine Bewertung, Diagnose oder Alarmierung. Deutsch, Du-Anrede.
//   * data.url immer "/companion", tag = ref_key (Geräte-Kollaps), TTL 1800 s.
//
// ENV — LAZY nach companionServer-Muster: NEXT_PUBLIC_VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT werden erst beim ersten Sweep gelesen;
// fehlen sie → LAUTES console.error + configured:false, NIE throw. Der Build
// (next build ohne Env) bleibt damit grün.
// ============================================================================

import webpush from "web-push";
import { randomUUID } from "node:crypto";
import {
  companionAdmin,
  PRACTICE_ID,
  SR_GRUND_PREFIX,
  addDaysIso,
  normTime,
} from "@/lib/server/companionServer";

// Erinnerbare Arten dieser Stufe. next_step-Pushes ("🧭 Denk an die
// Laborkontrolle") und Nachbestell-Hinweise kommen in späteren Iterationen —
// dann als weitere due-Producer hier in dieser Datei.
const REMINDER_KINDS = ["supplement", "todo", "vorbereitung", "infusion_followup"];

// ---------------------------------------------------------------------------
// LAZY VAPID-SETUP — Env erst zur Laufzeit lesen, setVapidDetails erst beim
// ersten Aufruf. Fehlende Keys → laut loggen + null (Sweep endet sauber mit
// configured:false), exakt das sendPracticeHelpEmail-Idiom (nie throw).
// ---------------------------------------------------------------------------
let _vapidConfigured = false;

function getWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:praxis@vivecura.com";
  if (!publicKey || !privateKey) {
    console.error(
      "companion/reminders: VAPID-Keys fehlen (NEXT_PUBLIC_VAPID_PUBLIC_KEY, " +
        "VAPID_PRIVATE_KEY) — es wird NICHTS gesendet. Lokal: .env.local; " +
        "auf Vercel: beide Variablen in Preview UND Production setzen " +
        "(NEXT_PUBLIC_… ist eine Build-Zeit-Variable!)."
    );
    return null;
  }
  if (!_vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    _vapidConfigured = true;
  }
  return webpush;
}

// ---------------------------------------------------------------------------
// ZEIT-HELFER
// ---------------------------------------------------------------------------

// Ein Instant → Berlin-Paar {date: 'YYYY-MM-DD', hm: 'HH:MM'}. hourCycle h23
// explizit, damit Mitternacht "00" heißt (nie "24").
const BERLIN_PAIR_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function berlinPair(instant) {
  const parts = BERLIN_PAIR_FMT.formatToParts(instant);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hm: `${get("hour")}:${get("minute")}`,
  };
}

// Die letzten lookbackMin Minuten (T, T-1, …) als Berlin-Paare. Jede Minute
// wird EINZELN formatiert — Mitternachts-Übergang und DST sind damit
// automatisch korrekt (die Paare tragen ihren echten Berlin-Tag).
export function berlinWindowMinutes(lookbackMin = 10) {
  const nowFloored = Math.floor(Date.now() / 60000) * 60000;
  const pairs = [];
  for (let i = 0; i < lookbackMin; i++) {
    pairs.push(berlinPair(new Date(nowFloored - i * 60000)));
  }
  return pairs;
}

// ISO-Wochentag (1=Mo … 7=So) eines 'YYYY-MM-DD'-Strings. Reine Datums-
// Arithmetik: der String IST schon das Berlin-Kalenderdatum, keine Zeitzone
// nötig (anders als berlinWeekdayIso(), das "jetzt" betrachtet).
function isoWeekdayOfDate(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map((x) => parseInt(x, 10));
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=So … 6=Sa
  return wd === 0 ? 7 : wd;
}

// ---------------------------------------------------------------------------
// FÄLLIGKEITS-REGELN — je Item die fälligen Instanzen im Fenster.
// Eine Instanz = { submissionId, refKey, sentOn, body }. sent_on ist IMMER
// das Berlin-Datum der Instanz (das date des matchenden Fensterpaars bzw. des
// Fälligkeits-Moments), NIE das UTC- oder Lauf-Datum — sonst reißt der
// Dedupe-Schutz genau an der Mitternachtsgrenze, die der Lookback überspannt.
// ---------------------------------------------------------------------------

// REGEL A — Einnahme/Empfehlung (supplement|todo): Datumsfenster wie die
// today-Route (end_date INKLUSIVE — Erinnerungen enden am end_date, der
// App-Zugang bleibt), Wochentag in JS (int[]-contains-Gotcha bei PostgREST),
// Uhrzeiten aus times[] normTime-gekürzt und per Set dedupliziert.
function dueRuleA(item, windowPairs) {
  const due = [];
  const times = [
    ...new Set((item.times || []).map((t) => normTime(t)).filter(Boolean)),
  ];
  if (times.length === 0) return due;
  const days = item.days_of_week || [];

  for (const pair of windowPairs) {
    if (item.start_date && item.start_date > pair.date) continue;
    if (item.end_date && item.end_date < pair.date) continue;
    if (days.length > 0 && !days.includes(isoWeekdayOfDate(pair.date))) continue;
    for (const hm of times) {
      if (hm !== pair.hm) continue;
      const body =
        item.kind === "supplement"
          ? `💊 ${hm} — ${item.name}${item.dosis ? " " + item.dosis : ""} (deine Verordnung)`
          : `🧊 ${item.name} (Empfehlung von Shukri)`;
      due.push({
        submissionId: item.submission_id,
        refKey: `${item.id}|${hm}`,
        sentOn: pair.date,
        body,
      });
    }
  }
  return due;
}

// REGEL B — Vorbereitung (vorbereitung, event_date gesetzt): genau zwei
// Instanzen — Vorabend 19:00 und Termintag 07:30. Berlin-Datum/-Uhrzeit des
// timestamptz-Termins via Intl ableiten, NIE per UTC-Substring. B2 entfällt,
// wenn der Termin selbst vor/um 07:30 Berlin liegt. days_of_week/times/
// start-end_date gelten hier nicht. Bewusst KEINE Erinnerung an den Termin
// selbst — das macht Doctolib; die App erinnert nur an das, was Doctolib
// nicht kennt (deshalb heißt der kind "vorbereitung", nicht "termin").
// Das Label "(Empfehlung von Shukri)" hängt IMMER dran (MDR-Wording, §6) —
// auch ohne instructions liest sich der Text so nie wie ein blanker
// Termin-Reminder (Doctolib-Dublette).
function dueRuleB(item, windowSet) {
  const due = [];
  const eventInstant = new Date(item.event_date);
  if (isNaN(eventInstant.getTime())) return due;
  const ev = berlinPair(eventInstant);
  const suffix = item.instructions ? ` — ${item.instructions}` : "";

  // B1: Vorabend um 19:00.
  const eveDate = addDaysIso(ev.date, -1);
  if (windowSet.has(`${eveDate}|19:00`)) {
    due.push({
      submissionId: item.submission_id,
      refKey: `${item.id}|prep-evening`,
      sentOn: eveDate,
      body: `📋 Morgen: ${item.name}${suffix} (Empfehlung von Shukri)`,
    });
  }

  // B2: am Tag selbst um 07:30 — nur wenn der Termin danach liegt.
  if (ev.hm > "07:30" && windowSet.has(`${ev.date}|07:30`)) {
    due.push({
      submissionId: item.submission_id,
      refKey: `${item.id}|prep-morning`,
      sentOn: ev.date,
      body: `📋 Heute: ${item.name}${suffix} (Empfehlung von Shukri)`,
    });
  }
  return due;
}

// REGEL C — Infusions-Nachfrage (infusion_followup, event_date + Offsets,
// kanonisch {24,72,168}): je Offset h ist der Fälligkeits-Moment der absolute
// Zeitpunkt event_date + h Stunden, auf die Minute gefloort, nach Berlin
// formatiert und gegen die Fensterpaare geprüft. Kein Datums-/Wochentags-
// filter — der Offset IST die Regel.
function dueRuleC(item, windowSet) {
  const due = [];
  const eventInstant = new Date(item.event_date);
  if (isNaN(eventInstant.getTime())) return due;
  const offsets = [...new Set(item.followup_offsets_hours || [])];

  for (const h of offsets) {
    if (!Number.isFinite(h)) continue;
    const t = eventInstant.getTime() + h * 3600000;
    const pair = berlinPair(new Date(Math.floor(t / 60000) * 60000));
    if (!windowSet.has(`${pair.date}|${pair.hm}`)) continue;
    due.push({
      submissionId: item.submission_id,
      refKey: `${item.id}|fu-${h}h`,
      sentOn: pair.date,
      body: `💉 Wie geht es dir nach ${item.name}? 30-Sekunden-Check-in in der App.`,
    });
  }
  return due;
}

// ---------------------------------------------------------------------------
// STUFE-3-VERSAND — Worklist laden, Fälligkeit je Regel prüfen, fällige
// Instanzen claimen und pushen. Aus runReminderSweep() ausgelagert, damit
// die Early-Returns hier (Query-Fehler, nichts fällig) NUR den Versand-Teil
// beenden — der Stufe-4-Block (Smart Recall) im Sweep läuft danach immer.
// Mutiert die übergebenen counters.
// ---------------------------------------------------------------------------
async function sendDueReminders(push, counters, windowPairs, windowSet) {
  // Worklist: EINE Query über alle erinnerbaren Items des Mandanten
  // (nutzt idx_companion_plan_items_practice_active). Die Heute-Anzeige
  // ignoriert reminder_enabled bewusst — der Versand respektiert es zwingend.
  const { data: items, error: itemsErr } = await companionAdmin
    .from("companion_plan_items")
    .select(
      "id, submission_id, kind, name, dosis, instructions, times, " +
        "days_of_week, start_date, end_date, event_date, followup_offsets_hours"
    )
    .eq("practice_id", PRACTICE_ID)
    .eq("active", true)
    .eq("reminder_enabled", true)
    .in("kind", REMINDER_KINDS);
  if (itemsErr) {
    console.error("companion/reminders: Worklist-Query fehlgeschlagen:", itemsErr);
    return;
  }
  counters.checked = (items || []).length;

  // Fälligkeit je Regel in JS.
  const dueList = [];
  for (const item of items || []) {
    if (item.kind === "supplement" || item.kind === "todo") {
      dueList.push(...dueRuleA(item, windowPairs));
    } else if (item.kind === "vorbereitung" && item.event_date) {
      dueList.push(...dueRuleB(item, windowSet));
    } else if (item.kind === "infusion_followup" && item.event_date) {
      dueList.push(...dueRuleC(item, windowSet));
    }
  }
  counters.due = dueList.length;
  if (dueList.length === 0) return;

  // Batch-Eligibility für alle betroffenen Patienten: Zugang aktiv + kein
  // DSGVO-Widerruf (Sperre/Widerruf stoppt Pushes beim nächsten Lauf) UND
  // mindestens eine Subscription. Wer durchfällt, wird VOR dem Claim
  // übersprungen — kein Log-Eintrag verbrannt.
  const submissionIds = [...new Set(dueList.map((d) => d.submissionId))];

  const { data: accessRows, error: accErr } = await companionAdmin
    .from("companion_access")
    .select("submission_id")
    .eq("practice_id", PRACTICE_ID)
    .in("submission_id", submissionIds)
    .eq("active", true)
    .is("consent_revoked_at", null);
  if (accErr) {
    console.error("companion/reminders: Access-Query fehlgeschlagen:", accErr);
    return;
  }
  const eligible = new Set((accessRows || []).map((r) => r.submission_id));

  const { data: subRows, error: subErr } = await companionAdmin
    .from("companion_push_subscriptions")
    .select("submission_id, endpoint, p256dh, auth")
    .eq("practice_id", PRACTICE_ID)
    .in("submission_id", submissionIds);
  if (subErr) {
    console.error("companion/reminders: Subscription-Query fehlgeschlagen:", subErr);
    return;
  }
  const subsByPatient = new Map();
  for (const row of subRows || []) {
    const list = subsByPatient.get(row.submission_id) || [];
    list.push(row);
    subsByPatient.set(row.submission_id, list);
  }

  // Innerhalb dieses Laufs bereits als tot erkannte Endpoints überspringen.
  const deadEndpoints = new Set();

  for (const inst of dueList) {
    const subs = (subsByPatient.get(inst.submissionId) || []).filter(
      (s) => !deadEndpoints.has(s.endpoint)
    );
    if (!eligible.has(inst.submissionId) || subs.length === 0) continue;

    // CLAIM-FIRST: einfacher Insert OHNE upsert/ignoreDuplicates — der
    // Unique-Index entscheidet die Race. 23505 = anderer Lauf war schneller.
    const { error: claimErr } = await companionAdmin
      .from("companion_push_log")
      .insert({
        practice_id: PRACTICE_ID,
        submission_id: inst.submissionId,
        ref_key: inst.refKey,
        sent_on: inst.sentOn,
      });
    if (claimErr) {
      if (claimErr.code === "23505") continue; // schon geclaimt → still
      console.error("companion/reminders: Claim fehlgeschlagen:", claimErr);
      counters.failed += 1;
      continue;
    }
    counters.claimed += 1;

    // Versand an ALLE Geräte des Patienten (Mehrgeräte). Payload streng
    // pseudonym (§5) und als Shukris Verordnung gelabelt (§6/MDR).
    const payload = JSON.stringify({
      title: "ViveCura Companion",
      body: inst.body,
      url: "/companion",
      tag: inst.refKey,
    });

    for (const sub of subs) {
      try {
        await push.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 1800 }
        );
        counters.sent += 1;
      } catch (e) {
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          // Tote Subscription (Abo widerrufen/abgelaufen) → Zeile sofort
          // löschen, endpoint-genau (endpoint ist UNIQUE).
          deadEndpoints.add(sub.endpoint);
          const { error: delErr } = await companionAdmin
            .from("companion_push_subscriptions")
            .delete()
            .eq("practice_id", PRACTICE_ID)
            .eq("endpoint", sub.endpoint);
          if (delErr) {
            console.error(
              "companion/reminders: Cleanup toter Subscription fehlgeschlagen:",
              delErr
            );
          } else {
            counters.deletedSubscriptions += 1;
          }
        } else {
          console.error(
            `companion/reminders: Versand fehlgeschlagen (${String(sub.endpoint).slice(0, 60)}…):`,
            status || e
          );
          counters.failed += 1;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// STUFE 4 — SMART RECALL "KEINE RÜCKMELDUNG"
// Einmal pro Berlin-Tag (Gate SMART_RECALL_HM, 10-Minuten-Lookback wie Regel
// B): App-Patienten, die seit SR_SILENCE_DAYS Tagen keinen Tages-Check-in
// gemacht haben, bekommen eine OFFENE Anruf-Aufgabe in Mahmouds Liste
// ("bitte nachhören"). Kein Push an den Patienten — das ist reine
// Praxis-Innenseite.
//
// Dedupe zweistufig:
//   * Tages-Claim je Patient über companion_push_log (submission_id +
//     ref_key SR_REF_KEY + sent_on = Berlin-Tag): überlappende Sweeps im
//     Lookback-Fenster können keine Doppel-Aufgabe anlegen (23505 = ein
//     anderer Lauf hat schon geclaimt). Die 30-Tage-Retention des Sweeps
//     räumt diese Zeilen automatisch mit ab.
//   * Fachliche Sperren in recall_tasks: eine OFFENE Auto-Aufgabe mit diesem
//     Grund existiert schon → nichts anlegen; oder eine solche Aufgabe wurde
//     in den letzten SR_COOLDOWN_DAYS Tagen ENTSCHIEDEN → Karenzzeit.
//
// Gegenstück: die Check-in-Route (src/app/api/companion/checkin/route.js)
// LÖSCHT offene "App: Keine Rückmeldung"-Aufgaben, sobald der Patient sich
// wieder meldet — der Check-in selbst ist dann der Beleg.
//
// RESTRISIKO (TOCTOU, bewusst akzeptiert): landet ein Check-in ZWISCHEN der
// Funkstille-Query und dem Aufgaben-Insert, entsteht die Aufgabe trotzdem —
// selbstheilend, denn der NÄCHSTE Check-in des Patienten löscht sie über
// die Check-in-Route wieder.
//
// WICHTIG: Der grund darf NIE mit "Companion:" beginnen — dieses Präfix
// filtert recalls.js/isCompanionAlert aus Mahmouds Anrufliste heraus (das
// sind die Für-Shukri-Alerts). "App: …" landet bewusst IN der Liste.
// ---------------------------------------------------------------------------

// Berlin-Uhrzeit des täglichen Stufe-4-Laufs.
const SMART_RECALL_HM = "09:00";
// FUNKSTILLE: so viele Tage ohne Tages-Check-in lösen die Aufgabe aus.
// Dient zugleich als Karenz für NEUE Zugänge — ein Zugang, der jünger ist,
// hatte noch keine faire Chance, sich zu melden.
const SR_SILENCE_DAYS = 3;
// KARENZZEIT nach einer entschiedenen Auto-Aufgabe (erledigt/nicht erreicht):
// so viele Tage lang keine neue "Keine Rückmeldung"-Aufgabe für den Patienten.
const SR_COOLDOWN_DAYS = 7;
// Claim-Schlüssel im Push-Log — systemweit je Patient + Berlin-Tag, an kein
// Plan-Item gebunden (daher ohne <plan_item_id>-Präfix wie bei Regel A-C).
const SR_REF_KEY = "sr-noresponse";
// Voller Grund (Anzeige bei Mahmoud). Das Präfix SR_GRUND_PREFIX ist die
// GETEILTE Konstante aus companionServer.js — die Check-in-Route räumt über
// dasselbe Präfix auf, beide Seiten bleiben automatisch synchron.
const SR_GRUND = SR_GRUND_PREFIX + " — bitte nachhören";

// Mahmouds Standard-Leitfaden als [{id, text}] — bewusste KOPIE der
// vorausgewählten STD_FRAGEN/defaultFragen() aus src/lib/recalls.js: dort
// hängt der anon-Supabase-Client am Modul-Scope, den Server-Code nicht
// importieren soll. Bei Änderungen am Leitfaden BEIDE Stellen pflegen.
const SR_STD_FRAGEN = [
  "Wie geht es Ihnen seit der Behandlung?",
  "Infusion gut vertragen — gab es Reaktionen?",
  "Klappt die Einnahme der Präparate? Alles gut verträglich?",
  "War alles verständlich? Ist der nächste Schritt klar?",
  "Brauchen Sie etwas von uns? Soll der Doktor zurückrufen?",
];

function srDefaultFragen() {
  return SR_STD_FRAGEN.map((text) => ({ id: randomUUID(), text }));
}

// Der Tages-Lauf von Stufe 4. Wirft NIE (eigenes try/catch, loggt laut) —
// ein Fehler hier darf den Erinnerungs-Sweep nicht mit runterziehen.
async function sweepSmartRecall(windowPairs, windowSet) {
  try {
    // windowPairs[0] IST das heutige Berlin-Datum (siehe Retention im Sweep).
    const today = windowPairs[0].date;

    // Tages-Gate wie Regel B: exakt eine Berlin-Uhrzeit; der 10-Minuten-
    // Lookback toleriert Cron-Lücken, überlappende Läufe im Fenster fängt
    // der Claim-Insert unten ab.
    if (!windowSet.has(today + "|" + SMART_RECALL_HM)) return;

    // 1) Alle App-Patienten: Zugang aktiv, App-Einwilligung erteilt und nicht
    //    widerrufen — UND der Zugang ist älter als SR_SILENCE_DAYS Tage.
    const accessCutoffIso = new Date(
      Date.now() - SR_SILENCE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: accessRows, error: accErr } = await companionAdmin
      .from("companion_access")
      .select("submission_id")
      .eq("practice_id", PRACTICE_ID)
      .eq("active", true)
      .is("consent_revoked_at", null)
      .not("consent_app_at", "is", null)
      .lt("created_at", accessCutoffIso);
    if (accErr) {
      console.error("companion/smart-recall: Access-Query fehlgeschlagen:", accErr);
      return;
    }
    const candidateIds = [
      ...new Set((accessRows || []).map((r) => r.submission_id)),
    ];
    if (candidateIds.length === 0) return;

    // 2) Funkstille feststellen: wer hat in den letzten SR_SILENCE_DAYS Tagen
    //    einen Tages-Check-in gemacht? Existenz reicht — der UNIQUE-Index
    //    (max. eine Tages-Zeile je Patient) hält die Query begrenzt.
    //    "Letzter Check-in älter als 3 Tage (oder nie)" heißt genau: KEINE
    //    Zeile mit checkin_date >= heute − SR_SILENCE_DAYS.
    const silenceCutoff = addDaysIso(today, -SR_SILENCE_DAYS);
    const { data: checkinRows, error: chkErr } = await companionAdmin
      .from("companion_checkins")
      .select("submission_id")
      .eq("practice_id", PRACTICE_ID)
      .in("submission_id", candidateIds)
      .eq("context_kind", "tag")
      .is("context_item_id", null)
      .gte("checkin_date", silenceCutoff);
    if (chkErr) {
      console.error("companion/smart-recall: Check-in-Query fehlgeschlagen:", chkErr);
      return;
    }
    const recentlySeen = new Set((checkinRows || []).map((r) => r.submission_id));
    const silentIds = candidateIds.filter((id) => !recentlySeen.has(id));
    if (silentIds.length === 0) return;

    // 3) Fachliche Sperre 1: es gibt schon eine OFFENE oder ZURÜCKGESTELLTE
    //    ("nicht_erreicht") Auto-Aufgabe mit diesem Grund — auch eine
    //    zurückgestellte Aufgabe heißt: Mahmoud hat den Patienten ohnehin
    //    auf dem Tisch.
    const { data: openRows, error: openErr } = await companionAdmin
      .from("recall_tasks")
      .select("submission_id")
      .eq("practice_id", PRACTICE_ID)
      .in("submission_id", silentIds)
      .eq("created_by", "auto")
      .in("status", ["offen", "nicht_erreicht"])
      .like("grund", SR_GRUND_PREFIX + "%");
    if (openErr) {
      console.error(
        "companion/smart-recall: Query offener Auto-Recalls fehlgeschlagen:",
        openErr
      );
      return;
    }

    // 4) Fachliche Sperre 2 (Karenz): in den letzten SR_COOLDOWN_DAYS Tagen
    //    wurde so eine Aufgabe bereits ENTSCHIEDEN (status nicht mehr offen;
    //    updated_at greift beim Statuswechsel via set_recall_updated_at).
    const cooldownIso = new Date(
      Date.now() - SR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: decidedRows, error: decErr } = await companionAdmin
      .from("recall_tasks")
      .select("submission_id")
      .eq("practice_id", PRACTICE_ID)
      .in("submission_id", silentIds)
      .eq("created_by", "auto")
      .neq("status", "offen")
      .gte("updated_at", cooldownIso)
      .like("grund", SR_GRUND_PREFIX + "%");
    if (decErr) {
      console.error("companion/smart-recall: Karenz-Query fehlgeschlagen:", decErr);
      return;
    }

    const blocked = new Set([
      ...(openRows || []).map((r) => r.submission_id),
      ...(decidedRows || []).map((r) => r.submission_id),
    ]);

    for (const submissionId of silentIds) {
      if (blocked.has(submissionId)) continue;

      // CLAIM-FIRST wie beim Push-Versand: einfacher Insert, der Unique-
      // Index entscheidet die Race. 23505 = ein anderer/früherer Lauf hat
      // diesen Patienten heute schon behandelt → still überspringen.
      const { error: claimErr } = await companionAdmin
        .from("companion_push_log")
        .insert({
          practice_id: PRACTICE_ID,
          submission_id: submissionId,
          ref_key: SR_REF_KEY,
          sent_on: today,
        });
      if (claimErr) {
        if (claimErr.code !== "23505") {
          console.error("companion/smart-recall: Claim fehlgeschlagen:", claimErr);
        }
        continue;
      }

      // OFFENE Anruf-Aufgabe für Mahmoud — bewusst NUR die Pflichtfelder,
      // der Rest bleibt auf den Tabellen-Defaults (status 'offen', ampel
      // NULL, notiz '', geklaert false, done_at NULL): exakt die Form, die
      // listWorklist() als offenen Anruf aufnimmt.
      const { error: insErr } = await companionAdmin
        .from("recall_tasks")
        .insert({
          practice_id: PRACTICE_ID,
          submission_id: submissionId,
          grund: SR_GRUND,
          fragen: srDefaultFragen(),
          due_date: today,
          created_by: "auto",
        });
      if (insErr) {
        // AT-MOST-ONCE wie beim Versand: der Claim ist verbraucht, heute
        // gibt es keinen zweiten Versuch — dafür steht der Fehler laut hier.
        console.error(
          "companion/smart-recall: Recall-Insert fehlgeschlagen:",
          insErr
        );
      }
    }
  } catch (e) {
    console.error("companion/smart-recall: unerwartet gescheitert:", e);
  }
}

// ---------------------------------------------------------------------------
// DER SWEEP — von der Cron-Route minütlich aufgerufen. Wirft NIE: ein kaputter
// Patient/Endpoint darf den Rest des Laufs nicht stoppen. Rückgabe-Zähler:
//   configured             VAPID-Keys vorhanden (false = keine Pushes; Stufe 4
//                          läuft trotzdem)
//   checked                geprüfte Plan-Items (Worklist)
//   due                    fällige Erinnerungs-Instanzen im Fenster
//   claimed                erfolgreich beanspruchte Instanzen (Claim-Insert)
//   sent                   erfolgreich zugestellte Pushes (je Subscription)
//   failed                 Fehlversuche (Claim-Fehler ≠ 23505 + Sende-Fehler ≠ 404/410)
//   deletedSubscriptions   aufgeräumte tote Subscriptions (404/410)
// Nach den Erinnerungs-Regeln läuft der Stufe-4-Block (sweepSmartRecall,
// einmal pro Berlin-Tag) — er hat keine eigenen Zähler, nur laute Logs, und
// ist bewusst von der Push-Konfiguration ENTKOPPELT: fehlende VAPID-Keys
// stoppen nur Stufe 3, nie die Anruf-Aufgaben.
// ---------------------------------------------------------------------------
export async function runReminderSweep() {
  const counters = {
    configured: false,
    checked: 0,
    due: 0,
    claimed: 0,
    sent: 0,
    failed: 0,
    deletedSubscriptions: 0,
  };

  try {
    // Zeitfenster + Retention laufen VOR dem Push-Gate: Stufe 4 (Smart
    // Recall) braucht beides und muss auch ohne VAPID-Konfiguration laufen.
    const windowPairs = berlinWindowMinutes(10);
    const windowSet = new Set(windowPairs.map((p) => `${p.date}|${p.hm}`));

    // RETENTION — einmal pro Sweep: Claim-Log-Zeilen älter als 30 Tage
    // (Berlin-Datum, windowPairs[0] IST das heutige Berlin-Datum) abräumen.
    // Still und best effort: das Log ist nur Dedupe-Schutz, ein Fehler hier
    // darf den Sweep nie aufhalten.
    const { error: retErr } = await companionAdmin
      .from("companion_push_log")
      .delete()
      .eq("practice_id", PRACTICE_ID)
      .lt("sent_on", addDaysIso(windowPairs[0].date, -30));
    if (retErr) {
      console.error("companion/reminders: Log-Retention fehlgeschlagen:", retErr);
    }

    // Stufe 3: Erinnerungs-Regeln prüfen und fällige Pushes versenden — NUR
    // mit Push-Konfiguration; ausgelagert (sendDueReminders), damit dessen
    // Early-Returns den Stufe-4-Block darunter nicht überspringen.
    const push = getWebPush();
    if (push) {
      counters.configured = true;
      try {
        await sendDueReminders(push, counters, windowPairs, windowSet);
      } catch (e) {
        console.error(
          "companion/reminders: Erinnerungs-Versand unerwartet gescheitert:",
          e
        );
      }
    } else {
      // configured bleibt false — Details zu den Keys loggt getWebPush() laut.
      console.error(
        "companion/reminders: Push deaktiviert (VAPID fehlt) — Stufe 3 " +
          "übersprungen, Smart Recall (Stufe 4) läuft weiter."
      );
    }

    // Stufe 4: Smart Recall — läuft bewusst NACH den Erinnerungs-Regeln und
    // UNABHÄNGIG von der Push-Konfiguration, best effort (loggt selbst,
    // wirft nie, hält den Sweep nie auf).
    await sweepSmartRecall(windowPairs, windowSet);

    return counters;
  } catch (e) {
    // Der Sweep wirft NIE — auch nicht bei Programmierfehlern: laut loggen,
    // Zähler-Stand zurückgeben, der nächste Lauf kommt in 60 Sekunden.
    console.error("companion/reminders: Sweep unerwartet gescheitert:", e);
    return counters;
  }
}
