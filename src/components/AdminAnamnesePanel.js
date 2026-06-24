"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const STORAGE_BUCKET = "befunde";

// Anamnese questions in display order, mapped to the flat payload keys the
// /anamnese patient intake form submits. Labels match that form's wording
// verbatim. `other`: free-text companion. `sub`: a block of sub-questions.
// `extra`: an additional companion field. `dosagePrefix`: per-item dosage
// fields (dosis_<slug>).
const ANAMNESE_QUESTIONS = [
  { key: "anliegen",       label: "1. Was beschäftigt Sie gerade am meisten?",          other: "anliegen_anderes" },
  { key: "ziel_gespraech", label: "2. Was möchten Sie aus dem Gespräch mitnehmen?",     other: "ziel_gespraech_anderes" },
  { key: "dauer",          label: "3. Seit wann begleitet Sie Ihr Hauptthema?",         other: "dauer_anderes" },
  { key: "schlaf",         label: "4. Wie ist Ihr Schlaf?",                             other: "schlaf_anderes" },
  { key: "stress",         label: "5. Stresslevel von 1 (entspannt) bis 10 (Vollgas)?", other: "stress_anderes" },
  { key: "sport",          label: "6. Sport / Bewegung pro Woche?",                     other: "sport_anderes" },
  { key: "ernaehrung",     label: "7. Wie ernähren Sie sich?",                          other: "ernaehrung_anderes" },
  {
    sub: true,
    label: "8. Konsum-Gewohnheiten",
    keys: [
      { key: "alkohol",  label: "Alkohol" },
      { key: "rauchen",  label: "Rauchen" },
      { key: "koffein",  label: "Koffein (Tassen/Tag)" },
      { key: "cannabis", label: "Cannabis" },
    ],
    other: "konsum_anderes",
  },
  {
    key: "verdauung",
    label: "9. Wie ist Ihre Verdauung?",
    other: "verdauung_anderes",
    extra: { key: "verdauung_symptome", label: "Symptome" },
  },
  { key: "allergien",       label: "10. Unverträglichkeiten oder Allergien?",                                  other: "allergien_anderes" },
  { key: "schimmel",        label: "11. Schimmel-Belastung in Ihrer Wohnung (auch nur im Bad), für mehrere Monate?", other: "schimmel_anderes" },
  { key: "zahnstatus",      label: "12. Zahnstatus",                                                           other: "zahnstatus_anderes" },
  { key: "supplemente",     label: "13. Welche Supplemente nehmen Sie aktuell?",                               other: "supplemente_anderes", dosagePrefix: "dosis_" },
  { key: "vorerkrankungen", label: "14. Vorerkrankungen / bekannte Diagnosen",                                 other: "vorerkrankungen_anderes" },
  { key: "medikamente",     label: "15. Medikamente (optional)" },
  { key: "ziel",            label: "16. Ihr Ziel in einem Satz" },
];

const CONSENTS = [
  { key: "consent_behandlung",          label: "Behandlung + Datenverarbeitung" },
  { key: "consent_selbstzahler",        label: "Selbstzahler-Hinweis" },
  { key: "consent_datenschutz_gelesen", label: "Datenschutzerklärung gelesen" },
  { key: "consent_ki_pseudonym",        label: "KI-Auswertung (pseudonymisiert)" },
  { key: "consent_newsletter",          label: "Newsletter" },
  { key: "consent_einladungen",         label: "Einladungen / Events" },
];

// Tabs within a patient's record. `anamnese` + `befund` show real data;
// the rest are placeholders we'll fill later.
const RECORD_TABS = [
  { id: "diagnose",        label: "Diagnose" },
  { id: "medikation",      label: "Medikation" },
  { id: "termin",          label: "Nächster Termin" },
  { id: "schritte",        label: "Nächste Schritte" },
  { id: "anamnese",        label: "Anamnese" },
  { id: "doctolib",        label: "Doctolib Notizen" },
  { id: "behandlungsplan", label: "Behandlungsplan" },
  { id: "befund",          label: "Befund" },
  { id: "rechnungen",      label: "Rechnungen" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("de-DE", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// Compact date for the list rows (e.g. "13.06.26").
function formatDateShort(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "2-digit",
    });
  } catch { return ""; }
}

// Date-of-birth display: YYYY-MM-DD (HTML date-input format) → DD-MM-YYYY.
function formatDob(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

function valueToString(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function patientName(r) {
  const name = [r.vorname, r.nachname].filter(Boolean).join(" ").trim();
  return name || r.email || "Unbenannt";
}

function fileName(path) {
  const seg = String(path).split("/").pop() || path;
  return seg.replace(/^\d+_/, "");
}

// Summarize the supplements the patient reported, with dosages.
// The form slugifies each supplement name into a `dosis_<slug>` field.
function supplementeSummary(p) {
  const items = Array.isArray(p.supplemente)
    ? p.supplemente
    : p.supplemente ? [p.supplemente] : [];
  const parts = items
    .filter((name) => name && name !== "Keine")
    .map((name) => {
      const slug = name.replace(/[^a-zA-Z0-9]/g, "_");
      const dose = p[`dosis_${slug}`];
      return dose ? `${name} (${dose})` : name;
    });
  if (p.supplemente_anderes) parts.push(p.supplemente_anderes);
  return parts.join(", ");
}

export default function AdminAnamnesePanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [recordTab, setRecordTab] = useState("anamnese");
  const [filesDownloading, setFilesDownloading] = useState({});
  // Next-appointment choice per patient. Session-only for now (not persisted).
  const [terminByPatient, setTerminByPatient] = useState({});
  // Invoices per patient.
  const [rechnungenByPatient, setRechnungenByPatient] = useState({});
  // Manually-added befund documents per patient (alongside patient uploads).
  const [befundeByPatient, setBefundeByPatient] = useState({});
  // Doctor-added medications per patient ("Von mir").
  const [medikationByPatient, setMedikationByPatient] = useState({});
  // Doctor-added diagnoses + next steps + notes + treatment plan per patient.
  const [diagnoseByPatient, setDiagnoseByPatient] = useState({});
  const [schritteByPatient, setSchritteByPatient] = useState({});
  const [notizenByPatient, setNotizenByPatient] = useState({});
  const [behandlungsplanByPatient, setBehandlungsplanByPatient] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const loadedRef = useRef({});

  useEffect(() => { fetchRows(); }, []);

  // Load the saved doctor-entered record for the selected patient (once).
  useEffect(() => {
    if (!selectedId || loadedRef.current[selectedId]) return;
    loadedRef.current[selectedId] = true;
    (async () => {
      const { data, error } = await supabase
        .from("patient_records")
        .select("data")
        .eq("submission_id", selectedId)
        .maybeSingle();
      if (error || !data?.data) return;
      const d = data.data;
      if (Array.isArray(d.diagnose)) {
        setDiagnoseByPatient((m) => ({ ...m, [selectedId]: d.diagnose }));
      }
      if (d.termin) setTerminByPatient((m) => ({ ...m, [selectedId]: d.termin }));
      if (Array.isArray(d.rechnungen)) {
        setRechnungenByPatient((m) => ({ ...m, [selectedId]: d.rechnungen }));
      }
      if (Array.isArray(d.manualBefunde)) {
        setBefundeByPatient((m) => ({ ...m, [selectedId]: d.manualBefunde }));
      }
      if (Array.isArray(d.medikationVonMir)) {
        setMedikationByPatient((m) => ({ ...m, [selectedId]: d.medikationVonMir }));
      }
      if (Array.isArray(d.naechsteSchritte)) {
        setSchritteByPatient((m) => ({ ...m, [selectedId]: d.naechsteSchritte }));
      }
      if (Array.isArray(d.notizen)) {
        setNotizenByPatient((m) => ({ ...m, [selectedId]: d.notizen }));
      }
      if (Array.isArray(d.behandlungsplan)) {
        setBehandlungsplanByPatient((m) => ({ ...m, [selectedId]: d.behandlungsplan }));
      }
    })();
  }, [selectedId]);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("anamnese_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data);
    setLoading(false);
  };

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [patientName(r), r.email, r.handy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const fileList = (r) => (Array.isArray(r?.befunde_urls) ? r.befunde_urls : []);

  const openFile = async (path) => {
    setFilesDownloading((s) => ({ ...s, [path]: true }));
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("Datei konnte nicht geöffnet werden: " + (error?.message || "unbekannter Fehler"));
      }
    } finally {
      setFilesDownloading((s) => { const n = { ...s }; delete n[path]; return n; });
    }
  };

  const payload = selected?.payload || {};

  const termin = (selected && terminByPatient[selected.id]) || { mode: null, date: "" };
  const setTermin = (patch) => {
    if (!selected) return;
    setSavedId(null);
    setTerminByPatient((m) => ({
      ...m,
      [selected.id]: { ...(m[selected.id] || { mode: null, date: "" }), ...patch },
    }));
  };

  const rechnungen = (selected && rechnungenByPatient[selected.id]) || [];
  const setRechnungen = (updater) => {
    if (!selected) return;
    setSavedId(null);
    setRechnungenByPatient((m) => {
      const cur = m[selected.id] || [];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...m, [selected.id]: next };
    });
  };
  const addRechnung = () =>
    setRechnungen((cur) => [...cur, { id: Date.now() + Math.random(), text: "", fileName: "", paid: false }]);
  const updateRechnung = (id, patch) =>
    setRechnungen((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRechnung = (id) =>
    setRechnungen((cur) => cur.filter((r) => r.id !== id));

  const befunde = (selected && befundeByPatient[selected.id]) || [];
  const setBefunde = (updater) => {
    if (!selected) return;
    setSavedId(null);
    setBefundeByPatient((m) => {
      const cur = m[selected.id] || [];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...m, [selected.id]: next };
    });
  };
  const addBefund = () =>
    setBefunde((cur) => [...cur, { id: Date.now() + Math.random(), name: "", fileName: "", doc_path: null }]);
  const updateBefund = (id, patch) =>
    setBefunde((cur) => cur.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBefund = (id) =>
    setBefunde((cur) => cur.filter((b) => b.id !== id));

  const medikation = (selected && medikationByPatient[selected.id]) || [];
  const setMedikation = (updater) => {
    if (!selected) return;
    setSavedId(null);
    setMedikationByPatient((m) => {
      const cur = m[selected.id] || [];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...m, [selected.id]: next };
    });
  };
  const addMedikament = () =>
    setMedikation((cur) => [...cur, { id: Date.now() + Math.random(), text: "" }]);
  const updateMedikament = (id, patch) =>
    setMedikation((cur) => cur.map((med) => (med.id === id ? { ...med, ...patch } : med)));
  const removeMedikament = (id) =>
    setMedikation((cur) => cur.filter((med) => med.id !== id));

  // Generic handlers for a per-patient list of { id, text } items.
  const listHandlers = (map, setMap) => {
    const list = (selected && map[selected.id]) || [];
    const setList = (updater) => {
      if (!selected) return;
      setSavedId(null);
      setMap((m) => {
        const cur = m[selected.id] || [];
        const next = typeof updater === "function" ? updater(cur) : updater;
        return { ...m, [selected.id]: next };
      });
    };
    return {
      list,
      add: () => setList((cur) => [...cur, { id: Date.now() + Math.random(), text: "" }]),
      update: (id, patch) => setList((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      remove: (id) => setList((cur) => cur.filter((x) => x.id !== id)),
    };
  };
  const diagnoseH = listHandlers(diagnoseByPatient, setDiagnoseByPatient);
  const schritteH = listHandlers(schritteByPatient, setSchritteByPatient);
  const notizenH = listHandlers(notizenByPatient, setNotizenByPatient);
  const planH = listHandlers(behandlungsplanByPatient, setBehandlungsplanByPatient);

  // Persist the selected patient's doctor-entered record. Uploads any new
  // invoice documents to the befunde bucket, then upserts the JSON blob.
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const cur = rechnungenByPatient[selected.id] || [];
      const savedRechnungen = [];
      for (const r of cur) {
        let docPath = r.doc_path || null;
        let fName = r.fileName || null;
        if (r.file && !docPath) {
          const safe = r.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `rechnungen/${selected.id}/${Date.now()}_${safe}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, r.file, { upsert: false });
          if (upErr) { alert("Upload fehlgeschlagen: " + upErr.message); setSaving(false); return; }
          docPath = path;
          fName = r.file.name;
        }
        savedRechnungen.push({ id: r.id, text: r.text || "", paid: !!r.paid, doc_path: docPath, fileName: fName });
      }

      const curBefunde = befundeByPatient[selected.id] || [];
      const savedBefunde = [];
      for (const b of curBefunde) {
        let docPath = b.doc_path || null;
        let fName = b.fileName || null;
        if (b.file && !docPath) {
          const safe = (b.file.name || "datei").replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `befund/${selected.id}/${Date.now()}_${safe}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, b.file, { upsert: false });
          if (upErr) { alert("Upload fehlgeschlagen: " + upErr.message); setSaving(false); return; }
          docPath = path;
          fName = b.file.name;
        }
        savedBefunde.push({ id: b.id, name: b.name || "", doc_path: docPath, fileName: fName });
      }

      const data = {
        diagnose: (diagnoseByPatient[selected.id] || [])
          .map((x) => ({ id: x.id, text: x.text || "" }))
          .filter((x) => x.text.trim()),
        termin: terminByPatient[selected.id] || null,
        rechnungen: savedRechnungen,
        manualBefunde: savedBefunde,
        medikationVonMir: (medikationByPatient[selected.id] || [])
          .map((med) => ({ id: med.id, text: med.text || "" }))
          .filter((med) => med.text.trim()),
        naechsteSchritte: (schritteByPatient[selected.id] || [])
          .map((x) => ({ id: x.id, text: x.text || "" }))
          .filter((x) => x.text.trim()),
        notizen: (notizenByPatient[selected.id] || [])
          .map((x) => ({ id: x.id, text: x.text || "" }))
          .filter((x) => x.text.trim()),
        behandlungsplan: (behandlungsplanByPatient[selected.id] || [])
          .map((x) => ({ id: x.id, text: x.text || "" }))
          .filter((x) => x.text.trim()),
      };

      const { error } = await supabase
        .from("patient_records")
        .upsert({ submission_id: selected.id, data, updated_at: new Date().toISOString() });
      if (error) { alert("Speichern fehlgeschlagen: " + error.message); setSaving(false); return; }

      // reflect uploaded paths back into state (drops the transient File objects)
      setRechnungenByPatient((m) => ({ ...m, [selected.id]: savedRechnungen }));
      setBefundeByPatient((m) => ({ ...m, [selected.id]: savedBefunde }));
      setSavedId(selected.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
      {/* LEFT: patient list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#515757]">
            Patienten
            <span className="ml-2 font-normal text-[#515757]/40">
              {query.trim() ? `${filtered.length}/${rows.length}` : rows.length}
            </span>
          </h2>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche nach Name, E-Mail oder Telefon…"
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg text-[#515757] focus:outline-none focus:border-[#43a9ab] transition-colors"
          />
          <svg
            className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#515757]/40"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Suche löschen"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#515757]/40 hover:text-[#515757]"
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-[#515757]/40 py-6 text-center">…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-[#515757]/40 py-10 text-center">Noch keine Patienten.</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#515757]/40 py-10 text-center">Keine Treffer.</p>
        ) : (
          <ul className="space-y-1 max-h-[72vh] overflow-y-auto pr-1">
            {filtered.map((r) => {
              const isSelected = r.id === selectedId;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                      isSelected
                        ? "border-[#43a9ab] bg-[#43a9ab]/5"
                        : "border-gray-100 hover:border-[#43a9ab]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-[#515757] truncate">
                        {patientName(r)}
                      </span>
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-gray-100 text-[#515757]/60">
                        {(r.lang || "de").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[11px] text-[#515757]/50 truncate">{r.email}</span>
                      <span className="shrink-0 text-[10px] text-[#515757]/40">
                        {formatDateShort(r.created_at)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* RIGHT: patient record */}
      <div className="border border-gray-100 rounded-xl p-5 min-h-[60vh]">
        {!selected ? (
          <p className="text-sm text-[#515757]/40 py-20 text-center">
            Einen Patienten links auswählen.
          </p>
        ) : (
          <div>
            {/* Header — name + meta inline, Speichern on the right */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-semibold text-[#515757]">{patientName(selected)}</h3>
                <span className="text-xs text-[#515757]/50">
                  Eingegangen: {formatDate(selected.created_at)}
                </span>
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="text-xs text-[#43a9ab] hover:underline">
                    {selected.email}
                  </a>
                )}
                {selected.handy && (
                  <a href={`tel:${selected.handy}`} className="text-xs text-[#43a9ab] hover:underline">
                    {selected.handy}
                  </a>
                )}
                {selected.geburtsdatum && (
                  <span className="text-xs text-[#515757]/70">geb. {formatDob(selected.geburtsdatum)}</span>
                )}
                {(payload.strasse || payload.plz || payload.stadt) && (
                  <span className="text-xs text-[#515757]/70">
                    {[
                      [payload.strasse, payload.hausnummer].filter(Boolean).join(" "),
                      [payload.plz, payload.stadt].filter(Boolean).join(" "),
                    ].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="text-xs text-[#515757]/70">{(selected.lang || "").toUpperCase()}</span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40"
              >
                {saving ? "Speichert…" : savedId === selected.id ? "Gespeichert ✓" : "Speichern"}
              </button>
            </div>

            {/* Record tabs */}
            <div className="flex flex-wrap gap-1.5 mt-5 mb-5 border-b border-gray-100 pb-3">
              {RECORD_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRecordTab(t.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    recordTab === t.id
                      ? "bg-[#43a9ab] text-white border-[#43a9ab]"
                      : "bg-white text-[#515757]/60 border-gray-200 hover:border-[#43a9ab]/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            {recordTab === "diagnose" ? (
              <TextListEditor
                items={diagnoseH.list}
                onAdd={diagnoseH.add}
                onUpdate={diagnoseH.update}
                onRemove={diagnoseH.remove}
                placeholder="Diagnose…"
                addLabel="+ Diagnose"
              />
            ) : recordTab === "anamnese" ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {(payload.terminart || payload.konsultationsart || payload.quelle) && (
                  <>
                    <Field label="Terminart">
                      {[valueToString(payload.terminart), payload.terminart_anderes]
                        .filter(Boolean).join(" · ") || "—"}
                    </Field>
                    <Field label="Konsultationsart">{valueToString(payload.konsultationsart) || "—"}</Field>
                    <Field label="Wie gefunden">
                      {[valueToString(payload.quelle), payload.quelle_anderes]
                        .filter(Boolean).join(" · ") || "—"}
                    </Field>
                  </>
                )}
                <AnamneseList payload={payload} />
                <div className="sm:col-span-2 mt-1">
                  <p className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1">
                    Einwilligungen
                  </p>
                  <ul className="text-sm text-[#515757]/80 space-y-0.5">
                    {CONSENTS.map((c) => (
                      <li key={c.key}>
                        <span className="text-[#515757]/50">{c.label}:</span> {payload[c.key] ? "Ja" : "Nein"}
                      </li>
                    ))}
                  </ul>
                </div>
                {selected.signature_dataurl && (
                  <div className="sm:col-span-2 mt-1">
                    <p className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1">
                      Unterschrift
                    </p>
                    <img
                      src={selected.signature_dataurl}
                      alt="Unterschrift"
                      className="max-w-[280px] w-full border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                )}
              </dl>
            ) : recordTab === "befund" ? (
              <div className="space-y-5 max-w-2xl">
                {/* Patient-uploaded files (read-only) */}
                <div>
                  <h5 className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-2">
                    Vom Patienten hochgeladen
                  </h5>
                  {fileList(selected).length === 0 ? (
                    <p className="text-sm text-[#515757]/40">Keine Dateien hochgeladen.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {fileList(selected).map((path, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-3 p-2 rounded border border-gray-100"
                        >
                          <p className="text-sm text-[#515757] truncate min-w-0">{fileName(path)}</p>
                          <button
                            onClick={() => openFile(path)}
                            disabled={!!filesDownloading[path]}
                            className="text-xs px-2.5 py-1 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40 whitespace-nowrap"
                          >
                            {filesDownloading[path] ? "…" : "Öffnen"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Manually added by the doctor */}
                <div className="border-t border-gray-100 pt-4">
                  <h5 className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-2">
                    Manuell hinzugefügt
                  </h5>
                  <div className="space-y-2">
                    {befunde.map((b) => (
                      <div key={b.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={b.name}
                            onChange={(e) => updateBefund(b.id, { name: e.target.value })}
                            placeholder="Name / Bezeichnung…"
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md text-[#515757] focus:outline-none focus:border-[#43a9ab]"
                          />
                          <button
                            onClick={() => removeBefund(b.id)}
                            aria-label="Entfernen"
                            className="shrink-0 text-[#515757]/40 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs px-2.5 py-1 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors cursor-pointer whitespace-nowrap">
                            Dokument wählen
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                updateBefund(b.id, {
                                  file: f,
                                  fileName: f ? f.name : b.fileName,
                                  doc_path: f ? null : b.doc_path,
                                });
                              }}
                            />
                          </label>
                          {b.doc_path ? (
                            <button
                              onClick={() => openFile(b.doc_path)}
                              className="text-xs text-[#43a9ab] hover:underline truncate min-w-0"
                            >
                              {b.fileName || "Öffnen"}
                            </button>
                          ) : b.fileName ? (
                            <span className="text-xs text-[#515757]/60 truncate min-w-0">
                              {b.fileName} <span className="text-[#515757]/30">(nicht gespeichert)</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addBefund}
                    className="mt-2 text-xs px-3 py-1.5 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors"
                  >
                    + Datei
                  </button>
                </div>
              </div>
            ) : recordTab === "medikation" ? (
              <div className="space-y-5">
                {/* Before — what the patient reported in the anamnese */}
                <div>
                  <h5 className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-2">
                    Vorher — aus Anamnese
                  </h5>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <Field label="Medikamente">{valueToString(payload.medikamente) || "—"}</Field>
                    <Field label="Supplemente">{supplementeSummary(payload) || "—"}</Field>
                  </dl>
                </div>
                {/* From me — doctor's own manually-added medications */}
                <div className="border-t border-gray-100 pt-4">
                  <h5 className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-2">
                    Von mir
                  </h5>
                  <div className="space-y-2">
                    {medikation.map((med) => (
                      <div key={med.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={med.text}
                          onChange={(e) => updateMedikament(med.id, { text: e.target.value })}
                          placeholder="Medikament, Dosis, Häufigkeit…"
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md text-[#515757] focus:outline-none focus:border-[#43a9ab]"
                        />
                        <button
                          onClick={() => removeMedikament(med.id)}
                          aria-label="Entfernen"
                          className="shrink-0 text-[#515757]/40 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addMedikament}
                    className="mt-2 text-xs px-3 py-1.5 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors"
                  >
                    + Medikament
                  </button>
                </div>
              </div>
            ) : recordTab === "termin" ? (
              <div className="space-y-3 max-w-md">
                <label className="flex items-center gap-3 text-sm text-[#515757] cursor-pointer">
                  <input
                    type="radio"
                    name="termin-mode"
                    checked={termin.mode === "geplant"}
                    onChange={() => setTermin({ mode: "geplant" })}
                    className="accent-[#43a9ab]"
                  />
                  <span className="shrink-0">Geplant am</span>
                  <input
                    type="date"
                    value={termin.date || ""}
                    onChange={(e) => setTermin({ mode: "geplant", date: e.target.value })}
                    disabled={termin.mode !== "geplant"}
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm text-[#515757] focus:outline-none focus:border-[#43a9ab] disabled:opacity-40"
                  />
                </label>
                <label className="flex items-center gap-3 text-sm text-[#515757] cursor-pointer">
                  <input
                    type="radio"
                    name="termin-mode"
                    checked={termin.mode === "selbst"}
                    onChange={() => setTermin({ mode: "selbst" })}
                    className="accent-[#43a9ab]"
                  />
                  <span>Patient macht selbst</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-[#515757] cursor-pointer">
                  <input
                    type="radio"
                    name="termin-mode"
                    checked={termin.mode === "ungeplant"}
                    onChange={() => setTermin({ mode: "ungeplant" })}
                    className="accent-[#43a9ab]"
                  />
                  <span>Ungeplant</span>
                </label>
              </div>
            ) : recordTab === "rechnungen" ? (
              <div className="space-y-3 max-w-2xl">
                {rechnungen.length === 0 && (
                  <p className="text-sm text-[#515757]/40">Noch keine Rechnungen.</p>
                )}
                {rechnungen.map((r, i) => (
                  <div key={r.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider">
                        Rechnung {i + 1}
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-[#515757] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={r.paid}
                            onChange={(e) => updateRechnung(r.id, { paid: e.target.checked })}
                            className="accent-[#43a9ab]"
                          />
                          Bezahlt
                        </label>
                        <button
                          onClick={() => removeRechnung(r.id)}
                          aria-label="Rechnung entfernen"
                          className="text-[#515757]/40 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={r.text}
                      onChange={(e) => updateRechnung(r.id, { text: e.target.value })}
                      placeholder="Beschreibung / Betrag…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md text-[#515757] focus:outline-none focus:border-[#43a9ab]"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs px-2.5 py-1 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors cursor-pointer whitespace-nowrap">
                        Dokument wählen
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            updateRechnung(r.id, {
                              file: f,
                              fileName: f ? f.name : r.fileName,
                              doc_path: f ? null : r.doc_path,
                            });
                          }}
                        />
                      </label>
                      {r.doc_path ? (
                        <button
                          onClick={() => openFile(r.doc_path)}
                          className="text-xs text-[#43a9ab] hover:underline truncate min-w-0"
                        >
                          {r.fileName || "Öffnen"}
                        </button>
                      ) : r.fileName ? (
                        <span className="text-xs text-[#515757]/60 truncate min-w-0">
                          {r.fileName} <span className="text-[#515757]/30">(nicht gespeichert)</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addRechnung}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors"
                >
                  + Rechnung
                </button>
              </div>
            ) : recordTab === "schritte" ? (
              <TextListEditor
                items={schritteH.list}
                onAdd={schritteH.add}
                onUpdate={schritteH.update}
                onRemove={schritteH.remove}
                placeholder="Nächster Schritt…"
                addLabel="+ Schritt"
              />
            ) : recordTab === "doctolib" ? (
              <TextListEditor
                items={notizenH.list}
                onAdd={notizenH.add}
                onUpdate={notizenH.update}
                onRemove={notizenH.remove}
                placeholder="Notiz…"
                addLabel="+ Notiz"
                multiline
              />
            ) : recordTab === "behandlungsplan" ? (
              <TextListEditor
                items={planH.list}
                onAdd={planH.add}
                onUpdate={planH.update}
                onRemove={planH.remove}
                placeholder="Behandlungsschritt…"
                addLabel="+ Punkt"
                multiline
              />
            ) : (
              <p className="text-sm text-[#515757]/30 italic py-8 text-center">Platzhalter — folgt</p>
            )}
          </div>
        )}
      </div>
    </div>
    <ShukrAiBox hasPatient={!!selected} patientName={selected ? patientName(selected) : ""} />
    </>
  );
}

// Floating "Ask ShukrAi" assistant box (bottom-right). UI scaffold only —
// not wired to the AI yet; sending shows a placeholder. When connected it
// will send the pseudonymized patient record + the question to the backend.
function ShukrAiBox({ hasPatient, patientName }) {
  const [open, setOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  const QUICK = [
    { id: "plan", label: "Plan erstellen" },
    { id: "next", label: "Nächster Schritt" },
    { id: "analyze", label: "Analysieren" },
  ];

  const ask = (label) => {
    if (!hasPatient) {
      setResponse("Bitte zuerst einen Patienten auswählen.");
      return;
    }
    setResponse(
      `ShukrAi ist noch nicht verbunden — kommt bald. (Anfrage: ${label}` +
        (patientName ? ` · ${patientName}` : "") + ")"
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-[#1f6e70]">✨ Ask ShukrAi</span>
        <span className="text-[#515757]/40 text-lg leading-none">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q.id}
                onClick={() => ask(q.label)}
                className="text-xs px-2.5 py-1 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Frage zu diesem Patienten…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md text-[#515757] focus:outline-none focus:border-[#43a9ab] resize-none"
          />
          <button
            onClick={() => ask(question.trim() || "Freie Frage")}
            className="w-full text-xs px-3 py-1.5 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors"
          >
            Senden
          </button>
          {response && (
            <p className="text-xs text-[#515757]/60 bg-[#43a9ab]/5 rounded-md p-2">{response}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Editable list of free-text items with add/remove, used for tabs like
// Nächste Schritte and Notizen. Saved per patient via the Speichern button.
function TextListEditor({ items, onAdd, onUpdate, onRemove, placeholder, addLabel, multiline }) {
  return (
    <div className="max-w-2xl">
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-start gap-2">
            {multiline ? (
              <textarea
                value={it.text}
                onChange={(e) => onUpdate(it.id, { text: e.target.value })}
                placeholder={placeholder}
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md text-[#515757] focus:outline-none focus:border-[#43a9ab] resize-y"
              />
            ) : (
              <input
                type="text"
                value={it.text}
                onChange={(e) => onUpdate(it.id, { text: e.target.value })}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md text-[#515757] focus:outline-none focus:border-[#43a9ab]"
              />
            )}
            <button
              onClick={() => onRemove(it.id)}
              aria-label="Entfernen"
              className="shrink-0 mt-1.5 text-[#515757]/40 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 text-xs px-3 py-1.5 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors"
      >
        {addLabel}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-0.5">
        {label}
      </dt>
      <dd className="text-[#515757]">{children}</dd>
    </div>
  );
}

function AnamneseList({ payload }) {
  const a = payload || {};
  return (
    <div className="sm:col-span-2 space-y-3">
      {ANAMNESE_QUESTIONS.map((q, idx) => {
        if (q.sub) {
          const subRows = q.keys
            .map((sk) => ({ label: sk.label, value: valueToString(a[sk.key]) }))
            .filter((s) => s.value);
          const otherVal = q.other && a[q.other] ? a[q.other] : "";
          if (subRows.length === 0 && !otherVal) return null;
          return (
            <div key={idx}>
              <p className="text-[11px] font-semibold text-[#515757] mb-1">{q.label}</p>
              <ul className="ml-3 text-sm text-[#515757]/80 space-y-0.5">
                {subRows.map((r, i) => (
                  <li key={i}>
                    <span className="text-[#515757]/50">{r.label}:</span> {r.value}
                  </li>
                ))}
                {otherVal && (
                  <li><span className="text-[#515757]/50">Anderes:</span> {otherVal}</li>
                )}
              </ul>
            </div>
          );
        }

        let value = valueToString(a[q.key]);
        if (q.extra && a[q.extra.key]) {
          const ev = valueToString(a[q.extra.key]);
          if (ev) value = value ? `${value}  ·  ${q.extra.label}: ${ev}` : `${q.extra.label}: ${ev}`;
        }
        if (q.other && a[q.other]) {
          value = value ? `${value}  ·  Anderes: ${a[q.other]}` : `Anderes: ${a[q.other]}`;
        }
        let dosages = "";
        if (q.dosagePrefix) {
          dosages = Object.entries(a)
            .filter(([k, v]) => k.startsWith(q.dosagePrefix) && v)
            .map(([k, v]) => `${k.slice(q.dosagePrefix.length)}: ${v}`)
            .join(", ");
        }
        if (!value && !dosages) return null;

        return (
          <div key={idx}>
            <p className="text-[11px] font-semibold text-[#515757] mb-1">{q.label}</p>
            {value && <p className="text-sm text-[#515757]/80 ml-3">{value}</p>}
            {dosages && (
              <p className="text-sm text-[#515757]/80 ml-3">
                <span className="text-[#515757]/50">Dosierungen:</span> {dosages}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
