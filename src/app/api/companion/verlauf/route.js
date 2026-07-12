// GET /api/companion/verlauf — Verlauf + Serien.
//   * Letzte 30 Tages-Check-ins (checkin_date absteigend) für die Sparklines —
//     inkl. der drei neuen Skalen (verdauung/stress/klarheit) und der
//     individuellen symptom_scores.
//   * symptoms: ALLE Symptome des Patienten (auch deaktivierte!) als
//     id→Name-Basis — deaktivierte Symptome stecken noch in alten
//     symptom_scores und sollen im Verlauf beschriftet bleiben.
//   * Serien: je aktivem supplement/todo-Item ein einfacher Streak =
//     aufeinanderfolgende Berlin-Tage bis heute (bzw. gestern, wenn heute
//     noch nichts abgehakt ist) mit >= 1 item_log, berechnet aus den letzten
//     60 Tagen Logs. Plus ein Check-in-Streak nach derselben Regel.
//
// Bewusst simpel und REINE Darstellung eigener Einträge — keinerlei
// Bewertungs-/Alarm-Wortwahl (§6, kein Medizinprodukt).

import {
  companionAdmin,
  addDaysIso,
  berlinToday,
  jsonError,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

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

export async function GET(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;
    const today = berlinToday();
    const since = addDaysIso(today, -60);

    // Tages-Check-ins: 60 Zeilen laden — die ersten 30 sind die Anzeige,
    // alle Daten zusammen füttern den Check-in-Streak.
    const { data: checkinRows, error: checkinErr } = await companionAdmin
      .from("companion_checkins")
      .select(
        "id, checkin_date, feeling, energy, sleep, verdauung, stress, " +
          "klarheit, symptom_scores, notes, help_flag"
      )
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("context_kind", "tag")
      .order("checkin_date", { ascending: false })
      .limit(60);
    if (checkinErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }
    const checkins = (checkinRows || []).slice(0, 30);

    // Aktive Serien-Items (nur supplement/todo — Vorbereitungen/Termine sind
    // keine Gewohnheiten).
    const { data: items, error: itemsErr } = await companionAdmin
      .from("companion_plan_items")
      .select("id, kind, name, sort, created_at")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("active", true)
      .in("kind", ["supplement", "todo"])
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (itemsErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    // Logs der letzten 60 Berlin-Tage (ein Query für alle Items).
    const { data: logs, error: logsErr } = await companionAdmin
      .from("companion_item_logs")
      .select("item_id, due_date")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .gte("due_date", since);
    if (logsErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    // Pro Item: Set der Tage mit >= 1 Log → Streak.
    const daysByItem = new Map();
    for (const log of logs || []) {
      const key = log.item_id;
      if (!daysByItem.has(key)) daysByItem.set(key, new Set());
      daysByItem.get(key).add(String(log.due_date).slice(0, 10));
    }
    const serien = (items || []).map((it) => ({
      itemId: it.id,
      kind: it.kind,
      name: it.name,
      streak: streakEndingToday(daysByItem.get(it.id) || new Set(), today),
    }));

    const checkinDates = new Set(
      (checkinRows || []).map((c) => String(c.checkin_date).slice(0, 10))
    );
    const checkinStreak = streakEndingToday(checkinDates, today);

    // ALLE Symptome (auch inaktive — Beschriftung alter symptom_scores, siehe
    // Kopfkommentar); der Client filtert selbst auf "hat Daten im Fenster".
    const { data: symptoms, error: symErr } = await companionAdmin
      .from("companion_patient_symptoms")
      .select("id, name, active")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (symErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    return Response.json(
      { ok: true, checkins, serien, checkinStreak, symptoms: symptoms || [] },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/verlauf:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
