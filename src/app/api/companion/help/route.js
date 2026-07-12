// POST /api/companion/help — der Hilfe-Knopf ("Ich brauche Hilfe / Rückruf").
// Body {note?}. Stellt sicher, dass der heutige Tages-Check-in existiert
// (legt sonst eine Minimal-Zeile an), setzt help_flag=true, hängt die Notiz
// an, erzeugt den roten Für-Shukri-Alert (dedupet pro Berlin-Tag) und sendet
// die SOFORTIGE Praxis-E-Mail (Pflichtenheft §9: rote Liste + E-Mail).
//
// KEIN Notfallkanal: die UI zeigt danach "Wir melden uns bei dir. Im
// Notfall 112." — die Reaktion kommt vom Menschen, nicht von der App.

import {
  companionAdmin,
  berlinToday,
  insertCompanionAlert,
  jsonError,
  PRACTICE_ID,
  requireSession,
  sendPracticeHelpEmail,
  sessionHeaders,
} from "@/lib/server/companionServer";

export async function POST(req) {
  try {
    const session = await requireSession(req);
    const { submissionId, access } = session;

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body ist optional — Hilfe-Knopf darf auch ohne Notiz feuern.
    }
    const note = String(body?.note ?? "").trim().slice(0, 2000);

    const date = berlinToday();

    // Heutigen Tages-Check-in laden oder minimal anlegen; context_kind ist
    // HART 'tag' (kein DB-CHECK auf der Spalte → der Code ist die Grenze).
    const { data: existing, error: selErr } = await companionAdmin
      .from("companion_checkins")
      .select("id, notes, help_flag")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("checkin_date", date)
      .eq("context_kind", "tag")
      .is("context_item_id", null)
      .maybeSingle();
    if (selErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    // checkinId trägt am Ende die id der heutigen Tages-Zeile — sie ist der
    // Anker der deterministischen Alert-Dedupe (insertCompanionAlert).
    let checkinId;
    if (existing) {
      const mergedNotes = note
        ? [String(existing.notes || "").trim(), note].filter(Boolean).join("\n")
        : existing.notes;
      const { error } = await companionAdmin
        .from("companion_checkins")
        .update({ help_flag: true, notes: mergedNotes })
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .eq("id", existing.id);
      if (error) {
        return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
      }
      checkinId = existing.id;
    } else {
      const { data: created, error } = await companionAdmin
        .from("companion_checkins")
        .insert({
          practice_id: PRACTICE_ID,
          submission_id: submissionId,
          checkin_date: date,
          context_kind: "tag",
          context_item_id: null,
          notes: note,
          help_flag: true,
        })
        .select("id")
        .single();
      if (error && error.code !== "23505") {
        return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
      }
      if (error && error.code === "23505") {
        // Race: Check-in entstand parallel — Zeile nachladen und mit
        // DERSELBEN Merge-Logik wie im Normalpfad aktualisieren (help_flag
        // UND Notiz anhängen), damit die Patienten-Notiz nicht aus dem
        // Tagebuch verloren geht.
        const { data: raced, error: racedErr } = await companionAdmin
          .from("companion_checkins")
          .select("id, notes")
          .eq("practice_id", PRACTICE_ID)
          .eq("submission_id", submissionId)
          .eq("checkin_date", date)
          .eq("context_kind", "tag")
          .is("context_item_id", null)
          .maybeSingle();
        if (racedErr || !raced) {
          return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
        }
        const mergedNotes = note
          ? [String(raced.notes || "").trim(), note].filter(Boolean).join("\n")
          : raced.notes;
        const { error: updErr } = await companionAdmin
          .from("companion_checkins")
          .update({ help_flag: true, notes: mergedNotes })
          .eq("practice_id", PRACTICE_ID)
          .eq("submission_id", submissionId)
          .eq("id", raced.id);
        if (updErr) {
          return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
        }
        checkinId = raced.id;
      } else {
        checkinId = created.id;
      }
    }

    // Roter Alert in der bestehenden "Für Shukri"-Liste (recall_tasks).
    const alert = await insertCompanionAlert({
      submissionId,
      patientNumber: access.patient_number,
      reason: "help",
      detail: note,
      checkinId,
    });

    // Pflichtenheft §9: Hilfe-Knopf = rote Liste + SOFORTIGE Praxis-E-Mail.
    // Gleiche Dedupe wie die Liste: nur beim ERSTEN Alert des Berlin-Tags —
    // solange die rote Karte ungeklärt ist, hat die Praxis die Mail schon
    // (und wiederholtes Drücken kann das Postfach nicht fluten). Best-effort:
    // ein Mail-Fehler darf den Hilferuf nie 500en lassen, der rote Alert
    // steht zu diesem Zeitpunkt bereits. Bewusst awaited (kein
    // fire-and-forget) — Vercel friert die Lambda nach der Response ein.
    if (alert.created) {
      await sendPracticeHelpEmail({
        patientNumber: access.patient_number,
        note,
      });
    }

    return Response.json({ ok: true }, { headers: sessionHeaders(session) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/help:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
