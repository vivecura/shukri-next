// /api/companion/symptoms — die individuellen Symptome des Patienten.
//   POST   {name} → Symptom anlegen (getrimmt, max. 40 Zeichen, höchstens 12
//          AKTIVE je Patient). Doppelter aktiver Name → der partielle
//          UNIQUE-Index (uq_companion_symptoms_name) wirft 23505, hier als
//          freundliche deutsche Meldung gemappt.
//   DELETE {id}   → active=false statt Löschen (Ownership-scoped) — alte
//          Verlaufsdaten (symptom_scores) bleiben so beschriftet lesbar;
//          derselbe Name kann danach neu angelegt werden (Index ist partiell).
//
// Gleiche Wächter wie alle Companion-Routen: requireSession pro Request +
// hartes Scoping auf practice_id/submission_id (Service-Key umgeht RLS).

import {
  companionAdmin,
  jsonError,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

const MAX_NAME_LEN = 40;
const MAX_ACTIVE_SYMPTOMS = 12;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const name = String(body?.name ?? "").trim();
    if (!name) {
      return jsonError(400, "Bitte gib einen Namen für dein Symptom an.");
    }
    if (name.length > MAX_NAME_LEN) {
      return jsonError(
        400,
        `Der Name ist zu lang (maximal ${MAX_NAME_LEN} Zeichen).`
      );
    }

    // Deckel + nächste sort-Position in einem Select. Best-effort gegen
    // Races (wie der Rate-Limiter) — der harte Schutz gegen Duplikate ist
    // der UNIQUE-Index, der Deckel ist reine UI-Hygiene.
    const { data: activeSyms, error: cntErr } = await companionAdmin
      .from("companion_patient_symptoms")
      .select("id, sort")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("active", true);
    if (cntErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }
    if ((activeSyms || []).length >= MAX_ACTIVE_SYMPTOMS) {
      return jsonError(
        400,
        `Mehr als ${MAX_ACTIVE_SYMPTOMS} Symptome gehen nicht — entferne zuerst eines, dann kannst du ein neues ergänzen.`
      );
    }
    const nextSort =
      (activeSyms || []).reduce((m, s) => Math.max(m, s.sort ?? 0), 0) + 1;

    const { data: symptom, error: insErr } = await companionAdmin
      .from("companion_patient_symptoms")
      .insert({
        practice_id: PRACTICE_ID,
        submission_id: submissionId,
        name,
        active: true,
        created_by: "patient",
        sort: nextSort,
      })
      .select("id, name")
      .single();
    if (insErr) {
      // Partieller UNIQUE-Index (submission_id, lower(name)) WHERE active.
      if (insErr.code === "23505") {
        return jsonError(409, `„${name}" steht schon in deiner Liste.`);
      }
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    return Response.json(
      { ok: true, symptom },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/symptoms POST:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}

export async function DELETE(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const id = String(body?.id || "");
    // UUID-Vorfilter: ein Nicht-UUID-Wert würde im uuid-Spalten-Filter einen
    // PostgREST-Cast-Fehler (→ 500) auslösen.
    if (!UUID_REGEX.test(id)) {
      return jsonError(400, "Ungültige Anfrage.");
    }

    // Ownership steckt im Scoping des Updates selbst: ohne Treffer (fremdes
    // oder unbekanntes Symptom) kommt eine leere Liste zurück → 404.
    const { data: updated, error: updErr } = await companionAdmin
      .from("companion_patient_symptoms")
      .update({ active: false })
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("id", id)
      .select("id");
    if (updErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }
    if (!updated || updated.length === 0) {
      return jsonError(404, "Symptom nicht gefunden.");
    }

    return Response.json({ ok: true }, { headers: sessionHeaders(session) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/symptoms DELETE:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
