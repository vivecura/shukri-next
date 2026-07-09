// POST /api/companion/toggle-item — einen Heute-Slot abhaken / Haken lösen.
// Body {itemId, time|null, done}. due_date ist IMMER berlinToday() — der
// Patient kann nur heute abhaken (Stufe 2).
//
// Ownership-Check ZUERST: das Item muss (practice_id, submission_id) der
// Session gehören, sonst 404 — der Service-Key umgeht RLS, also prüft der
// Code. done=true → INSERT (23505 = Doppel-Tipp → idempotent ok);
// done=false → DELETE der Log-Zeile (Append-only-Undo laut Schema).
// Antwort: der frische Slot-Zustand für die Optimistic-UI-Abstimmung.
//
// Dokumentierter Schema-Edge-Case: ein expliziter 00:00-Slot kollidiert im
// UNIQUE-Index mit dem NULL-Zeit-Slot (COALESCE auf '00:00') — akzeptiert;
// die UI erzeugt keine 00:00-Slots.

import {
  companionAdmin,
  berlinToday,
  jsonError,
  normTime,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

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

    const itemId = String(body?.itemId || "");
    const time =
      body?.time === null || body?.time === undefined || body?.time === ""
        ? null
        : String(body.time);
    const done = body?.done === true;
    if (!itemId || (time !== null && !TIME_REGEX.test(time))) {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const date = berlinToday();

    // Ownership-Check: gehört das Item wirklich diesem Patienten?
    const { data: item, error: itemErr } = await companionAdmin
      .from("companion_plan_items")
      .select("id")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("id", itemId)
      .maybeSingle();
    if (itemErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }
    if (!item) return jsonError(404, "Baustein nicht gefunden.");

    if (done) {
      const { error: insErr } = await companionAdmin
        .from("companion_item_logs")
        .insert({
          practice_id: PRACTICE_ID,
          item_id: itemId,
          submission_id: submissionId,
          due_date: date,
          due_time: time,
        });
      // 23505 (unique violation am Slot-Index) = Doppel-Tipp → idempotent ok.
      if (insErr && insErr.code !== "23505") {
        return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
      }
    } else {
      let del = companionAdmin
        .from("companion_item_logs")
        .delete()
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .eq("item_id", itemId)
        .eq("due_date", date);
      del = time === null ? del.is("due_time", null) : del.eq("due_time", time);
      const { error: delErr } = await del;
      if (delErr) {
        return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
      }
    }

    // Frischen Slot-Zustand zurückgeben (Reconciliation der Optimistic-UI).
    let sel = companionAdmin
      .from("companion_item_logs")
      .select("id, due_time")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("item_id", itemId)
      .eq("due_date", date);
    sel = time === null ? sel.is("due_time", null) : sel.eq("due_time", time);
    const { data: logs, error: selErr } = await sel;
    if (selErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }
    const log = (logs || [])[0] || null;

    return Response.json(
      {
        ok: true,
        slot: { time: normTime(time), done: !!log, logId: log?.id || null },
      },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/toggle-item:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
