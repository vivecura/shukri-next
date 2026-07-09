// POST /api/companion/checkin — den heutigen Tages-Check-in anlegen/ändern.
// Body {feeling?, energy?, sleep?, notes?} — Werte 1-10 (oder null), Notiz
// getrimmt, max. 2000 Zeichen.
//
// Warum select-then-update-else-insert statt PostgREST-Upsert: der UNIQUE-
// Index nutzt einen COALESCE-Ausdruck (context_item_id NULL → Null-UUID),
// darauf ist onConflict unzuverlässig. context_kind ist HART 'tag' und
// context_item_id HART null — die Route nimmt in Stufe 2 bewusst NIE
// client-gelieferte Kontextwerte an (context_kind hat keinen DB-CHECK).
// Ein Update setzt help_flag NIE zurück (der Hilfe-Knopf bleibt gedrückt).
// feeling <= 3 → roter Für-Shukri-Alert (dedupet pro Berlin-Tag).

import {
  companionAdmin,
  berlinToday,
  insertCompanionAlert,
  jsonError,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

const CHECKIN_COLS = "id, checkin_date, feeling, energy, sleep, notes, help_flag";

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
      if (notes !== undefined) patch.notes = notes;
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

    return Response.json(
      { ok: true, checkin },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/checkin:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
