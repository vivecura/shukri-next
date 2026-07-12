// ============================================================================
// companion.js — shared data layer / single source of truth for all Companion
// UI (ViveCura Companion, Stufe 1 "Datenfundament der Patienten-App").
//
// Every companion-related component (AdminCompanionSection in the patient
// file's 📱 App tab today; the patient-facing PWA in Stufe 2) imports its
// constants, helpers and queries from here. No JSX lives in this file — pure
// logic, so the Stufe-2 PWA can reuse it verbatim.
//
// securityNote: all queries go through the shared anon Supabase singleton and
// default/filter by practice_id from day one (defense-in-depth + correct
// multi-tenant semantics). The anon key + "auth all" RLS mean the practice_id
// filter is NOT a security boundary yet: every logged-in account (also
// Mahmoud) can read/write all companion_* rows via the API; the admin
// switches are UI only. Patients do not touch these tables in Stufe 1 at all —
// patient access arrives in Stufe 2 exclusively through server routes
// (service key server-side only, each patient sees only themselves). Real
// role-based RLS is a deliberate later step.
//
// KI-Exit (Leitprinzip 6): this website/app NEVER calls any KI itself — no
// SDKs, no keys, no fetches to a model. Claude only writes from the outside
// via _tools/companion_import.py with ONE revocable service key, and only
// into the draft queue (companion_plan_imports, status 'wartet'). Every row
// it produces carries its origin (plan_imports.created_by / plan_items.source
// = 'claude'), so KI data is provable and selectively deletable. Emergency
// exit: Projects/Follow-Up-App/KI-NOTAUS.md. Caveat, honestly documented
// there: with the project's LEGACY JWT keys a "rotate JWT secret" revocation
// also invalidates the anon key hardcoded in supabaseClient.js — the runbook
// therefore pairs the rotation with the anon-key redeploy in one action.
//
// HARD PRECONDITION: the companion migration
// (supabase/migrations/2026-07-09-companion-foundation.sql) must be run once
// in the Supabase SQL Editor before this code goes live — otherwise every
// query throws PGRST204. SQL first, then code. If the migration was already
// run BEFORE the Widerrufs-Spalte was added, re-run it (idempotent) — it now
// also ALTERs companion_access.consent_revoked_at, which setConsent/
// hasKiConsent require.
// ============================================================================

import { supabase } from "@/lib/supabaseClient";

// Pure helpers shared with the recall layer. Canonical in @/lib/recalls —
// re-exported here so companion UI has ONE import path; do NOT reimplement.
export { newId, today, plusDays, fmtDate, patientName } from "@/lib/recalls";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

// Tenant. Today only a field/filter, NOT a security boundary (see securityNote).
export const PRACTICE_ID = "vivecura";

// The five plan-item kinds. The app only REMINDS of what Shukri prescribed
// ("Empfehlung von Shukri") — it never recommends anything itself (kein
// Medizinprodukt). Keys are the DB values of companion_plan_items.kind.
export const ITEM_KINDS = {
  supplement: { label: "Supplement", emoji: "💊" },
  todo: { label: "To-do", emoji: "✅" },
  vorbereitung: { label: "Vorbereitung", emoji: "📋" },
  next_step: { label: "Nächster Schritt", emoji: "➡️" },
  infusion_followup: { label: "Infusions-Nachsorge", emoji: "💉" },
};

// Whitelist of valid kind ids (import mapping + form validation).
export const ITEM_KIND_IDS = Object.keys(ITEM_KINDS);

// Origin labels for plan_items.source / plan_imports.created_by — the visible
// end of the KI-Exit: every row shows where it came from.
export const SOURCE_LABELS = {
  claude: "von Claude",
  manuell: "manuell",
};

// Status labels for the import queue.
export const IMPORT_STATUS_LABELS = {
  wartet: "wartet",
  uebernommen: "übernommen",
  verworfen: "verworfen",
};

// The quiet hint shown wherever the consent gate is closed.
export const CONSENT_HINT = "Nur mit KI-Einwilligung";

// ISO weekdays (1=Mo … 7=So) for the pill toggles + fmtWeekdays.
export const WEEKDAYS = [
  { n: 1, label: "Mo" },
  { n: 2, label: "Di" },
  { n: 3, label: "Mi" },
  { n: 4, label: "Do" },
  { n: 5, label: "Fr" },
  { n: 6, label: "Sa" },
  { n: 7, label: "So" },
];

// ---------------------------------------------------------------------------
// HELPERS (pure)
// ---------------------------------------------------------------------------

// Next free patient number: parses existing VC-#### pseudonyms, takes max+1,
// pads to 4 digits (VC-0001, VC-0042, …). First patient ever gets VC-0001.
// The UNIQUE index on companion_access (practice_id, patient_number) is the
// safety net against a race between two admins — a collision surfaces as an
// insert error. Eindeutig je Mandant, nicht global (Verkaufsphase: zwei
// Praxen dürfen beide eine VC-0001 haben).
export function nextPatientNumber(existingNumbers) {
  let max = 0;
  for (const raw of existingNumbers || []) {
    const m = String(raw || "").match(/^VC-(\d{4,})$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return "VC-" + String(max + 1).padStart(4, "0");
}

// The consent gate, evaluated from both possible sources: the anamnese
// checkbox (payload.consent_ki_pseudonym) OR a stored consent on the access
// row (consent_app_at set, e.g. consent_source 'manuell'). No consent = no
// access, no import, no QR.
//
// Widerruf (DSGVO Art. 7(3), Leitprinzip 2): a set consent_revoked_at on the
// access row OVERRIDES everything — including the immutable anamnese checkbox
// in the payload. Without this override, anamnese patients could never close
// the gate again ("jederzeit mit Wirkung für die Zukunft widerrufbar" is a
// promise in the signed consent text of public/anamnese.html).
export function hasKiConsent(anamneseConsent, access) {
  if (access && access.consent_revoked_at) return false;
  return !!anamneseConsent || !!(access && access.consent_app_at);
}

// Format a time[] value for display: Postgres returns "08:00:00" — show
// "08:00, 20:00".
export function fmtTimes(times) {
  return (times || []).map((t) => String(t).slice(0, 5)).join(", ");
}

// Parse a comma-separated times input ("8:00, 20:00") into a clean, sorted,
// deduplicated array of HH:MM strings. Invalid pieces are dropped — the form
// re-renders from the parsed result, so nothing gets lost silently.
export function parseTimesInput(str) {
  const out = new Set();
  for (const piece of String(str || "").split(",")) {
    const m = piece.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h > 23 || min > 59) continue;
    out.add(String(h).padStart(2, "0") + ":" + m[2]);
  }
  return [...out].sort();
}

// Format a days_of_week array: empty = every day ("täglich"), otherwise the
// German short labels in weekday order ("Mo, Mi, Fr").
export function fmtWeekdays(days) {
  const list = (days || []).slice().sort((a, b) => a - b);
  if (!list.length) return "täglich";
  return list
    .map((n) => WEEKDAYS.find((w) => w.n === n)?.label)
    .filter(Boolean)
    .join(", ");
}

// Parse a comma-separated hours input ("24, 72") into a clean, sorted,
// deduplicated array of positive integers — the followup_offsets_hours of an
// infusion_followup item. Invalid pieces are dropped (same contract as
// parseTimesInput: the form re-renders from the parsed result).
export function parseOffsetsInput(str) {
  const out = new Set();
  for (const piece of String(str || "").split(",")) {
    const t = piece.trim();
    if (!/^\d+$/.test(t)) continue;
    const n = parseInt(t, 10);
    if (n > 0) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

// timestamptz ⇄ <input type="datetime-local"> — the two conversions around
// event_date. toDatetimeLocalInput renders the stored instant in the
// browser's local time ("YYYY-MM-DDTHH:MM") for the input value;
// datetimeLocalToIso turns the input value back into an ISO instant
// (null when empty/invalid — event_date is optional).
export function toDatetimeLocalInput(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    p(d.getMonth() + 1) +
    "-" +
    p(d.getDate()) +
    "T" +
    p(d.getHours()) +
    ":" +
    p(d.getMinutes())
  );
}

export function datetimeLocalToIso(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Sort plan items for display: sort ascending, then created_at ascending.
// Non-mutating.
export function sortPlanItems(rows) {
  return [...(rows || [])].sort((a, b) => {
    const sa = a.sort ?? 0;
    const sb = b.sort ?? 0;
    if (sa !== sb) return sa - sb;
    const ca = String(a.created_at || "");
    const cb = String(b.created_at || "");
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// QUERIES (all practice_id-scoped)
// ---------------------------------------------------------------------------

// companion_access: explizite Spaltenliste statt select("*"). pin_hash wird
// nur INTERN gelesen (für das abgeleitete has_pin) und verlässt die
// Datenschicht nie — der Hash hat im Admin-Client-State nichts verloren.
// Komponenten fragen ausschließlich access.has_pin ab.
const ACCESS_COLS =
  "id, practice_id, submission_id, patient_number, pin_hash, qr_token, " +
  "consent_app_at, consent_source, consent_revoked_at, active, created_at, " +
  "updated_at, nickname, community_joined_at";

// pin_hash → has_pin mappen und den Hash aus der Rückgabe tilgen. nickname +
// community_joined_at (Community-Beitritt, Stufe 6) laufen unverändert durch —
// der Spread reicht, nur der Hash wird getilgt.
function toAccessView(row) {
  if (!row) return null;
  return { ...row, has_pin: !!row.pin_hash, pin_hash: undefined };
}

// The one access row of a patient, or null (maybeSingle: no row is normal —
// it just means no app access has been created yet).
export async function getAccess(submissionId) {
  const { data, error } = await supabase
    .from("companion_access")
    .select(ACCESS_COLS)
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error) throw error;
  return toAccessView(data);
}

// Did the patient tick the KI consent in the anamnese form? The gate reads
// EXPLICITLY payload.consent_ki_pseudonym — nothing else in the payload
// grants consent. anamnese_submissions is a pre-tenant table without a
// practice_id column; the unique id is the filter here.
export async function getAnamneseKiConsent(submissionId) {
  const { data, error } = await supabase
    .from("anamnese_submissions")
    .select("payload")
    .eq("id", submissionId)
    .maybeSingle();
  if (error) throw error;
  return !!data?.payload?.consent_ki_pseudonym;
}

// All patient numbers already in use (input for nextPatientNumber).
export async function listPatientNumbers() {
  const { data, error } = await supabase
    .from("companion_access")
    .select("patient_number")
    .eq("practice_id", PRACTICE_ID);
  if (error) throw error;
  return (data || []).map((r) => r.patient_number);
}

// Create the app access for a patient: consent gate first, then the next free
// VC-#### number. consentSource 'manuell' = Shukri ticked the box after the
// patient signed at the appointment; without consentSource we require the
// anamnese checkbox. pin_hash/qr_token stay empty — login is Stufe 2.
export async function createAccess({ submissionId, consentSource }) {
  let source = consentSource || null;
  if (!source) {
    const anamneseConsent = await getAnamneseKiConsent(submissionId);
    if (!anamneseConsent) {
      throw new Error("Ohne KI-Einwilligung wird kein Zugang angelegt.");
    }
    source = "anamnese";
  }
  const patientNumber = nextPatientNumber(await listPatientNumbers());
  // If two admins race to the same number, the UNIQUE index on
  // (practice_id, patient_number) rejects the second insert — error is passed
  // through on purpose (retry re-reads the numbers).
  const { data, error } = await supabase
    .from("companion_access")
    .insert({
      practice_id: PRACTICE_ID,
      submission_id: submissionId,
      patient_number: patientNumber,
      consent_app_at: new Date().toISOString(),
      consent_source: source,
    })
    .select(ACCESS_COLS)
    .single();
  if (error) throw error;
  return toAccessView(data);
}

// Store/withdraw the consent on the access row. granted=false = Widerruf
// (DSGVO Art. 7(3)): clears consent_app_at + consent_source, stamps
// consent_revoked_at AND sets active=false — withdrawal locks the access
// immediately and overrides the immutable anamnese checkbox (see
// hasKiConsent), data stays (DSGVO deletion is separate).
// If no access row exists yet: granting consent creates the row via
// createAccess (manual patient signs at the appointment); WITHDRAWING creates
// a revoked-only row — companion_access is the only persistence, and an
// anamnese patient's Widerruf must survive reloads even before any access
// was created. Re-granting later clears consent_revoked_at again.
export async function setConsent({ submissionId, granted, source }) {
  const access = await getAccess(submissionId);
  if (!access) {
    if (!granted) {
      // Widerruf ohne bestehende Zugangs-Zeile (Anamnese-Häkchen gesetzt,
      // Zugang nie angelegt): Zeile nur als Widerrufs-Anker anlegen —
      // kein consent, gesperrt, aber mit Patientennummer (UNIQUE/NOT NULL).
      const patientNumber = nextPatientNumber(await listPatientNumbers());
      const { data, error } = await supabase
        .from("companion_access")
        .insert({
          practice_id: PRACTICE_ID,
          submission_id: submissionId,
          patient_number: patientNumber,
          consent_app_at: null,
          consent_source: null,
          consent_revoked_at: new Date().toISOString(),
          active: false,
        })
        .select(ACCESS_COLS)
        .single();
      if (error) throw error;
      return toAccessView(data);
    }
    return createAccess({ submissionId, consentSource: source || "manuell" });
  }
  const patch = granted
    ? {
        consent_app_at: new Date().toISOString(),
        consent_source: source || "manuell",
        consent_revoked_at: null,
      }
    : {
        consent_app_at: null,
        consent_source: null,
        consent_revoked_at: new Date().toISOString(),
        active: false,
      };
  const { data, error } = await supabase
    .from("companion_access")
    .update(patch)
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .select(ACCESS_COLS)
    .single();
  if (error) throw error;
  return toAccessView(data);
}

// Lock/unlock the access without losing data (active toggle in Block A).
export async function setActive(submissionId, active) {
  const { data, error } = await supabase
    .from("companion_access")
    .update({ active: !!active })
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .select(ACCESS_COLS)
    .single();
  if (error) throw error;
  return toAccessView(data);
}

// PIN reset (Block A): pin_hash → null. Beim nächsten Besuch durchläuft der
// Patient wieder "PIN festlegen" (set-pin claimt nur WHERE pin_hash IS NULL).
// Bestehende Session-Cookies des Patienten bleiben technisch gültig, solange
// der Zugang aktiv ist — dokumentiert akzeptiert (Stufe 2); harte Sperre =
// "Zugang gesperrt" (setActive false).
export async function resetPin(submissionId) {
  const { data, error } = await supabase
    .from("companion_access")
    .update({ pin_hash: null })
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .select(ACCESS_COLS)
    .single();
  if (error) {
    throw new Error("PIN konnte nicht zurückgesetzt werden. Bitte erneut versuchen.");
  }
  return toAccessView(data);
}

// All plan items of one patient in display order (Block C).
export async function listPlanItems(submissionId) {
  const { data, error } = await supabase
    .from("companion_plan_items")
    .select("*")
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Create or update a plan item. With item.id → update (source stays as it is:
// editing Claude's item keeps its origin badge); without → insert with
// practice_id + source (default 'manuell').
export async function upsertPlanItem(item) {
  if (
    !item?.kind ||
    !ITEM_KIND_IDS.includes(item.kind) ||
    !String(item.name || "").trim()
  ) {
    throw new Error("Bitte Art wählen und Namen angeben.");
  }
  const row = {
    kind: item.kind,
    name: String(item.name).trim(),
    dosis: String(item.dosis ?? ""),
    instructions: String(item.instructions ?? ""),
    times: Array.isArray(item.times) ? item.times : [],
    days_of_week: Array.isArray(item.days_of_week) ? item.days_of_week : [],
    reminder_enabled: item.reminder_enabled !== false,
    start_date: item.start_date || null,
    end_date: item.end_date || null,
    event_date: item.event_date || null,
    followup_offsets_hours: Array.isArray(item.followup_offsets_hours)
      ? item.followup_offsets_hours
      : [],
    active: item.active !== false,
    sort: Number.isFinite(item.sort) ? item.sort : 0,
  };
  if (item.id) {
    let q = supabase
      .from("companion_plan_items")
      .update(row)
      .eq("practice_id", PRACTICE_ID)
      .eq("id", item.id);
    // Defense-in-Depth gegen Cross-Patient-Writes: wenn der Aufrufer die
    // submission_id mitgibt (die UI tut das immer), muss die Zeile auch zu
    // GENAU diesem Patienten gehören — ein veraltetes form.id aus einer
    // anderen Akte trifft dann keine fremde Zeile mehr (.single() wirft).
    if (item.submission_id) q = q.eq("submission_id", item.submission_id);
    const { data, error } = await q.select("*").single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("companion_plan_items")
    .insert({
      ...row,
      practice_id: PRACTICE_ID,
      submission_id: item.submission_id,
      source: item.source || "manuell",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Delete a plan item (two-step confirm lives in the UI, not here).
export async function deletePlanItem(id) {
  const { error } = await supabase
    .from("companion_plan_items")
    .delete()
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id);
  if (error) throw error;
  return true;
}

// Import queue of one patient, newest first (Block B: waiting cards + grey
// history of decided drafts).
export async function listImportsForPatient(submissionId) {
  const { data, error } = await supabase
    .from("companion_plan_imports")
    .select("*")
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Badge count: drafts waiting for Shukri's decision, across all patients.
// head:true → count only, no rows.
export async function countPendingImports() {
  const { count, error } = await supabase
    .from("companion_plan_imports")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", PRACTICE_ID)
    .eq("status", "wartet");
  if (error) throw error;
  return count || 0;
}

// Shukri's "Übernehmen" click = the ärztliche Verordnung. Re-checks the
// consent gate at the moment of the click (Doppelschloss: the UI blocks too,
// but the data layer never trusts the UI alone), maps the draft items onto
// plan_items rows — and CLAIMS the draft atomically before inserting.
//
// Write order, honestly documented: the anon client has no transaction
// support. The draft is claimed first via a conditional update
// ('wartet' → 'uebernommen' mit .eq("status","wartet")): of two racing
// "Übernehmen"-clicks only ONE matches the filter — the loser gets no row
// back and a clear German error instead of duplicate items. Only THEN are
// the plan items inserted; if that insert fails, the claim is reverted to
// 'wartet' (best effort) and the insert error rethrown — nothing is silently
// lost or duplicated. A server route in Stufe 2 can wrap this in one real
// transaction.
export async function acceptImport(importId) {
  const { data: imp, error: readErr } = await supabase
    .from("companion_plan_imports")
    .select("*")
    .eq("practice_id", PRACTICE_ID)
    .eq("id", importId)
    .single();
  if (readErr) throw readErr;
  if (imp.status !== "wartet") {
    throw new Error("Dieser Entwurf wurde bereits entschieden.");
  }

  const [anamneseConsent, access] = await Promise.all([
    getAnamneseKiConsent(imp.submission_id),
    getAccess(imp.submission_id),
  ]);
  if (!hasKiConsent(anamneseConsent, access)) {
    throw new Error("Übernahme nur mit KI-Einwilligung möglich.");
  }

  const items = Array.isArray(imp.payload?.items) ? imp.payload.items : [];
  if (!items.length) {
    throw new Error("Der Entwurf enthält keine Bausteine.");
  }

  // Origin follows the draft: a manual draft stays 'manuell', everything else
  // (i.e. companion_import.py) is 'claude' — the KI-Exit label on every row.
  const source = imp.created_by === "manuell" ? "manuell" : "claude";
  const rows = items.map((it, i) => {
    const kind = it?.kind;
    const name = String(it?.name || "").trim();
    if (!ITEM_KIND_IDS.includes(kind) || !name) {
      // Never silently drop a prescribed Baustein — fail loudly instead.
      throw new Error(
        `Baustein ${i + 1} ist unvollständig (Art oder Name fehlt).`
      );
    }
    return {
      practice_id: PRACTICE_ID,
      submission_id: imp.submission_id,
      kind,
      name,
      dosis: String(it.dosis ?? ""),
      instructions: String(it.instructions ?? ""),
      times: Array.isArray(it.times) ? it.times : [],
      days_of_week: Array.isArray(it.days_of_week) ? it.days_of_week : [],
      reminder_enabled: it.reminder_enabled !== false,
      start_date: it.start_date || null,
      end_date: it.end_date || null,
      event_date: it.event_date || null,
      followup_offsets_hours: Array.isArray(it.followup_offsets_hours)
        ? it.followup_offsets_hours
        : [],
      source,
      sort: i, // keep the draft's order
    };
  });

  // Atomarer Claim: nur wenn der Entwurf JETZT noch 'wartet' ist, gewinnt
  // dieser Klick — ein paralleler Klick (zweiter Tab, zweiter Rechner) trifft
  // die .eq("status","wartet")-Bedingung nicht mehr und bekommt keine Zeile.
  const { data: claimed, error: claimErr } = await supabase
    .from("companion_plan_imports")
    .update({ status: "uebernommen", decided_at: new Date().toISOString() })
    .eq("practice_id", PRACTICE_ID)
    .eq("id", importId)
    .eq("status", "wartet")
    .select("*");
  if (claimErr) throw claimErr;
  if (!claimed || claimed.length === 0) {
    throw new Error("Dieser Entwurf wurde bereits entschieden.");
  }

  const { error: insErr } = await supabase
    .from("companion_plan_items")
    .insert(rows);
  if (insErr) {
    // Best-effort-Rollback: Claim zurücknehmen, damit der Entwurf nicht als
    // 'uebernommen' ohne Bausteine hängen bleibt. Ein Fehler HIER wird bewusst
    // geschluckt — die relevante Meldung ist der ursprüngliche Insert-Fehler.
    try {
      await supabase
        .from("companion_plan_imports")
        .update({ status: "wartet", decided_at: null })
        .eq("practice_id", PRACTICE_ID)
        .eq("id", importId);
    } catch {
      // bewusst leer (best effort)
    }
    throw insErr;
  }

  return claimed[0];
}

// Reject a draft: status 'verworfen' + decided_at; NO plan items are created.
// The note (e.g. the reason) only overwrites the stored one when provided —
// otherwise the original note (e.g. the Protokoll source) stays readable in
// the grey history card. Same atomic guard as acceptImport: only a draft that
// is STILL 'wartet' can be rejected — a racing second decision gets no row
// and a clear error instead of silently overwriting the first one.
export async function rejectImport(importId, note = "") {
  const patch = { status: "verworfen", decided_at: new Date().toISOString() };
  if (String(note || "").trim()) patch.note = note;
  const { data, error } = await supabase
    .from("companion_plan_imports")
    .update(patch)
    .eq("practice_id", PRACTICE_ID)
    .eq("id", importId)
    .eq("status", "wartet")
    .select("*");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Dieser Entwurf wurde bereits entschieden.");
  }
  return data[0];
}

// ---------------------------------------------------------------------------
// COMMUNITY-MODERATION (Stufe 6) — Admin-Sicht auf Beiträge, Kommentare und
// Meldungen. NUR hier darf die Klarname↔Nickname-Zuordnung sichtbar werden
// (nickname + patient_number über companion_access); nach außen (Patienten-
// Routen) gilt weiter das Klarnamen-Verbot. Moderation = hidden-Flag, NIE
// Hard-Delete (Nachweisbarkeit). Gleiches Query-Muster wie oben: alles
// practice_id-gescoped über den geteilten Auth-Client.
// ---------------------------------------------------------------------------

// Deutsche Labels der meldbaren Ziel-Arten (companion_reports.target_kind).
export const REPORT_KIND_LABELS = {
  post: "Beitrag",
  comment: "Kommentar",
  message: "Nachricht",
  member: "Mitglied",
};

// Autoren-Lookup für die Moderation: submission_id → { nickname,
// patient_number }. EIN gebatchter Select statt N Einzel-Queries.
async function communityAuthorMap(submissionIds) {
  const ids = [...new Set((submissionIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("companion_access")
    .select("submission_id, nickname, patient_number")
    .eq("practice_id", PRACTICE_ID)
    .in("submission_id", ids);
  if (error) throw error;
  const map = {};
  for (const r of data || []) {
    map[r.submission_id] = {
      nickname: r.nickname || null,
      patient_number: r.patient_number || null,
    };
  }
  return map;
}

// Neueste Beiträge INKLUSIVE ausgeblendeter (der Admin sieht alles, gedimmt),
// je Beitrag die Kommentare (ebenfalls inkl. hidden) und der Autor
// (nickname + patient_number). Rückgabe: [{...post, author, comments:[{...c,
// author}]}], neueste zuerst.
export async function listCommunityPosts({ limit = 50 } = {}) {
  const { data: posts, error } = await supabase
    .from("companion_posts")
    .select("*")
    .eq("practice_id", PRACTICE_ID)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const postRows = posts || [];
  if (!postRows.length) return [];

  const { data: comments, error: cErr } = await supabase
    .from("companion_comments")
    .select("*")
    .eq("practice_id", PRACTICE_ID)
    .in(
      "post_id",
      postRows.map((p) => p.id)
    )
    .order("created_at", { ascending: true });
  if (cErr) throw cErr;
  const commentRows = comments || [];

  const authors = await communityAuthorMap([
    ...postRows.map((p) => p.submission_id),
    ...commentRows.map((c) => c.submission_id),
  ]);

  const byPost = {};
  for (const c of commentRows) {
    (byPost[c.post_id] ||= []).push({
      ...c,
      author: authors[c.submission_id] || null,
    });
  }
  return postRows.map((p) => ({
    ...p,
    author: authors[p.submission_id] || null,
    comments: byPost[p.id] || [],
  }));
}

// Beitrag aus-/einblenden (Moderation). hidden=true verschwindet sofort aus
// dem Patienten-Feed (Server filtert hidden=false) — die Daten bleiben.
export async function setPostHidden(id, hidden) {
  const { data, error } = await supabase
    .from("companion_posts")
    .update({ hidden: !!hidden })
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Kommentar aus-/einblenden — gleiche Semantik wie setPostHidden.
export async function setCommentHidden(id, hidden) {
  const { data, error } = await supabase
    .from("companion_comments")
    .update({ hidden: !!hidden })
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Meldungen (Melden-Button der Patienten), neueste zuerst. resolved=false =
// offene Warteschlange (Default), resolved=true = erledigte Historie.
// Jede Meldung kommt mit reporter (nickname/patient_number) und einem
// aufgelösten Ziel-Preview: das gemeldete Ding selbst (Beitrag/Kommentar/
// Nachricht als Text-Auszug, Mitglied als Zugang) + dessen Autor. Ziel kann
// null sein (z. B. nach DSGVO-Löschung des Verfassers — FK CASCADE).
export async function listReports({ resolved = false } = {}) {
  const { data, error } = await supabase
    .from("companion_reports")
    .select("*")
    .eq("practice_id", PRACTICE_ID)
    .eq("resolved", !!resolved)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const reports = data || [];
  if (!reports.length) return [];

  // Ziel-Zeilen je Art in EINEM Batch-Select pro Tabelle holen.
  const idsByKind = { post: [], comment: [], message: [], member: [] };
  for (const r of reports) {
    if (idsByKind[r.target_kind]) idsByKind[r.target_kind].push(r.target_id);
  }
  const fetchTargets = async (table, col, ids, cols) => {
    if (!ids.length) return {};
    const { data: rows, error: tErr } = await supabase
      .from(table)
      .select(cols)
      .eq("practice_id", PRACTICE_ID)
      .in(col, [...new Set(ids)]);
    if (tErr) throw tErr;
    const map = {};
    for (const row of rows || []) map[row[col]] = row;
    return map;
  };
  const [postMap, commentMap, messageMap, memberMap] = await Promise.all([
    fetchTargets(
      "companion_posts",
      "id",
      idsByKind.post,
      "id, submission_id, body, media, hidden, created_at"
    ),
    fetchTargets(
      "companion_comments",
      "id",
      idsByKind.comment,
      "id, post_id, submission_id, body, hidden, created_at"
    ),
    fetchTargets(
      "companion_messages",
      "id",
      idsByKind.message,
      "id, sender_id, recipient_id, body, created_at"
    ),
    fetchTargets(
      "companion_access",
      "submission_id",
      idsByKind.member,
      "submission_id, nickname, patient_number, active, community_joined_at"
    ),
  ]);
  const targetOf = (r) =>
    r.target_kind === "post"
      ? postMap[r.target_id] || null
      : r.target_kind === "comment"
      ? commentMap[r.target_id] || null
      : r.target_kind === "message"
      ? messageMap[r.target_id] || null
      : memberMap[r.target_id] || null;

  // Nicknames für Melder + Ziel-Verfasser in einem Rutsch.
  const authorIds = reports.map((r) => r.reporter_id);
  for (const r of reports) {
    const t = targetOf(r);
    if (!t) continue;
    if (r.target_kind === "message") authorIds.push(t.sender_id);
    else if (r.target_kind !== "member") authorIds.push(t.submission_id);
  }
  const authors = await communityAuthorMap(authorIds);

  return reports.map((r) => {
    const t = targetOf(r);
    let targetAuthor = null;
    if (t) {
      if (r.target_kind === "message") targetAuthor = authors[t.sender_id] || null;
      else if (r.target_kind === "member")
        targetAuthor = {
          nickname: t.nickname || null,
          patient_number: t.patient_number || null,
        };
      else targetAuthor = authors[t.submission_id] || null;
    }
    return {
      ...r,
      reporter: authors[r.reporter_id] || null,
      target: t,
      targetAuthor,
    };
  });
}

// Meldung als erledigt markieren (Warteschlange → Historie). Kein Löschen.
export async function resolveReport(id) {
  const { data, error } = await supabase
    .from("companion_reports")
    .update({ resolved: true })
    .eq("practice_id", PRACTICE_ID)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Badge-Zähler: offene Meldungen (Community-Tab im Admin). head:true = nur
// Count, keine Zeilen — gleiches Muster wie countPendingImports.
export async function countOpenReports() {
  const { count, error } = await supabase
    .from("companion_reports")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", PRACTICE_ID)
    .eq("resolved", false);
  if (error) throw error;
  return count || 0;
}

// Signierte URL für ein Medium aus dem privaten 'community'-Bucket (1 h TTL),
// über die authentifizierte Admin-Session (Storage-Policy 'authenticated' —
// gleiches Muster wie das Befund-Öffnen im AdminAnamnesePanel).
export async function communitySignedUrl(path) {
  const { data, error } = await supabase.storage
    .from("community")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl || null;
}

// ---------------------------------------------------------------------------
// Convenience aliases requested by the task brief. These map the requested
// names onto the canonical functions above so there is exactly ONE
// implementation and both naming schemes resolve to it.
// ---------------------------------------------------------------------------

// listCompanionItems(submissionId) → listPlanItems
export const listCompanionItems = listPlanItems;

// removePlanItem(id) → deletePlanItem
export const removePlanItem = deletePlanItem;

// listImportQueue(submissionId) → listImportsForPatient
export const listImportQueue = listImportsForPatient;

// countWaitingImports() → countPendingImports
export const countWaitingImports = countPendingImports;
