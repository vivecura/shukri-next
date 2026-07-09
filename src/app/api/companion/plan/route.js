// GET /api/companion/plan — "Mein Plan", read-only. Alle FÜNF Item-Arten,
// gruppiert nach kind (Labels/Emojis aus den puren ITEM_KINDS-Konstanten in
// @/lib/companion), sortiert nach sort/created_at (sortPlanItems-Semantik,
// hier direkt per Query-Order).
//
// §9 hart: diese Route berührt den Anamnese-Payload NIE — es gibt keinerlei
// Diagnose in der Antwort. Die UI labelt jedes Item "Empfehlung von Shukri".

import {
  companionAdmin,
  jsonError,
  normTime,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import { ITEM_KINDS } from "@/lib/companion";

export async function GET(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;

    const { data: items, error } = await companionAdmin
      .from("companion_plan_items")
      .select(
        "id, kind, name, dosis, instructions, times, days_of_week, start_date, end_date, event_date, sort, created_at"
      )
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("active", true)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    // Gruppen in der kanonischen ITEM_KINDS-Reihenfolge; leere Gruppen raus.
    const groups = Object.entries(ITEM_KINDS)
      .map(([kind, meta]) => ({
        kind,
        label: meta.label,
        emoji: meta.emoji,
        items: (items || [])
          .filter((it) => it.kind === kind)
          // source (Herkunfts-Label claude/manuell) bleibt bewusst draußen —
          // das ist interne Admin-Information, der Patient braucht sie nicht.
          .map((it) => ({
            id: it.id,
            name: it.name,
            dosis: it.dosis,
            instructions: it.instructions,
            times: (it.times || []).map((t) => normTime(t)),
            days_of_week: it.days_of_week || [],
            start_date: it.start_date,
            end_date: it.end_date,
            event_date: it.event_date,
          })),
      }))
      .filter((g) => g.items.length > 0);

    return Response.json({ ok: true, groups }, { headers: sessionHeaders(session) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/plan:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
