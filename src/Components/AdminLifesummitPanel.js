import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { supabase } from "../supabaseClient";

const STORAGE_BUCKET = "lifesummit-files";

// 15 anamnese questions in display order, with friendly labels.
// `key`: column name in the JSONB. `other`: free-text "Anderes" companion field.
// `sub`: when true, `keys` is a list of sub-questions for one block (Q8).
const ANAMNESE_QUESTIONS = [
  { key: "anliegen",       label: "1. Was beschäftigt Sie?",                       other: "anliegen_anderes" },
  { key: "ziel_gespraech", label: "2. Was möchten Sie aus dem Gespräch mitnehmen?", other: "ziel_gespraech_anderes" },
  { key: "dauer",          label: "3. Seit wann?",                                  other: "dauer_anderes" },
  { key: "schlaf",         label: "4. Wie ist Ihr Schlaf?",                         other: "schlaf_anderes" },
  { key: "stress",         label: "5. Stresslevel (1-10)",                          other: "stress_anderes" },
  { key: "sport",          label: "6. Sport / Bewegung pro Woche",                  other: "sport_anderes" },
  { key: "ernaehrung",     label: "7. Ernährung",                                   other: "ernaehrung_anderes" },
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
  { key: "allergien",   label: "10. Allergien / Unverträglichkeiten", other: "allergien_anderes" },
  { key: "schimmel",    label: "11. Schimmel-Belastung",              other: "schimmel_anderes" },
  { key: "zahnstatus",  label: "12. Zahnstatus",                      other: "zahnstatus_anderes" },
  { key: "supplemente", label: "13. Welche Supplemente?",             other: "supplemente_anderes", dosagePrefix: "dosis_" },
  { key: "medikamente", label: "14. Medikamente (optional)" },
  { key: "ziel",        label: "15. Ihr Ziel in einem Satz" },
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

function valueToString(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function statusLabel(s) {
  if (s === "final") return "Vollständig";
  if (s === "step3") return "Anamnese";
  return "Nur Kontakt";
}
const STATUS_PILL = {
  step1: "bg-orange-50 text-orange-600",
  step3: "bg-amber-50 text-amber-700",
  final: "bg-green-50 text-green-700",
};

const FILTERS = [
  { id: "all", label: "Alle" },
  { id: "final", label: "Vollständig" },
  { id: "partial", label: "Unvollständig" },
];

export default function AdminLifesummitPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [filesDownloading, setFilesDownloading] = useState({});

  useEffect(() => { fetchRows(); }, []);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lifesummit_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (filter === "final") return rows.filter(r => r.status === "final");
    if (filter === "partial") return rows.filter(r => r.status !== "final");
    return rows;
  }, [rows, filter]);

  const selected = useMemo(
    () => rows.find(r => r.id === selectedId) || null,
    [rows, selectedId]
  );

  useEffect(() => {
    setConfirmDelete(false);
  }, [selectedId]);

  const openFile = async (fileEntry) => {
    setFilesDownloading(s => ({ ...s, [fileEntry.path]: true }));
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(fileEntry.path, 3600);
      if (!error && data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("Signed URL konnte nicht erstellt werden");
      }
    } finally {
      setFilesDownloading(s => { const n = { ...s }; delete n[fileEntry.path]; return n; });
    }
  };

  const deleteSubmission = async () => {
    if (!selected) return;
    const filesToRemove = Array.isArray(selected.befunde_files)
      ? selected.befunde_files.map(f => f.path).filter(Boolean)
      : [];

    if (filesToRemove.length > 0) {
      const { error: rmErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filesToRemove);
      if (rmErr) {
        console.warn("[lifesummit] file cleanup failed", rmErr);
      }
    }

    const { error } = await supabase
      .from("lifesummit_submissions")
      .delete()
      .eq("id", selected.id);
    if (!error) {
      setRows(rs => rs.filter(r => r.id !== selected.id));
      setSelectedId(null);
      setConfirmDelete(false);
    } else {
      alert("Löschen fehlgeschlagen: " + error.message);
    }
  };

  // ─── PDF generation ────────────────────────────────────────────────
  const downloadPdf = () => {
    if (!selected) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      const usableWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (h) => {
        if (y + h > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const writeText = (text, opts = {}) => {
        const { size = 10, bold = false, color = "#222", indent = 0, gap = 4 } = opts;
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(color);
        const lines = doc.splitTextToSize(text, usableWidth - indent);
        const lineHeight = size * 1.35;
        ensureSpace(lines.length * lineHeight);
        doc.text(lines, margin + indent, y);
        y += lines.length * lineHeight + gap;
      };

      const sectionHeader = (text) => {
        ensureSpace(28);
        y += 6;
        doc.setDrawColor(67, 169, 171);
        doc.setLineWidth(2);
        doc.line(margin, y, margin + 18, y);
        y += 12;
        writeText(text, { size: 12, bold: true, color: "#1f6e70", gap: 8 });
      };

      const fieldLine = (label, value) => {
        if (!value) return;
        writeText(label, { size: 8, bold: true, color: "#666", gap: 1 });
        writeText(value, { size: 10, color: "#222", indent: 0, gap: 6 });
      };

      // Header
      writeText("ViveCura — Life Summit Anmeldung", { size: 16, bold: true, color: "#1f6e70", gap: 2 });
      writeText(`${selected.vorname || ""} ${selected.nachname || ""}`.trim(), { size: 13, gap: 2 });
      writeText(`Eingegangen: ${formatDate(selected.created_at)}  ·  Status: ${statusLabel(selected.status)}`, {
        size: 9, color: "#666", gap: 8,
      });

      // Kontakt
      sectionHeader("Kontakt");
      fieldLine("Vorname", selected.vorname);
      fieldLine("Nachname", selected.nachname);
      fieldLine("E-Mail", selected.email);
      fieldLine("Handy", selected.handy);
      fieldLine("Konsultationsart", selected.konsultationsart);
      fieldLine("Kontakt-Einwilligung", selected.kontakt_einwilligung ? "Ja" : "Nein");
      fieldLine("Sprache", (selected.language || "").toUpperCase());

      // Anamnese
      const a = selected.anamnese || null;
      if (a) {
        sectionHeader("Anamnese");
        for (const q of ANAMNESE_QUESTIONS) {
          if (q.sub) {
            // Q8 — sub-questions
            const subValues = q.keys
              .map(sk => ({ label: sk.label, value: valueToString(a[sk.key]) }))
              .filter(s => s.value);
            const otherVal = q.other && a[q.other] ? `Anderes: ${a[q.other]}` : "";
            if (subValues.length === 0 && !otherVal) continue;
            writeText(q.label, { size: 10, bold: true, color: "#222", gap: 3 });
            subValues.forEach(s => writeText(`  ${s.label}: ${s.value}`, { size: 9, color: "#444", gap: 2 }));
            if (otherVal) writeText(`  ${otherVal}`, { size: 9, color: "#444", gap: 2 });
            y += 4;
            continue;
          }
          let value = valueToString(a[q.key]);
          // extra sub-list (Q9 verdauung_symptome)
          if (q.extra && a[q.extra.key]) {
            const extraVal = valueToString(a[q.extra.key]);
            if (extraVal) value = value ? `${value}  ·  ${q.extra.label}: ${extraVal}` : `${q.extra.label}: ${extraVal}`;
          }
          // "Anderes" companion
          if (q.other && a[q.other]) {
            value = value ? `${value}  ·  Anderes: ${a[q.other]}` : `Anderes: ${a[q.other]}`;
          }
          // supplemente — append dosages
          if (q.dosagePrefix) {
            const dosages = Object.entries(a)
              .filter(([k, v]) => k.startsWith(q.dosagePrefix) && v)
              .map(([k, v]) => `${k.slice(q.dosagePrefix.length)}: ${v}`)
              .join("; ");
            if (dosages) value = value ? `${value}\nDosierungen: ${dosages}` : `Dosierungen: ${dosages}`;
          }
          if (!value) continue;
          writeText(q.label, { size: 10, bold: true, color: "#222", gap: 2 });
          writeText(value, { size: 9, color: "#444", gap: 6 });
        }
      }

      // Befunde
      const files = Array.isArray(selected.befunde_files) ? selected.befunde_files : [];
      if (files.length > 0) {
        sectionHeader("Befunde");
        files.forEach((f, i) => {
          const sizeKb = f.size ? `${Math.round(f.size / 1024)} KB` : "";
          writeText(`${i + 1}. ${f.filename || f.path}   ${sizeKb}`, { size: 9, color: "#222", gap: 2 });
          writeText(`   ${f.path}`, { size: 8, color: "#888", gap: 4 });
        });
      }

      // Meta
      sectionHeader("Meta");
      fieldLine("Datenschutz-Einwilligung", selected.dsgvo_consent ? "Ja" : "Nein");
      fieldLine("Anamnese gesendet", formatDate(selected.anamnese_submitted_at));
      fieldLine("Final gesendet", formatDate(selected.final_submitted_at));
      fieldLine("Session-ID", selected.session_id);

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor("#999");
        doc.text(`Seite ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: "right" });
        doc.text("ViveCura · Life Summit Special", margin, pageHeight - 20);
      }

      const safe = (s) => (s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const datePart = new Date(selected.created_at).toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `lifesummit-${safe(selected.nachname)}-${safe(selected.vorname)}-${datePart}.pdf`;
      doc.save(filename);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  const newCount = rows.filter(r => r.status !== "final").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6">
      {/* LEFT: list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#515757]">
            Lifesummit
            {newCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {newCount}
              </span>
            )}
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                filter === f.id
                  ? "bg-[#43a9ab] text-white border-[#43a9ab]"
                  : "bg-white text-[#515757]/60 border-gray-200 hover:border-[#43a9ab]/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-xs text-[#515757]/40 py-6 text-center">…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#515757]/40 py-10 text-center">
            Noch keine Anmeldungen.
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map(r => {
              const isSelected = r.id === selectedId;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? "border-[#43a9ab] bg-[#43a9ab]/5"
                        : "border-gray-100 hover:border-[#43a9ab]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-[#515757] truncate">
                        {r.vorname} {r.nachname}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${STATUS_PILL[r.status] || ""}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#515757]/50 mt-1 truncate">{r.email}</p>
                    <p className="text-[10px] text-[#515757]/40 mt-0.5">{formatDate(r.created_at)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* RIGHT: detail */}
      <div className="border border-gray-100 rounded-xl p-5 min-h-[60vh]">
        {!selected ? (
          <p className="text-sm text-[#515757]/40 py-20 text-center">
            Eine Anmeldung links auswählen.
          </p>
        ) : (
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#515757]">
                  {selected.vorname} {selected.nachname}
                </h3>
                <p className="text-xs text-[#515757]/50 mt-0.5">
                  Eingegangen: {formatDate(selected.created_at)}
                </p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${STATUS_PILL[selected.status] || ""}`}>
                {statusLabel(selected.status)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={downloadPdf}
                disabled={downloadingPdf}
                className="text-xs px-3 py-1.5 rounded-full border border-[#43a9ab] text-[#43a9ab] hover:bg-[#43a9ab]/5 transition-colors disabled:opacity-40"
              >
                {downloadingPdf ? "Erzeugt PDF…" : "PDF herunterladen"}
              </button>
              {confirmDelete ? (
                <span className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-[#515757]/70">Wirklich löschen?</span>
                  <button
                    onClick={deleteSubmission}
                    className="text-xs px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Ja, löschen
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-[#515757] hover:bg-gray-50 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-auto"
                >
                  Löschen
                </button>
              )}
            </div>

            {/* Kontakt */}
            <Section title="Kontakt">
              <Field label="E-Mail">
                <a href={`mailto:${selected.email}`} className="text-[#43a9ab] hover:underline">
                  {selected.email}
                </a>
              </Field>
              <Field label="Handy">
                <a href={`tel:${selected.handy}`} className="text-[#43a9ab] hover:underline">
                  {selected.handy}
                </a>
              </Field>
              <Field label="Konsultationsart">{selected.konsultationsart || "—"}</Field>
              <Field label="Kontakt-Einwilligung">{selected.kontakt_einwilligung ? "Ja" : "Nein"}</Field>
              <Field label="Sprache">{(selected.language || "").toUpperCase()}</Field>
            </Section>

            {/* Anamnese */}
            {selected.anamnese && (
              <Section title="Anamnese">
                <AnamneseList anamnese={selected.anamnese} />
              </Section>
            )}

            {/* Befunde */}
            {Array.isArray(selected.befunde_files) && selected.befunde_files.length > 0 && (
              <Section title="Befunde">
                <ul className="space-y-1.5 sm:col-span-2">
                  {selected.befunde_files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 p-2 rounded border border-gray-100">
                      <div className="min-w-0">
                        <p className="text-sm text-[#515757] truncate">{f.filename || f.path}</p>
                        <p className="text-[10px] text-[#515757]/40">
                          {f.type || ""} {f.size ? `· ${Math.round(f.size / 1024)} KB` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => openFile(f)}
                        disabled={!!filesDownloading[f.path]}
                        className="text-xs px-2.5 py-1 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40 whitespace-nowrap"
                      >
                        {filesDownloading[f.path] ? "…" : "Öffnen"}
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Meta */}
            <Section title="Meta">
              <Field label="Datenschutz-Einwilligung">{selected.dsgvo_consent ? "Ja" : "Nein"}</Field>
              <Field label="Anamnese gesendet">{formatDate(selected.anamnese_submitted_at)}</Field>
              <Field label="Final gesendet">{formatDate(selected.final_submitted_at)}</Field>
              <Field label="Status">{selected.status}</Field>
              <Field label="Session-ID" fullSpan>
                <code className="text-xs text-[#515757]/60">{selected.session_id}</code>
              </Field>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <h4 className="text-xs font-semibold text-[#1f6e70] uppercase tracking-wider mb-2 border-b border-[#43a9ab]/20 pb-1">
        {title}
      </h4>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {children}
      </dl>
    </div>
  );
}

function Field({ label, children, fullSpan }) {
  return (
    <div className={fullSpan ? "sm:col-span-2" : ""}>
      <dt className="text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-0.5">
        {label}
      </dt>
      <dd className="text-[#515757]">{children}</dd>
    </div>
  );
}

function AnamneseList({ anamnese }) {
  const a = anamnese || {};
  return (
    <div className="sm:col-span-2 space-y-3">
      {ANAMNESE_QUESTIONS.map((q, idx) => {
        if (q.sub) {
          const subRows = q.keys
            .map(sk => ({ label: sk.label, value: valueToString(a[sk.key]) }))
            .filter(s => s.value);
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
