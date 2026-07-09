// GET /api/companion/today — die Heute-Liste des Patienten, komplett in
// Europe/Berlin gerechnet (Vercel = UTC!).
//
// Fällig heute = aktive plan_items der Arten supplement|todo|vorbereitung mit
//   (start_date NULL oder <= heute) UND (end_date NULL oder >= heute) UND
//   (days_of_week leer oder enthält den heutigen ISO-Wochentag).
// Jedes Item wird in Slots expandiert (times[] bzw. EIN Tages-Slot ohne
// Uhrzeit) und mit den heutigen companion_item_logs gejoint → done + logId.
// Dazu der heutige Tages-Check-in ('tag') oder null.
//
// Diese Tabellen enthalten per Schema keine Diagnose-Felder — die Antwort ist
// inhärent label-sicher (§9).

import {
  companionAdmin,
  berlinToday,
  berlinWeekdayIso,
  jsonError,
  normTime,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

const TODAY_KINDS = ["supplement", "todo", "vorbereitung"];

export async function GET(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;
    const date = berlinToday();
    const weekday = berlinWeekdayIso();

    // Aktive, heute laufende Items (Datumsfenster in der Query, Wochentag
    // unten in JS — int[]-contains ist über PostgREST-or nicht sauber).
    const { data: items, error: itemsErr } = await companionAdmin
      .from("companion_plan_items")
      .select(
        "id, kind, name, dosis, instructions, times, days_of_week, start_date, end_date, sort, created_at"
      )
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("active", true)
      .in("kind", TODAY_KINDS)
      .or(`start_date.is.null,start_date.lte.${date}`)
      .or(`end_date.is.null,end_date.gte.${date}`)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (itemsErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    const dueItems = (items || []).filter((it) => {
      const days = it.days_of_week || [];
      return days.length === 0 || days.includes(weekday);
    });

    // Heutige Abhak-Logs des Patienten (ein Query für alle Items).
    const { data: logs, error: logsErr } = await companionAdmin
      .from("companion_item_logs")
      .select("id, item_id, due_time")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("due_date", date);
    if (logsErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    const result = dueItems.map((it) => {
      const slotTimes = (it.times || []).length
        ? (it.times || []).map((t) => normTime(t))
        : [null];
      const slots = slotTimes.map((time) => {
        const log = (logs || []).find(
          (l) => l.item_id === it.id && normTime(l.due_time) === time
        );
        return { time, done: !!log, logId: log?.id || null };
      });
      return {
        id: it.id,
        kind: it.kind,
        name: it.name,
        dosis: it.dosis,
        instructions: it.instructions,
        slots,
      };
    });

    // Heutiger Tages-Check-in ('tag', ohne Baustein-Bezug) oder null.
    const { data: checkin, error: checkinErr } = await companionAdmin
      .from("companion_checkins")
      .select("id, checkin_date, feeling, energy, sleep, notes, help_flag")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("checkin_date", date)
      .eq("context_kind", "tag")
      .is("context_item_id", null)
      .maybeSingle();
    if (checkinErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    return Response.json(
      { ok: true, date, items: result, checkin: checkin || null },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/today:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
