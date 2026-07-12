"use client";

// ============================================================================
// AdminRecallSection — der per-Patient "📞 Anruf vormerken"-Bereich im Akte-Tab.
//
// Reine UI. ALLE Konstanten, Helfer und Queries kommen aus @/lib/recalls
// (Single Source of Truth) — hier wird NICHTS mehr dupliziert. Verhalten wie
// gehabt: Shukri merkt einen Anruf vor (created_by='shukri'), darunter die
// Historie dieses Patienten mit Ampel-Punkt + Herkunft + Status; offene lassen
// sich löschen (Zwei-Schritt-Inline-Confirm statt window.confirm).
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import {
  GRUENDE,
  STD_FRAGEN,
  STD_PRESELECT,
  AMPEL,
  STATUS_LABELS,
  ORIGIN_LABELS,
  newId,
  plusDays,
  fmtDate,
  listForPatient,
  createRecall,
  removeRecall,
} from "@/lib/recalls";

// Baut die initiale Fragen-Liste (Leitfaden, STD_PRESELECT vorangehakt).
function buildFragen() {
  return STD_FRAGEN.map((text, i) => ({
    id: newId(),
    text,
    on: STD_PRESELECT.includes(i),
  }));
}

export default function AdminRecallSection({ submissionId }) {
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [confirmId, setConfirmId] = useState(null); // Zwei-Schritt-Löschen

  // Formular-State
  const [grund, setGrund] = useState(GRUENDE[0]);
  const [dueDate, setDueDate] = useState(() => plusDays(7));
  const [fragen, setFragen] = useState(buildFragen);
  const [extra, setExtra] = useState("");

  const load = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    setErr("");
    try {
      setRecalls(await listForPatient(submissionId));
    } catch (e) {
      setErr(e.message || "Konnte Anrufe nicht laden.");
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!submissionId) return;
      setLoading(true);
      setErr("");
      try {
        const rows = await listForPatient(submissionId);
        if (alive) setRecalls(rows);
      } catch (e) {
        if (alive) setErr(e.message || "Konnte Anrufe nicht laden.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [submissionId]);

  const toggleFrage = (id) =>
    setFragen((fs) => fs.map((f) => (f.id === id ? { ...f, on: !f.on } : f)));

  const removeFrage = (id) =>
    setFragen((fs) => fs.filter((f) => f.id !== id));

  const addExtra = () => {
    const t = extra.trim();
    if (!t) return;
    setFragen((fs) => [...fs, { id: newId(), text: t, on: true }]);
    setExtra("");
  };

  const resetForm = () => {
    setGrund(GRUENDE[0]);
    setDueDate(plusDays(7));
    setFragen(buildFragen());
    setExtra("");
  };

  const chosenCount = fragen.filter((f) => f.on).length;

  const save = async () => {
    const chosen = fragen
      .filter((f) => f.on)
      .map((f) => ({ id: f.id, text: f.text }));
    if (!chosen.length) {
      setErr("Bitte mindestens eine Frage auswählen.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setErr("");
    try {
      await createRecall({
        submissionId,
        grund,
        dueDate,
        fragen: chosen,
        createdBy: "shukri",
      });
      resetForm();
      setSaved(true);
      await load();
      // Save-State kurz sichtbar lassen, dann zurück auf Default.
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.message || "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (id) => {
    setConfirmId(null);
    setErr("");
    // Optimistisch entfernen, bei Fehler neu laden.
    setRecalls((rs) => rs.filter((r) => r.id !== id));
    try {
      await removeRecall(id);
    } catch (e) {
      setErr(e.message || "Löschen fehlgeschlagen.");
      load();
    }
  };

  const offene = recalls.filter((r) => r.status === "offen");
  const erledigte = recalls.filter((r) => r.status !== "offen");

  const saveLabel = saving
    ? "Speichert…"
    : saved
    ? "Vorgemerkt ✓"
    : "✓ Anruf vormerken";

  return (
    <div className="max-w-2xl space-y-6">
      {/* ---- Vormerken-Formular ---- */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-[#1f6e70] mb-1">
          📞 Anruf für Mahmoud vormerken
        </h3>
        <p className="text-xs text-[#515757]/50 mb-4">
          Mahmoud ruft an, hakt die Fragen ab und dokumentiert mit Ampel. Rote
          und gelbe Fälle laufen zu dir zurück.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1">
              Grund
            </label>
            <select
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-[#515757] focus:outline-none focus:border-[#43a9ab]"
            >
              {GRUENDE.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1">
              Anrufen am
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-[#515757] focus:outline-none focus:border-[#43a9ab]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <label className="block text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider">
            Fragen für das Gespräch
          </label>
          <span className="text-[10px] text-[#515757]/40 tabular-nums">
            {chosenCount} ausgewählt
          </span>
        </div>

        <div className="space-y-1.5 mb-3">
          {fragen.map((f) => (
            <div key={f.id} className="flex items-start gap-2">
              <label className="flex items-start gap-2 text-sm cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={f.on}
                  onChange={() => toggleFrage(f.id)}
                  className="mt-0.5 accent-[#43a9ab]"
                />
                <span className={f.on ? "text-[#515757]" : "text-[#515757]/40"}>
                  {f.text}
                </span>
              </label>
              {!STD_FRAGEN.includes(f.text) && (
                <button
                  type="button"
                  onClick={() => removeFrage(f.id)}
                  aria-label="Entfernen"
                  className="shrink-0 text-[#515757]/40 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExtra();
              }
            }}
            placeholder="Eigene Frage… (Enter zum Hinzufügen)"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-[#515757] placeholder:text-[#515757]/40 focus:outline-none focus:border-[#43a9ab]"
          />
          <button
            type="button"
            onClick={addExtra}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors"
          >
            Hinzufügen
          </button>
        </div>

        {err && <p className="text-red-500 text-xs mb-3">{err}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving || chosenCount === 0}
          className="text-xs px-3 py-1.5 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40"
        >
          {saveLabel}
        </button>
      </div>

      {/* ---- Historie dieses Patienten ---- */}
      <div>
        <h3 className="text-sm font-semibold text-[#515757] mb-2">
          Vorgemerkte Anrufe
        </h3>
        {loading ? (
          <p className="text-sm text-[#515757]/40 py-4">Lädt…</p>
        ) : recalls.length === 0 ? (
          <p className="text-sm text-[#515757]/30 italic py-4">
            Noch kein Anruf vorgemerkt.
          </p>
        ) : (
          <div className="space-y-2">
            {offene.map((r) => (
              <RecallRow
                key={r.id}
                r={r}
                confirmId={confirmId}
                onAskRemove={setConfirmId}
                onConfirmRemove={doRemove}
              />
            ))}
            {erledigte.map((r) => (
              <RecallRow key={r.id} r={r} done />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecallRow — eine Zeile der Patienten-Historie.
// ---------------------------------------------------------------------------
function RecallRow({ r, done, confirmId, onAskRemove, onConfirmRemove }) {
  const ampel = r.ampel ? AMPEL[r.ampel] : null;
  const fragenArr = Array.isArray(r.fragen) ? r.fragen : [];
  const origin = ORIGIN_LABELS[r.created_by] || ORIGIN_LABELS.shukri;
  const status = STATUS_LABELS[r.status] || r.status;
  const isConfirming = confirmId === r.id;

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        done ? "border-gray-100 bg-gray-50/50" : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
            ampel ? ampel.dot : "bg-[#515757]/20"
          }`}
          title={ampel ? ampel.label : "noch nicht angerufen"}
        />
        <span className="font-medium text-[#515757]">{r.grund}</span>
        <span className="text-xs text-[#515757]/50">
          · anrufen am {fmtDate(r.due_date)}
        </span>
        <span className="text-xs text-[#515757]/40">· {status}</span>
        <span className="ml-auto text-[10px] font-semibold text-[#515757]/40 uppercase tracking-wider">
          {origin}
        </span>
      </div>

      {fragenArr.length > 0 && (
        <ul className="mt-2 ml-4 list-disc text-xs text-[#515757]/60 space-y-0.5">
          {fragenArr.map((f) => (
            <li key={f.id}>{f.text}</li>
          ))}
        </ul>
      )}

      {r.notiz && (
        <p className="mt-2 text-xs text-[#515757]/80 bg-[#43a9ab]/5 rounded-lg p-2">
          <span className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider">
            Notiz
          </span>
          <br />
          {r.notiz}
        </p>
      )}

      {r.status === "offen" &&
        (isConfirming ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-[#515757]/70">Wirklich löschen?</span>
            <button
              type="button"
              onClick={() => onConfirmRemove(r.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Ja, löschen
            </button>
            <button
              type="button"
              onClick={() => onAskRemove(null)}
              className="text-xs text-[#515757]/50 hover:text-[#515757]"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAskRemove(r.id)}
            className="mt-2 text-xs text-[#515757]/40 hover:text-red-500 transition-colors"
          >
            Löschen
          </button>
        ))}
    </div>
  );
}
