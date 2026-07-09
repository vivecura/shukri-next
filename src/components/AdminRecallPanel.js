"use client";

// ============================================================================
// AdminRecallPanel — Mahmoud's Arbeitsplatz + "Für Shukri".
//
// Mounted by the "Anrufe" main tab in Admin.js. Self-contained, props-less
// "use client" panel (house pattern, like AdminContactsPanel): it fetches its
// own data via @/lib/recalls on mount, refetches after every mutation, and
// patches local state optimistically so the card reacts instantly.
//
// TWO internal sub-tabs (Record-Tab pill style):
//   "anrufe"  — Mahmoud's overdue-first worklist across ALL patients. Each card
//               joins the patient (name + Handy) and batch-loads the doctor's
//               Akte blob ("Was der Patient bekommen hat") so Mahmoud needs
//               nothing else — never Doctolib. tap-to-call, question checklist
//               (persisted), the permanent iron-rule banner, and the after-call
//               block (Ampel + Notiz + Erledigt, or "Nicht erreicht → morgen").
//   "shukri"  — completed red (first) + yellow, un-cleared cases for Shukri to
//               call back and mark "✓ Geklärt".
//
// Mobile-first: one-column card stack, tel: tap-button at the very top of each
// card. All class strings come from the documented house vocabulary.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AMPEL,
  EISERNE_REGEL,
  ORIGIN_LABELS,
  fetchPatientRecordsData,
  finishCall,
  fmtDate,
  isOverdue,
  listForShukri,
  listWorklist,
  markNichtErreicht,
  patientName,
  resolveForShukri,
  saveChecklistState,
  sortWorklist,
  telHref,
  worklistStats,
} from "@/lib/recalls";

// The three after-call Ampel choices, in fixed order (🟢/🟡/🔴).
const AMPEL_CHOICES = ["gruen", "gelb", "rot"];

// Which Akte fields go into the "Was der Patient bekommen hat" box, in order.
// Each entry: the record-blob key + a short label. Values are arrays of
// { id, text } (behandlungsplan / medikationVonMir / naechsteSchritte) exactly
// as AdminAnamnesePanel.handleSave persists them.
const RECORD_SECTIONS = [
  { key: "behandlungsplan", label: "Behandlungsplan" },
  { key: "medikationVonMir", label: "Medikation von mir" },
  { key: "naechsteSchritte", label: "Nächste Schritte" },
];

export default function AdminRecallPanel({ callAgent = false }) {
  // A call agent (Mahmoud) only ever works the worklist. "Für Shukri" is the
  // doctor's callback queue (with a "Geklärt" action that is Shukri's call), so
  // the sub-tab switcher is hidden for a call agent and the view is forced to
  // "anrufe". This is UI clarity, not a data boundary (see securityNote).
  const [subTab, setSubTab] = useState("anrufe"); // "anrufe" | "shukri"

  // Worklist ("Anrufe") state.
  const [worklist, setWorklist] = useState([]);
  const [records, setRecords] = useState({}); // { submissionId -> data-blob }
  const [loadingWork, setLoadingWork] = useState(true);

  // "Für Shukri" state.
  const [shukriList, setShukriList] = useState([]);
  const [loadingShukri, setLoadingShukri] = useState(true);

  // ---- data loading -------------------------------------------------------

  const loadWorklist = useCallback(async () => {
    setLoadingWork(true);
    try {
      const rows = await listWorklist();
      setWorklist(rows);
      const subIds = [...new Set(rows.map((r) => r.submission_id).filter(Boolean))];
      const recMap = await fetchPatientRecordsData(subIds);
      setRecords(recMap);
    } catch {
      // Leave the (possibly stale) list in place; the empty/loaded states below
      // still render sensibly. No alert() — house convention.
    } finally {
      setLoadingWork(false);
    }
  }, []);

  const loadShukri = useCallback(async () => {
    setLoadingShukri(true);
    try {
      const rows = await listForShukri();
      setShukriList(rows);
    } catch {
      // keep previous list
    } finally {
      setLoadingShukri(false);
    }
  }, []);

  // Initial load once on mount. The loaders are stable (useCallback with empty
  // deps); we intentionally run them a single time and guard against React's
  // strict-mode double-invoke.
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    loadWorklist();
    loadShukri();
  }, [loadWorklist, loadShukri]);

  // ---- mutations (optimistic patch, then refetch) -------------------------

  // Finish a call → drop it out of the "open" buckets locally, then refetch
  // both lists (a red/yellow finish surfaces it in "Für Shukri").
  const handleFinish = useCallback(
    async ({ id, ampel, notiz, checklistState }) => {
      // optimistic: mark done_at=now so worklistStats counts it under "heute".
      setWorklist((rows) =>
        rows.map((r) =>
          r.id === id
            ? { ...r, status: "erledigt", ampel, notiz, done_at: new Date().toISOString() }
            : r
        )
      );
      await finishCall({ id, ampel, notiz, checklistState });
      await Promise.all([loadWorklist(), loadShukri()]);
    },
    [loadWorklist, loadShukri]
  );

  const handleNichtErreicht = useCallback(
    async (id) => {
      // optimistic: remove from today's view immediately.
      setWorklist((rows) => rows.filter((r) => r.id !== id));
      await markNichtErreicht(id);
      await loadWorklist();
    },
    [loadWorklist]
  );

  const handleResolve = useCallback(
    async (id) => {
      setShukriList((rows) => rows.filter((r) => r.id !== id));
      await resolveForShukri(id);
      await Promise.all([loadShukri(), loadWorklist()]);
    },
    [loadShukri, loadWorklist]
  );

  // Ordered worklist + header stats.
  const ordered = useMemo(() => sortWorklist(worklist), [worklist]);
  const stats = useMemo(() => worklistStats(worklist), [worklist]);

  // Only the still-to-call cards render in the "Anrufe" list (today's already-
  // completed calls live in the stats bar, not as cards).
  const openCards = useMemo(
    () => ordered.filter((r) => r.status !== "erledigt"),
    [ordered]
  );

  // A call agent is locked to the worklist; Shukri uses the stored sub-tab.
  const effectiveSubTab = callAgent ? "anrufe" : subTab;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sub-tab pills — exact Record-Tab pattern from AdminAnamnesePanel, with
          live counts. Hidden for a call agent (worklist only). */}
      {!callAgent && (
        <div className="flex flex-wrap gap-1.5 mb-4 border-b border-gray-100 pb-3">
          {[
            { id: "anrufe", label: "Anrufe", count: openCards.length },
            { id: "shukri", label: "Für Shukri", count: shukriList.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                subTab === t.id
                  ? "bg-[#43a9ab] text-white border-[#43a9ab]"
                  : "bg-white text-[#515757]/60 border-gray-200 hover:border-[#43a9ab]/40"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`ml-1.5 tabular-nums ${
                    subTab === t.id ? "text-white/80" : "text-[#515757]/40"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {effectiveSubTab === "anrufe" ? (
        <>
          {/* Stat bar (micro-label style). */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4">
            <Stat label="offen" value={stats.offen} />
            <Stat label="überfällig" value={stats.ueberfaellig} />
            <Stat label="heute erledigt" value={stats.heuteErledigt} />
          </div>

          {loadingWork ? (
            <p className="text-xs text-[#515757]/40 py-10 text-center">…</p>
          ) : openCards.length === 0 ? (
            <p className="text-sm text-[#515757]/40 py-16 text-center">
              ✅ Nichts offen — alle Patienten zufrieden.
            </p>
          ) : (
            <div className="space-y-3">
              {openCards.map((r) => (
                <RecallCard
                  key={r.id}
                  row={r}
                  record={records[r.submission_id] || null}
                  onFinish={handleFinish}
                  onNichtErreicht={handleNichtErreicht}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {loadingShukri ? (
            <p className="text-xs text-[#515757]/40 py-10 text-center">…</p>
          ) : shukriList.length === 0 ? (
            <p className="text-sm text-[#515757]/40 py-16 text-center">
              ✅ Nichts offen — alle Patienten zufrieden.
            </p>
          ) : (
            <div className="space-y-3">
              {shukriList.map((r) => (
                <ShukriCard key={r.id} row={r} onResolve={handleResolve} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single head-count stat in the worklist header.
// ---------------------------------------------------------------------------
function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-lg font-semibold text-[#515757]">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecallCard — one call in Mahmoud's worklist. tel: tap-button + name at the
// very top; then reason, the "Was der Patient bekommen hat" box, the question
// checklist (persisted), the permanent iron-rule banner, and the after-call
// completion block.
// ---------------------------------------------------------------------------
function RecallCard({ row, record, onFinish, onNichtErreicht }) {
  const sub = row.anamnese_submissions || null;
  const name = patientName(sub);
  const handy = sub?.handy || "";
  const overdue = isOverdue(row.due_date);

  const fragen = useMemo(
    () => (Array.isArray(row.fragen) ? row.fragen : []),
    [row.fragen]
  );

  // Checklist state: normalise into a { fragIndex -> done } map keyed by the
  // stored frage id (falls back to index). Seeded from checklist_state.
  const [checked, setChecked] = useState(() => {
    const map = {};
    const state = Array.isArray(row.checklist_state) ? row.checklist_state : [];
    for (const s of state) {
      if (s && s.id != null) map[String(s.id)] = !!s.done;
    }
    return map;
  });

  const [ampel, setAmpel] = useState(null);
  const [notiz, setNotiz] = useState("");
  const [hint, setHint] = useState(false); // soft inline completion hint
  const [saving, setSaving] = useState(false); // "Speichert…"
  const [postponing, setPostponing] = useState(false);

  const fragKey = (f, i) => String(f?.id ?? i);

  // Serialise the current checklist into the [{id, done}] shape and persist.
  const persistChecklist = useCallback(
    (nextMap) => {
      const state = fragen.map((f, i) => {
        const k = fragKey(f, i);
        return { id: f?.id ?? i, done: !!nextMap[k] };
      });
      // fire-and-forget; the ticks are seeded from checklist_state on reload.
      saveChecklistState(row.id, state).catch(() => {});
    },
    [fragen, row.id]
  );

  const toggleFrage = (f, i) => {
    const k = fragKey(f, i);
    setChecked((m) => {
      const next = { ...m, [k]: !m[k] };
      persistChecklist(next);
      return next;
    });
  };

  const gateOk = !!ampel && !!notiz.trim();

  const doFinish = async () => {
    if (!gateOk) {
      setHint(true); // sanfter Inline-Hinweis, kein alert()
      return;
    }
    setSaving(true);
    const checklistState = fragen.map((f, i) => ({
      id: f?.id ?? i,
      done: !!checked[fragKey(f, i)],
    }));
    try {
      await onFinish({ id: row.id, ampel, notiz: notiz.trim(), checklistState });
      // card disappears on refetch; no need to reset local state.
    } finally {
      setSaving(false);
    }
  };

  const doNichtErreicht = async () => {
    setPostponing(true);
    try {
      await onNichtErreicht(row.id);
    } finally {
      setPostponing(false);
    }
  };

  const origin = ORIGIN_LABELS[row.created_by] || row.created_by || "";

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      {/* tel: tap-button + name at the very top. */}
      {handy ? (
        <a
          href={telHref(handy)}
          className="block text-center text-sm font-semibold px-3 py-2.5 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors"
        >
          📞 {handy} anrufen
        </a>
      ) : (
        <p className="text-center text-xs text-[#515757]/40 px-3 py-2.5 rounded-full border border-gray-200">
          Keine Nummer hinterlegt
        </p>
      )}

      {/* Name + meta. */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[#515757] truncate">{name}</p>
          <p className="text-xs text-[#515757]/60">{row.grund}</p>
        </div>
        <div className="shrink-0 text-right">
          {overdue && (
            <span className="inline-block text-[10px] font-semibold text-red-500 border border-red-200 rounded-full px-2 py-0.5">
              überfällig
            </span>
          )}
          <p className="text-[10px] text-[#515757]/40 mt-1">
            fällig {fmtDate(row.due_date)}
          </p>
        </div>
      </div>

      {/* Origin + postpone hint. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {origin && (
          <span className="text-[10px] text-[#515757]/40">{origin}</span>
        )}
        {row.postpone_count >= 3 && (
          <span className="text-[10px] text-red-500/70">
            {row.postpone_count}× verschoben — evtl. Shukri-Rückruf
          </span>
        )}
      </div>

      {/* "Was der Patient bekommen hat" — from the Akte, so Mahmoud needs nothing
          else (never Doctolib). */}
      <RecordBox record={record} />

      {/* Question checklist. */}
      {fragen.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider">
            Fragen im Gespräch
          </p>
          {fragen.map((f, i) => {
            const k = fragKey(f, i);
            const text = typeof f === "string" ? f : f?.text || "";
            return (
              <label
                key={k}
                className="flex items-start gap-2 text-sm cursor-pointer text-[#515757]/80"
              >
                <input
                  type="checkbox"
                  checked={!!checked[k]}
                  onChange={() => toggleFrage(f, i)}
                  className="accent-[#43a9ab] mt-0.5"
                />
                <span className={checked[k] ? "line-through text-[#515757]/40" : ""}>
                  {text}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Iron rule — permanent, on every card. */}
      <div className="text-xs bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
        <p className="font-semibold text-red-700 mb-1">⚠️ Eiserne Regel</p>
        {EISERNE_REGEL}
      </div>

      {/* After-call block. */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {AMPEL_CHOICES.map((key) => {
            const active = ampel === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setAmpel(key);
                  setHint(false);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-[#43a9ab] text-white border-[#43a9ab]"
                    : "bg-white text-[#515757]/60 border-gray-200 hover:border-[#43a9ab]/40"
                }`}
              >
                {AMPEL[key].label}
              </button>
            );
          })}
        </div>

        <textarea
          value={notiz}
          onChange={(e) => {
            setNotiz(e.target.value);
            if (e.target.value.trim()) setHint(false);
          }}
          rows={2}
          placeholder="Was hat der Patient gesagt? (zwei Sätze reichen)…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-[#515757] focus:outline-none focus:border-[#43a9ab] resize-none"
        />

        {hint && (
          <p className="text-xs text-[#515757]/60">
            Bitte Ampel setzen und kurz notieren.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={doFinish}
            disabled={saving || postponing}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 ${
              gateOk
                ? "bg-[#43a9ab] text-white hover:bg-[#3a9597]"
                : "bg-[#43a9ab]/40 text-white cursor-not-allowed"
            }`}
          >
            {saving ? "Speichert…" : "✓ Anruf erledigt"}
          </button>
          <button
            onClick={doNichtErreicht}
            disabled={saving || postponing}
            className="text-xs px-3 py-1.5 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors disabled:opacity-40"
          >
            {postponing ? "…" : "Nicht erreicht → morgen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordBox — the "Was der Patient bekommen hat" box from the doctor's Akte
// blob. Shows Behandlungsplan / Medikation von mir / Nächste Schritte; if none
// are present, a quiet hint instead of an error.
// ---------------------------------------------------------------------------
function RecordBox({ record }) {
  const sections = RECORD_SECTIONS.map((s) => {
    const items = Array.isArray(record?.[s.key]) ? record[s.key] : [];
    const texts = items
      .map((it) => (typeof it === "string" ? it : it?.text || ""))
      .map((t) => t.trim())
      .filter(Boolean);
    return { label: s.label, texts };
  }).filter((s) => s.texts.length > 0);

  return (
    <div className="bg-[#43a9ab]/5 rounded-lg p-3">
      <p className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1.5">
        Was der Patient bekommen hat
      </p>
      {sections.length === 0 ? (
        <p className="text-xs text-[#515757]/40">
          Noch nichts in der Akte hinterlegt.
        </p>
      ) : (
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.label}>
              <p className="text-[11px] font-semibold text-[#515757]/70">{s.label}</p>
              <ul className="ml-3 text-sm text-[#515757]/80 space-y-0.5 list-disc list-inside">
                {s.texts.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShukriCard — a completed red/yellow case awaiting Shukri. Name + tap-to-call
// + Mahmoud's Notiz + date + reason + "✓ Geklärt".
// ---------------------------------------------------------------------------
function ShukriCard({ row, onResolve }) {
  const sub = row.anamnese_submissions || null;
  const name = patientName(sub);
  const handy = sub?.handy || "";
  const ampel = AMPEL[row.ampel] || null;
  const [resolving, setResolving] = useState(false);

  const doResolve = async () => {
    setResolving(true);
    try {
      await onResolve(row.id);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${ampel ? ampel.cardTint : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[#515757] truncate">{name}</p>
          <p className="text-xs text-[#515757]/60">{row.grund}</p>
        </div>
        {ampel && (
          <span className="shrink-0 text-xs text-[#515757]/70">{ampel.label}</span>
        )}
      </div>

      {handy && (
        <a
          href={telHref(handy)}
          className="block text-center text-sm font-semibold px-3 py-2 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors"
        >
          📞 {handy} zurückrufen
        </a>
      )}

      {row.notiz && (
        <div className="bg-[#43a9ab]/5 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1">
            Notiz von Mahmoud
          </p>
          <p className="text-sm text-[#515757]/80 whitespace-pre-wrap">{row.notiz}</p>
        </div>
      )}

      <p className="text-[10px] text-[#515757]/40">
        Angerufen am {fmtDate(row.done_at)}
        {row.called_by ? ` · ${row.called_by}` : ""}
      </p>

      <button
        onClick={doResolve}
        disabled={resolving}
        className="text-xs px-3 py-1.5 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40"
      >
        {resolving ? "…" : "✓ Geklärt"}
      </button>
    </div>
  );
}
