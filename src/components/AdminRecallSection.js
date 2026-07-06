"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

// Standard reasons for a recall call.
const GRUENDE = [
  "Nach Infusion — Verträglichkeit",
  "Neuer Behandlungsplan — Klarheit",
  "Supplement-Start — Verträglichkeit",
  "Allgemeine Kontrolle — Befinden",
];

// Default question checklist (Mahmoud's Leitfaden). The first ones are
// pre-selected; Shukri can toggle any and add his own.
const STD_FRAGEN = [
  "Wie geht es Ihnen seit der Behandlung?",
  "Infusion gut vertragen — gab es Reaktionen?",
  "Klappt die Einnahme der Präparate? Alles gut verträglich?",
  "Kommen Sie mit den Empfehlungen zurecht (Ernährung, kalt duschen, Bewegung)?",
  "War alles verständlich? Ist der nächste Schritt klar?",
  "Haben Sie das Gefühl, dass es vorangeht?",
  "Brauchen Sie etwas von uns? Soll der Doktor zurückrufen?",
];
const STD_PRESELECT = [0, 1, 2, 4, 6];

const AMPEL = {
  gruen: { dot: "bg-green-500", label: "🟢 Alles gut" },
  gelb: { dot: "bg-amber-500", label: "🟡 Thema offen" },
  rot: { dot: "bg-red-500", label: "🔴 Shukri muss ran" },
};

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "id-" + Math.random().toString(36).slice(2);
  }
}

function plusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmt(d) {
  if (!d) return "";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
}

export default function AdminRecallSection({ submissionId }) {
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Form state
  const [grund, setGrund] = useState(GRUENDE[0]);
  const [dueDate, setDueDate] = useState(plusDays(7));
  const [fragen, setFragen] = useState(() =>
    STD_FRAGEN.map((text, i) => ({
      id: newId(),
      text,
      on: STD_PRESELECT.includes(i),
    }))
  );
  const [extra, setExtra] = useState("");

  const load = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("recall_tasks")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRecalls(data || []);
    setLoading(false);
  }, [submissionId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFrage = (id) =>
    setFragen((fs) => fs.map((f) => (f.id === id ? { ...f, on: !f.on } : f)));

  const addExtra = () => {
    const t = extra.trim();
    if (!t) return;
    setFragen((fs) => [...fs, { id: newId(), text: t, on: true }]);
    setExtra("");
  };

  const resetForm = () => {
    setGrund(GRUENDE[0]);
    setDueDate(plusDays(7));
    setFragen(
      STD_FRAGEN.map((text, i) => ({
        id: newId(),
        text,
        on: STD_PRESELECT.includes(i),
      }))
    );
    setExtra("");
  };

  const save = async () => {
    const chosen = fragen
      .filter((f) => f.on)
      .map((f) => ({ id: f.id, text: f.text }));
    if (!chosen.length) {
      setErr("Bitte mindestens eine Frage auswählen.");
      return;
    }
    setSaving(true);
    setErr("");
    const { error } = await supabase.from("recall_tasks").insert({
      submission_id: submissionId,
      grund,
      due_date: dueDate,
      fragen: chosen,
      created_by: "shukri",
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    resetForm();
    load();
  };

  const removeRecall = async (id) => {
    if (!confirm("Diesen vorgemerkten Anruf löschen?")) return;
    const { error } = await supabase.from("recall_tasks").delete().eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const offene = recalls.filter((r) => r.status === "offen");
  const erledigte = recalls.filter((r) => r.status !== "offen");

  return (
    <div className="max-w-2xl space-y-6">
      {/* Vormerken-Formular */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-[#1f6e70] mb-3">
          📞 Anruf für Mahmoud vormerken
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-[#515757]/60 mb-1">Grund</label>
            <select
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#515757] focus:outline-none focus:border-[#43a9ab]"
            >
              {GRUENDE.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#515757]/60 mb-1">
              Anrufen am
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#515757] focus:outline-none focus:border-[#43a9ab]"
            />
          </div>
        </div>

        <label className="block text-xs text-[#515757]/60 mb-1">
          Fragen für das Gespräch
        </label>
        <div className="space-y-1.5 mb-2">
          {fragen.map((f) => (
            <label key={f.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={f.on}
                onChange={() => toggleFrage(f.id)}
                className="mt-1 accent-[#43a9ab]"
              />
              <span className={f.on ? "text-[#515757]" : "text-[#515757]/40"}>
                {f.text}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
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
            placeholder="+ eigene Frage…"
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-[#515757] focus:outline-none focus:border-[#43a9ab]"
          />
          <button
            onClick={addExtra}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5"
          >
            Hinzufügen
          </button>
        </div>

        {err && <p className="text-red-500 text-xs mb-2">{err}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-[#43a9ab] text-white text-sm font-medium rounded-lg hover:bg-[#3a9597] transition-colors disabled:opacity-50"
        >
          {saving ? "Speichert…" : "✓ Anruf vormerken"}
        </button>
      </div>

      {/* Vorhandene Recalls dieses Patienten */}
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
              <RecallRow key={r.id} r={r} onRemove={removeRecall} />
            ))}
            {erledigte.map((r) => (
              <RecallRow key={r.id} r={r} onRemove={removeRecall} done />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecallRow({ r, onRemove, done }) {
  const ampel = r.ampel ? AMPEL[r.ampel] : null;
  const fragenArr = Array.isArray(r.fragen) ? r.fragen : [];
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        done ? "border-gray-100 bg-gray-50/50 opacity-80" : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {ampel && (
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${ampel.dot}`} />
        )}
        <span className="font-medium text-[#515757]">{r.grund}</span>
        <span className="text-xs text-[#515757]/50">
          · anrufen am {fmt(r.due_date)}
        </span>
        <span className="text-xs text-[#515757]/40">
          ·{" "}
          {r.status === "offen"
            ? "offen"
            : r.status === "nicht_erreicht"
            ? "nicht erreicht"
            : "erledigt"}
        </span>
        {r.created_by && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-[#515757]/30">
            {r.created_by === "claude"
              ? "von Claude"
              : r.created_by === "auto"
              ? "automatisch"
              : "manuell"}
          </span>
        )}
      </div>
      {fragenArr.length > 0 && (
        <ul className="mt-1.5 ml-4 list-disc text-xs text-[#515757]/60 space-y-0.5">
          {fragenArr.map((f) => (
            <li key={f.id}>{f.text}</li>
          ))}
        </ul>
      )}
      {r.notiz && (
        <p className="mt-1.5 text-xs text-[#515757]/80 bg-[#43a9ab]/5 rounded p-2">
          Notiz: {r.notiz}
        </p>
      )}
      {r.status === "offen" && (
        <button
          onClick={() => onRemove(r.id)}
          className="mt-2 text-[11px] text-[#515757]/40 hover:text-red-500"
        >
          Löschen
        </button>
      )}
    </div>
  );
}
