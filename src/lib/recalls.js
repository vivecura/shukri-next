// ============================================================================
// recalls.js — shared data layer / single source of truth for all recall UI.
//
// Every recall-related component (AdminRecallSection in the patient file,
// AdminRecallPanel = Mahmoud's worklist + "Für Shukri", the auto-suggestion in
// AdminAnamnesePanel, and the tab badge in Admin.js) imports its constants,
// helpers and queries from here. No JSX lives in this file — pure logic, so a
// later PWA can reuse it verbatim.
//
// All queries go through the shared anon Supabase singleton and default/filter
// by practice_id from day one (defense-in-depth + correct multi-tenant
// semantics). NOTE: the anon key + "auth all" RLS mean the practice_id filter
// is NOT a security boundary yet — see the securityNote in the design. Real
// role-based RLS is a deliberate later step.
//
// HARD PRECONDITION: the recall_tasks migration
// (supabase/migrations/2026-07-06-recall-tasks.sql, incl. checklist_state +
// postpone_count) must be run once in the Supabase SQL Editor before this code
// goes live — otherwise every query throws PGRST204. SQL first, then code.
// ============================================================================

import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

// Tenant. Today only a field/filter, NOT a security boundary (see securityNote).
export const PRACTICE_ID = "vivecura";

// E-Mail-Allowlist for call agents (Mahmoud). If the logged-in user's e-mail is
// in here, Admin.js boots into the "Anrufe" tab and renders ONLY that tab.
// This is UI-level display logic, NOT data protection (see isCallAgent).
export const CALL_AGENT_EMAILS = [
  "mahmoud@vivecura.com", // <- replace with Mahmoud's real Supabase login e-mail
];

// Standard reasons for a recall call.
export const GRUENDE = [
  "Nach Infusion — Verträglichkeit",
  "Neuer Behandlungsplan — Klarheit",
  "Supplement-Start — Verträglichkeit",
  "Allgemeine Kontrolle — Befinden",
];

// Default question checklist (Mahmoud's Leitfaden). The pre-selected ones are
// STD_PRESELECT; Shukri can toggle any and add his own.
export const STD_FRAGEN = [
  "Wie geht es Ihnen seit der Behandlung?",
  "Infusion gut vertragen — gab es Reaktionen?",
  "Klappt die Einnahme der Präparate? Alles gut verträglich?",
  "Kommen Sie mit den Empfehlungen zurecht (Ernährung, kalt duschen, Bewegung)?",
  "War alles verständlich? Ist der nächste Schritt klar?",
  "Haben Sie das Gefühl, dass es vorangeht?",
  "Brauchen Sie etwas von uns? Soll der Doktor zurückrufen?",
];
export const STD_PRESELECT = [0, 1, 2, 4, 6];

// The pre-selected Leitfaden questions as ready-to-store [{id, text}] — used by
// the auto-recall (created_by 'auto') so an automatically created call still
// carries Mahmoud's default checklist, not an empty one.
export function defaultFragen() {
  return STD_PRESELECT.map((i) => ({ id: newId(), text: STD_FRAGEN[i] }));
}

// Ampel — the through-line 3-colour system (dot in the file list, cardTint in
// the panel, label everywhere). Canonical here; AdminRecallSection re-exports.
export const AMPEL = {
  gruen: { dot: "bg-green-500", label: "🟢 Alles gut", cardTint: "border-green-200" },
  gelb: { dot: "bg-amber-500", label: "🟡 Thema offen", cardTint: "border-amber-200" },
  rot: { dot: "bg-red-500", label: "🔴 Shukri muss ran", cardTint: "border-red-200" },
};

// Status labels for display.
export const STATUS_LABELS = {
  offen: "offen",
  erledigt: "erledigt",
  nicht_erreicht: "nicht erreicht",
};

// Origin labels for the created_by field.
export const ORIGIN_LABELS = {
  shukri: "manuell",
  claude: "von Claude",
  auto: "automatisch",
};

// The iron rule — shown large and permanently on every call card. Mahmoud never
// gives medical advice; on anything medical he sets 🔴 and defers to the doctor.
export const EISERNE_REGEL =
  "Bei jeder medizinischen Frage, Beschwerde oder Unsicherheit: NIE selbst " +
  "beraten. Immer sagen „Das kläre ich mit dem Doktor, er meldet sich bei " +
  "Ihnen.\" und 🔴 setzen. Mahmoud dokumentiert, Shukri entscheidet — das 🔴 " +
  "ist dein wichtigster Job: du bist das Frühwarnsystem der Praxis.";

// ---------------------------------------------------------------------------
// HELPERS (pure)
// ---------------------------------------------------------------------------

// UUID generator — aligned with the existing AdminRecallSection code
// (crypto.randomUUID with a safe fallback), NOT Date.now()+Math.random().
export function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "id-" + Math.random().toString(36).slice(2);
  }
}

// today + n days as an ISO date string (YYYY-MM-DD).
export function plusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// today as an ISO date string (YYYY-MM-DD).
export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Format an ISO/date value as DD.MM.YYYY (German).
export function fmtDate(d) {
  if (!d) return "";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
}

// tel: href with whitespace stripped from the number (house pattern).
export function telHref(handy) {
  return "tel:" + String(handy || "").replace(/\s+/g, "");
}

// Patient display name from a submission row (same fallback as the file list).
export function patientName(sub) {
  if (!sub) return "Unbenannt";
  const name = [sub.vorname, sub.nachname].filter(Boolean).join(" ").trim();
  return name || sub.email || "Unbenannt";
}

// Is a due_date before today (overdue)?
export function isOverdue(due_date) {
  if (!due_date) return false;
  return String(due_date).slice(0, 10) < today();
}

// Is this e-mail a call agent (Mahmoud)? Case-insensitive.
export function isCallAgent(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  return CALL_AGENT_EMAILS.some((a) => String(a).trim().toLowerCase() === e);
}

// Sort a worklist: overdue first, then today, then later; each bucket by
// due_date ascending (oldest first). Non-mutating.
export function sortWorklist(rows) {
  const t = today();
  const bucket = (r) => {
    const d = String(r.due_date || "").slice(0, 10);
    if (d < t) return 0; // overdue
    if (d === t) return 1; // today
    return 2; // later
  };
  return [...(rows || [])].sort((a, b) => {
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;
    const da = String(a.due_date || "");
    const db = String(b.due_date || "");
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

// Head-count style stats for the worklist header: open / overdue / done today.
export function worklistStats(rows) {
  const t = today();
  let offen = 0;
  let ueberfaellig = 0;
  let heuteErledigt = 0;
  for (const r of rows || []) {
    if (r.status === "erledigt") {
      if (String(r.done_at || "").slice(0, 10) === t) heuteErledigt++;
    } else {
      offen++;
      if (isOverdue(r.due_date)) ueberfaellig++;
    }
  }
  return { offen, ueberfaellig, heuteErledigt };
}

// Columns of the joined submission we care about for the worklist cards.
const SUB_JOIN = "anamnese_submissions(id,vorname,nachname,email,handy)";

// ---------------------------------------------------------------------------
// QUERIES (all practice_id-scoped)
// ---------------------------------------------------------------------------

// All recalls of one patient, newest first (patient file / AdminRecallSection).
export async function listForPatient(submissionId) {
  const { data, error } = await supabase
    .from("recall_tasks")
    .select("*")
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Create a recall. createdBy = 'shukri' | 'claude' | 'auto'.
export async function createRecall({
  submissionId,
  grund,
  dueDate,
  fragen = [],
  createdBy = "shukri",
}) {
  const { data, error } = await supabase
    .from("recall_tasks")
    .insert({
      practice_id: PRACTICE_ID,
      submission_id: submissionId,
      grund,
      due_date: dueDate || plusDays(7),
      fragen,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Delete a recall (used by the patient file's remove button).
export async function removeRecall(id) {
  const { error } = await supabase
    .from("recall_tasks")
    .delete()
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id);
  if (error) throw error;
  return true;
}

// Mahmoud's worklist across all patients: everything still to call
// (offen + nicht_erreicht) PLUS today's completed calls (so the header count
// "heute erledigt" is real). Joined with the submission for name/tel.
// No FK-embed is possible for patient_records; that comes via
// fetchPatientRecordsData() in a batch.
export async function listWorklist() {
  const t = today();
  const { data, error } = await supabase
    .from("recall_tasks")
    .select(`*, ${SUB_JOIN}`)
    .eq("practice_id", PRACTICE_ID)
    .or(`status.in.(offen,nicht_erreicht),and(status.eq.erledigt,done_at.gte.${t}T00:00:00)`)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

// "Für Shukri": completed red (first) + yellow, still un-cleared. Same join.
export async function listForShukri() {
  const { data, error } = await supabase
    .from("recall_tasks")
    .select(`*, ${SUB_JOIN}`)
    .eq("practice_id", PRACTICE_ID)
    .eq("status", "erledigt")
    .in("ampel", ["rot", "gelb"])
    .eq("geklaert", false)
    .order("done_at", { ascending: false });
  if (error) throw error;
  // Red first, then yellow; within a colour keep done_at desc from the query.
  const rank = (r) => (r.ampel === "rot" ? 0 : 1);
  return (data || []).sort((a, b) => rank(a) - rank(b));
}

// Batch-load the doctor-entered record blobs for a set of submissions.
// patient_records has no FK-embed path here, so we .in() over submission_id and
// return a map { submissionId -> data-blob } for the "Was der Patient bekommen
// hat" box (behandlungsplan / medikationVonMir / naechsteSchritte).
export async function fetchPatientRecordsData(submissionIds) {
  const ids = (submissionIds || []).filter(Boolean);
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("patient_records")
    .select("submission_id, data")
    .in("submission_id", ids);
  if (error) throw error;
  const map = {};
  for (const row of data || []) {
    map[row.submission_id] = row.data || null;
  }
  return map;
}

// Finish a call: validates ampel && notiz, sets status=erledigt, done_at,
// called_by, and persists the final checklist_state. Throws if the completion
// gate is not satisfied (UI should keep the button disabled before this).
export async function finishCall({ id, ampel, notiz, calledBy, checklistState }) {
  if (!ampel || !String(notiz || "").trim()) {
    throw new Error("Bitte Ampel setzen und kurz notieren.");
  }
  const patch = {
    status: "erledigt",
    ampel,
    notiz,
    called_by: calledBy || null,
    done_at: new Date().toISOString(),
  };
  if (checklistState !== undefined) patch.checklist_state = checklistState;
  const { data, error } = await supabase
    .from("recall_tasks")
    .update(patch)
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// "Nicht erreicht → morgen": status=nicht_erreicht, due_date=+1 day,
// postpone_count+1. The typed notiz is intentionally left untouched.
export async function markNichtErreicht(id) {
  // Read the current postpone_count so we can increment it (no SQL expression
  // available through the JS client).
  const { data: cur, error: readErr } = await supabase
    .from("recall_tasks")
    .select("postpone_count")
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id)
    .single();
  if (readErr) throw readErr;
  const next = (cur?.postpone_count || 0) + 1;
  const { data, error } = await supabase
    .from("recall_tasks")
    .update({
      status: "nicht_erreicht",
      due_date: plusDays(1),
      postpone_count: next,
    })
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Shukri marks a red/yellow case as handled → geklaert=true (removes the card).
export async function resolveForShukri(id) {
  const { data, error } = await supabase
    .from("recall_tasks")
    .update({ geklaert: true })
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Persist Mahmoud's checkbox state during a call ([{id, done:bool}]) so the
// haken survive reload / tab-switch (Panel remounts per tab).
export async function saveChecklistState(id, state) {
  const { error } = await supabase
    .from("recall_tasks")
    .update({ checklist_state: state || [] })
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id);
  if (error) throw error;
  return true;
}

// Badge count: open recalls that are overdue OR due today (the "dringend"
// part of the worklist). head:true → count only, no rows.
export async function countDueOpen() {
  const t = today();
  const { count, error } = await supabase
    .from("recall_tasks")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", PRACTICE_ID)
    .in("status", ["offen", "nicht_erreicht"])
    .lte("due_date", t);
  if (error) throw error;
  return count || 0;
}

// Badge count: completed red cases still awaiting Shukri (un-cleared).
export async function countShukriOpen() {
  const { count, error } = await supabase
    .from("recall_tasks")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", PRACTICE_ID)
    .eq("status", "erledigt")
    .eq("ampel", "rot")
    .eq("geklaert", false);
  if (error) throw error;
  return count || 0;
}

// ---------------------------------------------------------------------------
// Convenience aliases requested by the task brief. These map the requested
// names onto the canonical functions above so there is exactly ONE
// implementation and both naming schemes resolve to it.
// ---------------------------------------------------------------------------

// listRecallsForPatient(submissionId) → listForPatient
export const listRecallsForPatient = listForPatient;

// listOpenRecalls() → the worklist (open + not-reached + today's done)
export const listOpenRecalls = listWorklist;

// listFlaggedForDoctor() → the "Für Shukri" list (red/yellow, un-cleared)
export const listFlaggedForDoctor = listForShukri;

// deleteRecall(id) → removeRecall
export const deleteRecall = removeRecall;

// markCleared(id) → resolveForShukri
export const markCleared = resolveForShukri;

// updateRecallResult(id, { ampel, notiz, status, called_by }) — result-writing
// helper. status defaults to 'erledigt' (finish a call). Goes through the same
// validation/write path as finishCall so completion stays consistent.
export async function updateRecallResult(id, { ampel, notiz, status, called_by } = {}) {
  if (status && status !== "erledigt") {
    // Non-completion status updates (e.g. reopening) — write directly without
    // the ampel/notiz gate.
    const { data, error } = await supabase
      .from("recall_tasks")
      .update({ status, ampel: ampel ?? null, notiz: notiz ?? "", called_by: called_by ?? null })
      .eq("practice_id", PRACTICE_ID)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  return finishCall({ id, ampel, notiz, calledBy: called_by });
}

// postponeToTomorrow(id) → markNichtErreicht
export const postponeToTomorrow = markNichtErreicht;

// countOpenForBadge() → the tab badge number: dringende offene (überfällig/
// heute fällig) + rote ungeklärte Fälle für Shukri. Combines both head-counts.
export async function countOpenForBadge() {
  const [due, shukri] = await Promise.all([countDueOpen(), countShukriOpen()]);
  return (due || 0) + (shukri || 0);
}
