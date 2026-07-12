// GET /api/companion/verlauf — Verlauf + Serien + Einnahme-Treue.
//
// Rückwärtskompatibel erweitert: die bestehenden Felder checkins / serien /
// checkinStreak / symptoms bleiben in Form und Bedeutung erhalten (alte,
// noch offene PWA-Sessions rufen weiter ohne Parameter an) — checkins
// enthält deshalb IMMER mindestens die letzten 30 Einträge aller Zeiten
// (Fenster ∪ Kompat-Zeilen), und die Streaks rechnen auf einem konstanten
// 60-Tage-Fenster, unabhängig vom gewählten range. NEU sind:
//   * ?range=30|90|all (Whitelist, Default '30') — steuert das Check-in-
//     Fenster für die Trend-Charts des Clients.
//   * startDate — frühestes checkin_date überhaupt (Fallback: Anlage-Datum
//     der Submission) für die "Seit deinem Start"-Zeile.
//   * treue — serverseitig FERTIG gerechnete Einnahme-Treue (IST/SOLL) je
//     Baustein + gesamt, bis GESTERN (der laufende Tag würde die Quote
//     unfair drücken). Payload dadurch O(Items) statt O(Log-Slots).
//
// Die Treue-Formeln sind bewusst formelgleich mit den puren Helfern in
// CompanionCharts.js (adherencePercent) bzw. dem geplanten kanonischen
// src/lib/companionStats.js — Shukris spätere Therapie-Statistik rechnet
// exakt dieselben Zahlen:
//   SOLL an Tag D = max(times.length, 1) wenn active UND kind supplement/todo
//     UND D >= created_at-Tag UND (start_date null oder <= D) UND (end_date
//     null oder >= D) UND (days_of_week leer ODER enthält ISO-Wochentag(D));
//     leeres days_of_week heißt TÄGLICH.
//   IST an Tag D = Anzahl deduplizierter Log-Slots, GEDECKELT auf SOLL —
//     Logs vor einer Plan-Änderung dürfen nie über 100 % erzeugen.
//   Prozent = round(100 · ΣIST / ΣSOLL); ΣSOLL = 0 → null ("keine Aussage").
//
// Pflicht-Fix in diesem Umbau: der Logs-Query hatte kein .limit() — PostgREST
// cappt still bei 1000 Zeilen, bei vielen Slots wären Streaks/Treue leise
// falsch gewesen. Jetzt Pagination-Schleife (.range) für Logs UND Check-ins.
//
// Bewusst REINE Darstellung eigener Einträge — keinerlei Bewertungs-/
// Alarm-Wortwahl (§6, kein Medizinprodukt).

import {
  companionAdmin,
  addDaysIso,
  berlinToday,
  jsonError,
  normTime,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

const GENERIC = "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.";

// Whitelist der Zeiträume — alles andere fällt hart auf '30' zurück (nie
// client-gelieferte Werte in Datums-Arithmetik durchreichen).
const RANGE_DAYS = { 30: 30, 90: 90 };

// ISO-Wochentag (1=Mo … 7=So, Format der days_of_week-Spalte) für ein
// HISTORISCHES 'YYYY-MM-DD'. berlinWeekdayIso() gilt nur für JETZT — für
// vergangene Tage ist reine UTC-Arithmetik auf dem Datums-String korrekt
// und TZ-neutral (der String IST bereits das Berliner Kalenderdatum).
function isoWeekday(dateIso) {
  const [y, m, d] = String(dateIso).split("-").map((x) => parseInt(x, 10));
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

// timestamptz → 'YYYY-MM-DD' in Europe/Berlin (en-CA formatiert ISO-artig) —
// nur für den startDate-Fallback aus der Submission.
function toBerlinDateIso(ts) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

// SOLL-Slots eines Items an Tag D — Logik-Spiegel der Heute-Route
// (today/route.js), nur eben für historische Tage. created_at ist die
// einzige untere Schranke: plan_items haben kein Änderungs-Log, rückwirkend
// ist SOLL nur näherungsweise rekonstruierbar (der UTC-Tag von created_at
// reicht als Schranke — die TZ-Kante von max. einem Tag ist bewusst egal).
function sollSlots(item, dateIso) {
  const created = String(item.created_at || "").slice(0, 10);
  if (created && dateIso < created) return 0;
  if (item.start_date && dateIso < String(item.start_date).slice(0, 10)) return 0;
  if (item.end_date && dateIso > String(item.end_date).slice(0, 10)) return 0;
  const days = item.days_of_week || [];
  if (days.length && !days.includes(isoWeekday(dateIso))) return 0;
  // times leer = genau EIN Tages-Slot ohne Uhrzeit — sonst zählte ein Item
  // mit leerem times als 0 und würde nie fällig.
  return Math.max((item.times || []).length, 1);
}

// Streak: aufeinanderfolgende Tage (Set aus 'YYYY-MM-DD') rückwärts ab heute;
// heute ohne Eintrag → Zählung ab gestern (die Serie ist noch nicht gerissen).
function streakEndingToday(datesSet, today) {
  let day = datesSet.has(today) ? today : addDaysIso(today, -1);
  let streak = 0;
  while (datesSet.has(day)) {
    streak += 1;
    day = addDaysIso(day, -1);
  }
  return streak;
}

// Pagination-Schleife gegen das stille PostgREST-Cap von 1000 Zeilen:
// makeQuery liefert je Durchlauf einen FRISCHEN Query-Builder (Supabase-
// Builder sind nicht wiederverwendbar), .range holt Seite für Seite.
async function fetchAllPaged(makeQuery) {
  const PAGE = 1000;
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await makeQuery().range(offset, offset + PAGE - 1);
    if (error) throw jsonError(500, GENERIC);
    all.push(...(data || []));
    if (!data || data.length < PAGE) return all;
  }
}

export async function GET(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;
    const today = berlinToday();

    const rawRange = new URL(req.url).searchParams.get("range");
    const range = rawRange === "90" || rawRange === "all" ? rawRange : "30";

    // Treue zählt IMMER nur bis gestern — der angebrochene Tag würde die
    // Quote drücken, obwohl der Patient ihn noch abhaken kann.
    const bis = addDaysIso(today, -1);
    const treueVonFenster =
      range === "all" ? null : addDaysIso(bis, -(RANGE_DAYS[range] - 1));

    // Check-in-Fenster: Chart-Zeitraum + 7 Vortage (damit der 7-Tage-Schnitt
    // am linken Chart-Rand berechenbar ist), mindestens aber 60 Tage — das
    // deckt das konstante Streak-Fenster (streakSince unten) immer mit ab.
    // 'all' lädt alles (1 Zeile/Tag, paginiert).
    const checkinSince =
      range === "all"
        ? null
        : addDaysIso(today, -Math.max(RANGE_DAYS[range] - 1 + 7, 60));
    // context_kind 'tag' + context_item_id null: künftige infusion/
    // praeparat-Checkins dürfen nie in Tages-Statistiken doppelt zählen.
    const baseCheckinQuery = () =>
      companionAdmin
        .from("companion_checkins")
        .select(
          "id, checkin_date, feeling, energy, sleep, verdauung, stress, " +
            "klarheit, symptom_scores, notes, help_flag"
        )
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .eq("context_kind", "tag")
        .is("context_item_id", null)
        .order("checkin_date", { ascending: false });
    const makeCheckinQuery = () => {
      let q = baseCheckinQuery();
      if (checkinSince) q = q.gte("checkin_date", checkinSince);
      return q;
    };
    const checkinRows = await fetchAllPaged(makeCheckinQuery);

    // Rückwärtskompatibilität: die alte Route lieferte die letzten 30
    // Check-ins ALLER Zeiten, ohne Datumsuntergrenze. Ein Patient mit z. B.
    // 70 Tagen Pause bekäme aus dem beschnittenen Fenster [] — der
    // TagebuchTab ("Letzte Einträge") und alte PWA-Clients ohne ?range
    // wären plötzlich leer, obwohl Einträge existieren. Deshalb zusätzlich
    // immer die letzten 30 Einträge ungefiltert mitladen und per id
    // dedupliziert anhängen; bei 'all' deckt das Fenster ohnehin alles ab.
    // Die Sortierung (checkin_date absteigend) bleibt dabei erhalten: alle
    // Zusatz-Zeilen liegen VOR checkinSince, gehören also ans Ende.
    if (checkinSince) {
      const { data: kompatRows, error: kompatErr } = await baseCheckinQuery().limit(30);
      if (kompatErr) {
        return jsonError(500, GENERIC);
      }
      const seenIds = new Set(checkinRows.map((r) => r.id));
      for (const row of kompatRows || []) {
        if (!seenIds.has(row.id)) checkinRows.push(row);
      }
    }

    // Aktive supplement/todo-Items — EINE Query für Serien UND Treue.
    // active=false wirkt rückwirkend (kein Änderungs-Log): deaktivierte
    // Bausteine verschwinden aus der Zählung, das ist die ehrlichste Lesart.
    // KEIN source-Feld selektieren (§9-Konvention wie plan/route.js).
    const { data: items, error: itemsErr } = await companionAdmin
      .from("companion_plan_items")
      .select(
        "id, kind, name, times, days_of_week, start_date, end_date, sort, created_at"
      )
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("active", true)
      .in("kind", ["supplement", "todo"])
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (itemsErr) {
      return jsonError(500, GENERIC);
    }

    // Treue-Zeitraum: bei 'all' ab dem frühesten Zähl-Tag über alle Items
    // (später von created_at-Tag und start_date), sonst das feste Fenster.
    let von = treueVonFenster;
    if (range === "all") {
      let earliest = null;
      for (const it of items || []) {
        const created = String(it.created_at || "").slice(0, 10);
        const start = it.start_date ? String(it.start_date).slice(0, 10) : "";
        const lower = start > created ? start : created;
        if (lower && (!earliest || lower < earliest)) earliest = lower;
      }
      von = earliest && earliest <= bis ? earliest : bis;
    }
    const letzte14Start = addDaysIso(bis, -13);

    // Logs-Fenster: Serien brauchen 60 Tage, Treue braucht [von … bis],
    // MiniBars die letzten 14 Tage — ein Query ab dem frühesten der drei.
    const logsSince = [addDaysIso(today, -60), von, letzte14Start].reduce(
      (a, b) => (b < a ? b : a)
    );
    const makeLogsQuery = () =>
      companionAdmin
        .from("companion_item_logs")
        .select("item_id, due_date, due_time")
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .gte("due_date", logsSince)
        .order("due_date", { ascending: true })
        .order("id", { ascending: true });
    const logs = await fetchAllPaged(makeLogsQuery);

    // Streak-Fenster: KONSTANT die letzten 60 Tage, unabhängig vom range —
    // eine Serie ist per Definition zeitraum-unabhängig, die "Tage in
    // Folge"-Zahl darf beim Umschalten der Zeitraum-Pille nicht springen.
    // Die Kappung bei max. 61 Tagen ist die dokumentierte, bewusste
    // Obergrenze (Bedeutung des alten 60-Tage-Streaks bleibt erhalten);
    // checkinSince und logsSince laden beide mindestens dieses Fenster.
    const streakSince = addDaysIso(today, -60);

    // Dedupe über den Slot-Schlüssel (item, Tag, COALESCE(due_time,'00:00')) —
    // exakt die Semantik des UNIQUE-Index uq_companion_item_logs_slot, damit
    // ein 00:00-Slot und ein NULL-Slot nie doppelt zählen.
    const seenSlots = new Set();
    const logCounts = new Map(); // item_id → Map('YYYY-MM-DD' → Anzahl Slots)
    const daysByItem = new Map(); // item_id → Set('YYYY-MM-DD') für Serien
    for (const log of logs) {
      const date = String(log.due_date).slice(0, 10);
      if (date >= streakSince) {
        if (!daysByItem.has(log.item_id)) daysByItem.set(log.item_id, new Set());
        daysByItem.get(log.item_id).add(date);
      }
      const slotKey = `${log.item_id}|${date}|${normTime(log.due_time) ?? "00:00"}`;
      if (seenSlots.has(slotKey)) continue;
      seenSlots.add(slotKey);
      let perDay = logCounts.get(log.item_id);
      if (!perDay) {
        perDay = new Map();
        logCounts.set(log.item_id, perDay);
      }
      perDay.set(date, (perDay.get(date) || 0) + 1);
    }

    // Serien: unveränderte Bedeutung (>= 1 Log am Tag → Tag zählt).
    const serien = (items || []).map((it) => ({
      itemId: it.id,
      kind: it.kind,
      name: it.name,
      streak: streakEndingToday(daysByItem.get(it.id) || new Set(), today),
    }));

    // Auch der Check-in-Streak rechnet auf dem konstanten Streak-Fenster —
    // bei 90/'all' liegen mehr Zeilen im Speicher, zählen aber nicht mit.
    const checkinDates = new Set(
      checkinRows
        .map((c) => String(c.checkin_date).slice(0, 10))
        .filter((d) => d >= streakSince)
    );
    const checkinStreak = streakEndingToday(checkinDates, today);

    // Einnahme-Treue: pro Tag IST auf SOLL deckeln, dann summieren.
    let gesamtIst = 0;
    let gesamtSoll = 0;
    const proItem = [];
    for (const it of items || []) {
      const counts = logCounts.get(it.id) || new Map();
      let ist = 0;
      let soll = 0;
      for (let d = von; d <= bis; d = addDaysIso(d, 1)) {
        const s = sollSlots(it, d);
        if (!s) continue;
        soll += s;
        ist += Math.min(counts.get(d) || 0, s);
      }
      gesamtIst += ist;
      gesamtSoll += soll;
      // Items ohne SOLL im Zeitraum weglassen — "keine Aussage" ist keine
      // Zeile wert (der Client zeigt nur, was zählbar war).
      if (soll <= 0) continue;
      // MiniBars: fix die letzten 14 Tage bis gestern, unabhängig vom range —
      // deckelt die Payload und gibt jedem Item dieselbe Mini-Achse.
      const letzte14 = [];
      for (let d = letzte14Start; d <= bis; d = addDaysIso(d, 1)) {
        const s = sollSlots(it, d);
        letzte14.push({ date: d, ist: Math.min(counts.get(d) || 0, s), soll: s });
      }
      proItem.push({
        itemId: it.id,
        name: it.name,
        kind: it.kind,
        ist,
        soll,
        prozent: Math.round((100 * ist) / soll),
        letzte14,
      });
    }
    const treue = {
      von,
      bis,
      gesamt: {
        ist: gesamtIst,
        soll: gesamtSoll,
        prozent:
          gesamtSoll > 0 ? Math.round((100 * gesamtIst) / gesamtSoll) : null,
      },
      proItem,
    };

    // ALLE Symptome (auch inaktive — Beschriftung alter symptom_scores);
    // der Client filtert selbst auf "hat Daten im Fenster".
    const { data: symptoms, error: symErr } = await companionAdmin
      .from("companion_patient_symptoms")
      .select("id, name, active")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (symErr) {
      return jsonError(500, GENERIC);
    }

    // startDate: MIN(checkin_date) aller Zeiten — eigener Mini-Select, weil
    // das Check-in-Fenster oben bei 30/90 beschnitten ist. Fallback ist das
    // Anlage-Datum der Submission (nur created_at selektieren, §9) und
    // notfalls heute — die Zeile ist reine Anzeige, nie ein Grund für 500.
    const { data: firstCheckin, error: firstErr } = await companionAdmin
      .from("companion_checkins")
      .select("checkin_date")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("context_kind", "tag")
      .is("context_item_id", null)
      .order("checkin_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstErr) {
      return jsonError(500, GENERIC);
    }
    let startDate = firstCheckin
      ? String(firstCheckin.checkin_date).slice(0, 10)
      : null;
    if (!startDate) {
      const { data: sub } = await companionAdmin
        .from("anamnese_submissions")
        .select("created_at")
        .eq("id", submissionId)
        .maybeSingle();
      startDate = sub?.created_at ? toBerlinDateIso(sub.created_at) : today;
    }

    return Response.json(
      {
        ok: true,
        checkins: checkinRows,
        serien,
        checkinStreak,
        symptoms: symptoms || [],
        range,
        startDate,
        treue,
      },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/verlauf:", e);
    return jsonError(500, GENERIC);
  }
}
