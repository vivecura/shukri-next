// POST /api/companion/checkin — den heutigen Tages-Check-in anlegen/ändern.
// Body {feeling?, energy?, sleep?, verdauung?, stress?, klarheit?, notes?,
// symptomScores?} — Skalen 1-10 (oder null), Notiz getrimmt, max. 2000
// Zeichen. symptomScores = { "<symptom_id>": 0-10 } für die individuellen
// Patienten-Symptome (0-10 STÄRKE, höher = stärker); ids, die keinem AKTIVEN
// Symptom DIESES Patienten gehören, fliegen still raus (Ownership-Select —
// der Service-Key umgeht RLS, also prüft der Code). Beim Update wird
// symptom_scores GEMERGT statt ersetzt: unberührte Symptom-Regler kommen
// nicht mit, vorhandene Tageswerte bleiben stehen.
//
// Warum select-then-update-else-insert statt PostgREST-Upsert: der UNIQUE-
// Index nutzt einen COALESCE-Ausdruck (context_item_id NULL → Null-UUID),
// darauf ist onConflict unzuverlässig. context_kind ist HART 'tag' und
// context_item_id HART null — die Route nimmt in Stufe 2 bewusst NIE
// client-gelieferte Kontextwerte an (context_kind hat keinen DB-CHECK).
// Ein Update setzt help_flag NIE zurück (der Hilfe-Knopf bleibt gedrückt).
// feeling <= 3 → roter Für-Shukri-Alert (dedupet pro Berlin-Tag).
// Nach dem Speichern räumt Stufe 4 (Smart Recall) auf: offene
// "App: Keine Rückmeldung"-Aufgaben des Patienten werden gelöscht.
//
// Antwort: { ok, checkin, vergleich } — vergleich ist der Sofort-Vergleich
// fürs Feedback direkt nach dem Speichern (gestern / gleicher Wochentag
// Vorwoche / 7-Tage-Schnitt je Skala + Symptom). ADDITIV und best effort:
// alte Clients ignorieren das Feld, und ein Fehler im Vergleichs-Select darf
// den bereits gespeicherten Check-in nie scheitern lassen (dann null).

import {
  companionAdmin,
  berlinToday,
  insertCompanionAlert,
  jsonError,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
  SR_GRUND_PREFIX,
} from "@/lib/server/companionServer";
import { addDaysIso, buildCheckinVergleich } from "@/lib/companionStats";

const CHECKIN_COLS =
  "id, checkin_date, feeling, energy, sleep, verdauung, stress, klarheit, " +
  "symptom_scores, notes, help_flag";

// 1-10 (int) oder null; undefined = Feld nicht angefasst. Ungültig → Error.
function parseScale(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw jsonError(400, `Bitte für „${label}" einen Wert zwischen 1 und 10 angeben.`);
  }
  return n;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// symptomScores {id: 0-10} → geprüftes Objekt oder undefined (nicht dabei).
// Werte streng 0-10 (int) → sonst 400; Schlüssel, die keine UUID sind oder
// keinem AKTIVEN Symptom dieses Patienten gehören, fliegen still raus (ein
// veralteter Client-Stand soll das Speichern nicht scheitern lassen). Der
// UUID-Vorfilter verhindert den PostgREST-uuid-Cast-Fehler im .in()-Select.
async function parseSymptomScores(raw, submissionId) {
  if (raw === undefined) return undefined;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw jsonError(400, "Ungültige Anfrage.");
  }
  const entries = [];
  for (const [id, value] of Object.entries(raw)) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 10) {
      throw jsonError(
        400,
        "Bitte für deine Symptome Werte zwischen 0 und 10 angeben."
      );
    }
    if (UUID_REGEX.test(id)) entries.push([id, n]);
  }
  if (entries.length === 0) return {};
  const { data: owned, error } = await companionAdmin
    .from("companion_patient_symptoms")
    .select("id")
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .eq("active", true)
    .in("id", entries.map(([id]) => id));
  if (error) {
    throw jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
  const ownedIds = new Set((owned || []).map((s) => s.id));
  return Object.fromEntries(entries.filter(([id]) => ownedIds.has(id)));
}

export async function POST(req) {
  try {
    const session = await requireSession(req);
    const { submissionId, access } = session;

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const feeling = parseScale(body?.feeling, "Befinden");
    const energy = parseScale(body?.energy, "Energie");
    const sleep = parseScale(body?.sleep, "Schlaf");
    const verdauung = parseScale(body?.verdauung, "Verdauung");
    const stress = parseScale(body?.stress, "Stressbelastung");
    const klarheit = parseScale(body?.klarheit, "Klarheit");
    const symptomScores = await parseSymptomScores(
      body?.symptomScores,
      submissionId
    );
    let notes;
    if (body?.notes !== undefined) {
      notes = String(body.notes ?? "").trim();
      if (notes.length > 2000) {
        return jsonError(400, "Die Notiz ist zu lang (maximal 2000 Zeichen).");
      }
    }

    const date = berlinToday();

    // Gibt es den heutigen Tages-Check-in schon?
    const { data: existing, error: selErr } = await companionAdmin
      .from("companion_checkins")
      .select(CHECKIN_COLS)
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("checkin_date", date)
      .eq("context_kind", "tag")
      .is("context_item_id", null)
      .maybeSingle();
    if (selErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    let checkin;
    if (existing) {
      // Update: nur die mitgeschickten Felder; help_flag NIE anfassen.
      const patch = {};
      if (feeling !== undefined) patch.feeling = feeling;
      if (energy !== undefined) patch.energy = energy;
      if (sleep !== undefined) patch.sleep = sleep;
      if (verdauung !== undefined) patch.verdauung = verdauung;
      if (stress !== undefined) patch.stress = stress;
      if (klarheit !== undefined) patch.klarheit = klarheit;
      if (notes !== undefined) patch.notes = notes;
      if (symptomScores !== undefined && Object.keys(symptomScores).length > 0) {
        // Merge statt Ersetzen (siehe Kopfkommentar): nur mitgeschickte
        // Symptom-Werte überschreiben, der Rest des Tages bleibt stehen.
        patch.symptom_scores = {
          ...(existing.symptom_scores || {}),
          ...symptomScores,
        };
      }
      if (Object.keys(patch).length === 0) {
        return Response.json(
          { ok: true, checkin: existing },
          { headers: sessionHeaders(session) }
        );
      }
      const { data, error } = await companionAdmin
        .from("companion_checkins")
        .update(patch)
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .eq("id", existing.id)
        .select(CHECKIN_COLS)
        .single();
      if (error) {
        return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
      }
      checkin = data;
    } else {
      const { data, error } = await companionAdmin
        .from("companion_checkins")
        .insert({
          practice_id: PRACTICE_ID,
          submission_id: submissionId,
          checkin_date: date,
          context_kind: "tag",
          context_item_id: null,
          feeling: feeling ?? null,
          energy: energy ?? null,
          sleep: sleep ?? null,
          verdauung: verdauung ?? null,
          stress: stress ?? null,
          klarheit: klarheit ?? null,
          symptom_scores: symptomScores ?? {},
          notes: notes ?? "",
        })
        .select(CHECKIN_COLS)
        .single();
      if (error) {
        // Race zweier paralleler Erst-Submits: der UNIQUE-Index fängt ihn.
        if (error.code === "23505") {
          return jsonError(409, "Bitte versuche es noch einmal.");
        }
        return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
      }
      checkin = data;
    }

    // Befinden ≤ 3 → roter Alert in "Für Shukri" (dedupet deterministisch
    // über den Marker [checkin:<id>|low_feeling] — die Check-in-id kodiert
    // Patient + Berlin-Tag).
    if (typeof checkin.feeling === "number" && checkin.feeling <= 3) {
      await insertCompanionAlert({
        submissionId,
        patientNumber: access.patient_number,
        reason: "low_feeling",
        detail:
          `${checkin.feeling}/10.` +
          (String(checkin.notes || "").trim()
            ? ` ${String(checkin.notes).trim()}`
            : ""),
        checkinId: checkin.id,
      });
    }

    // STUFE 4 (Smart Recall): eine Rückmeldung räumt auf — alle OFFENEN und
    // ZURÜCKGESTELLTEN ("nicht_erreicht") "App: Keine Rückmeldung"-Auto-
    // Aufgaben dieses Patienten LÖSCHEN statt erledigen, damit Mahmouds
    // "heute erledigt"-Statistik keine Phantom-Anrufe zählt und der Patient
    // komplett von der Anrufliste verschwindet (der Check-in selbst ist der
    // Beleg, dass er sich gemeldet hat). Das grund-Präfix SR_GRUND_PREFIX
    // ist die GETEILTE Konstante aus companionServer.js — beide Seiten
    // bleiben automatisch synchron.
    // Still und best effort: ein Fehler hier darf den bereits gespeicherten
    // Check-in nie scheitern lassen.
    try {
      const { error: srErr } = await companionAdmin
        .from("recall_tasks")
        .delete()
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .eq("created_by", "auto")
        .in("status", ["offen", "nicht_erreicht"])
        .like("grund", SR_GRUND_PREFIX + "%");
      if (srErr) {
        console.error(
          "companion/checkin: Smart-Recall-Aufräumen fehlgeschlagen:",
          srErr
        );
      }
    } catch (e) {
      console.error(
        "companion/checkin: Smart-Recall-Aufräumen fehlgeschlagen:",
        e
      );
    }

    // SOFORT-VERGLEICH: die 7 Vortage nachladen (gestern, gleicher Wochentag
    // Vorwoche und 7-Tage-Schnitt stecken alle im selben Fenster — EIN Select,
    // max. 7 Zeilen, getragen vom Index idx_companion_checkins_submission).
    // Hart auf 'tag' + context_item_id null gefiltert, sonst zählten künftige
    // infusion/praeparat-Check-ins doppelt. Best effort: schlägt der Select
    // fehl, antwortet der Save trotzdem ok mit vergleich null — Speichern
    // darf nie an einer reinen Anzeige-Funktion scheitern.
    let vergleich = null;
    try {
      const { data: histRows, error: histErr } = await companionAdmin
        .from("companion_checkins")
        .select(CHECKIN_COLS)
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .eq("context_kind", "tag")
        .is("context_item_id", null)
        .gte("checkin_date", addDaysIso(date, -7))
        .lt("checkin_date", date);
      if (histErr) {
        console.error("companion/checkin: Vergleichs-Select fehlgeschlagen:", histErr);
      } else {
        // Formeln aus companionStats (kanonische Heimat): gestern / gleicher
        // Wochentag Vorwoche / 7-Tage-Schnitt je Skala + Symptom — die
        // Referenz-Zeilen gehen roh mit, Deltas rechnet der Client.
        vergleich = buildCheckinVergleich(checkin, histRows || [], date);
      }
    } catch (e) {
      console.error("companion/checkin: Vergleichs-Select fehlgeschlagen:", e);
    }

    return Response.json(
      { ok: true, checkin, vergleich },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/checkin:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
