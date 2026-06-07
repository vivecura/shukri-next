import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

const STATUSES = ["new", "in_progress", "done"];
const FILTER_OPTIONS = ["all", ...STATUSES];

const STATUS_PILL = {
  new:         "bg-red-50 text-red-600",
  in_progress: "bg-amber-50 text-amber-600",
  done:        "bg-green-50 text-green-700",
};

function formatDate(iso, lang) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "de-DE", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminContactsPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedFlash, setNotesSavedFlash] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRequests(data);
    setLoading(false);
  };

  const updateStatus = async (id, nextStatus) => {
    const { error } = await supabase
      .from("contact_requests")
      .update({ status: nextStatus })
      .eq("id", id);
    if (!error) {
      setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
    }
  };

  const saveNotes = async () => {
    if (!selectedId) return;
    setNotesSaving(true);
    const { error } = await supabase
      .from("contact_requests")
      .update({ notes: notesDraft })
      .eq("id", selectedId);
    setNotesSaving(false);
    if (!error) {
      setRequests((rs) => rs.map((r) => (r.id === selectedId ? { ...r, notes: notesDraft } : r)));
      setNotesSavedFlash(true);
      setTimeout(() => setNotesSavedFlash(false), 1800);
    }
  };

  const deleteRequest = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from("contact_requests").delete().eq("id", selectedId);
    if (!error) {
      setRequests((rs) => rs.filter((r) => r.id !== selectedId));
      setSelectedId(null);
      setConfirmDelete(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  );

  // When a record is selected: load notes into draft, auto-progress 'new' → 'in_progress'
  useEffect(() => {
    if (!selected) {
      setNotesDraft("");
      setConfirmDelete(false);
      return;
    }
    setNotesDraft(selected.notes || "");
    setConfirmDelete(false);
    if (selected.status === "new") {
      updateStatus(selected.id, "in_progress");
    }
  }, [selectedId]); // eslint-disable-line

  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6">
      {/* LEFT: list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#515757]">
            {t("admin.contacts.title")}
            {newCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {newCount}
              </span>
            )}
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                filter === f
                  ? "bg-[#43a9ab] text-white border-[#43a9ab]"
                  : "bg-white text-[#515757]/60 border-gray-200 hover:border-[#43a9ab]/40"
              }`}
            >
              {f === "all"
                ? t("admin.contacts.filterAll")
                : f === "new"
                ? t("admin.contacts.filterNew")
                : f === "in_progress"
                ? t("admin.contacts.filterInProgress")
                : t("admin.contacts.filterDone")}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-xs text-[#515757]/40 py-6 text-center">…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#515757]/40 py-10 text-center">
            {t("admin.contacts.empty")}
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((r) => {
              const isSelected = r.id === selectedId;
              const isNew = r.status === "new";
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
                      <div className="flex items-center gap-2 min-w-0">
                        {isNew && (
                          <span
                            className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500"
                            aria-label={t("admin.contacts.unread")}
                          />
                        )}
                        <span className="font-medium text-sm text-[#515757] truncate">
                          {r.vorname} {r.nachname}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-semibold ${
                          r.language === "en" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {r.language}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#515757]/50 mt-1 truncate">{r.email}</p>
                    <p className="text-[10px] text-[#515757]/40 mt-0.5">
                      {formatDate(r.created_at, lang)}
                    </p>
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
            {t("admin.contacts.emptyDetail")}
          </p>
        ) : (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#515757]">
                  {selected.vorname} {selected.nachname}
                </h3>
                <p className="text-xs text-[#515757]/50 mt-0.5">
                  {t("admin.contacts.fields.receivedAt")}: {formatDate(selected.created_at, lang)}
                </p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${STATUS_PILL[selected.status]}`}>
                {t(`admin.contacts.status.${selected.status}`)}
              </span>
            </div>

            {/* Status actions */}
            <div className="flex flex-wrap gap-2 mb-5">
              {selected.status !== "in_progress" && (
                <button
                  onClick={() => updateStatus(selected.id, "in_progress")}
                  className="text-xs px-3 py-1.5 rounded-full border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  {t("admin.contacts.actions.markInProgress")}
                </button>
              )}
              {selected.status !== "done" && (
                <button
                  onClick={() => updateStatus(selected.id, "done")}
                  className="text-xs px-3 py-1.5 rounded-full border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                >
                  {t("admin.contacts.actions.markDone")}
                </button>
              )}
              {selected.status === "done" && (
                <button
                  onClick={() => updateStatus(selected.id, "in_progress")}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-[#515757] hover:bg-gray-50 transition-colors"
                >
                  {t("admin.contacts.actions.reopen")}
                </button>
              )}
              {confirmDelete ? (
                <span className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-[#515757]/70">
                    {t("admin.contacts.actions.deleteConfirm")}
                  </span>
                  <button
                    onClick={deleteRequest}
                    className="text-xs px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    {t("admin.contacts.actions.delete")}
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
                  {t("admin.contacts.actions.delete")}
                </button>
              )}
            </div>

            {/* Fields */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label={t("admin.contacts.fields.email")}>
                <a href={`mailto:${selected.email}`} className="text-[#43a9ab] hover:underline">
                  {selected.email}
                </a>
              </Field>
              <Field label={t("admin.contacts.fields.telefon")}>
                <a href={`tel:${selected.telefon}`} className="text-[#43a9ab] hover:underline">
                  {selected.telefon}
                </a>
              </Field>
              <Field label={t("admin.contacts.fields.versicherung")}>
                {selected.versicherung}
              </Field>
              <Field label={t("admin.contacts.fields.language")}>
                {selected.language?.toUpperCase()}
              </Field>
              <Field label={t("admin.contacts.fields.preferredDays")} fullSpan>
                {(selected.preferred_days || []).map((d) => t(`kontakt.step4.days.${d}`)).join(", ") || "—"}
              </Field>
              <Field label={t("admin.contacts.fields.preferredTimes")} fullSpan>
                {(selected.preferred_times || []).map((tk) => t(`kontakt.step4.times.${tk}`)).join(", ") || "—"}
              </Field>
              <Field label={t("admin.contacts.fields.anliegen")} fullSpan>
                {(selected.anliegen || []).length === 0 ? (
                  "—"
                ) : (
                  <ul className="list-disc list-inside space-y-0.5">
                    {selected.anliegen.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
              </Field>
              {selected.dauer && (
                <Field label={t("admin.contacts.fields.dauer")}>{selected.dauer}</Field>
              )}
              {selected.situation && (
                <Field label={t("admin.contacts.fields.situation")} fullSpan>
                  <p className="whitespace-pre-wrap">{selected.situation}</p>
                </Field>
              )}
              <Field label={t("admin.contacts.fields.consentAt")} fullSpan>
                <span className="text-xs text-[#515757]/60">
                  {formatDate(selected.dsgvo_consent_at, lang)}
                </span>
              </Field>
            </dl>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-xs font-semibold text-[#515757]/70 mb-1.5 uppercase tracking-wider">
                {t("admin.contacts.fields.notes")}
              </label>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                placeholder={t("admin.contacts.notesPlaceholder")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#515757] focus:outline-none focus:border-[#43a9ab] resize-y"
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={saveNotes}
                  disabled={notesSaving || (notesDraft || "") === (selected.notes || "")}
                  className="text-xs px-4 py-2 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("admin.contacts.actions.saveNotes")}
                </button>
                {notesSavedFlash && (
                  <span className="text-xs text-green-600">{t("admin.contacts.actions.notesSaved")}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, fullSpan }) {
  return (
    <div className={fullSpan ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-[#515757]">{children}</dd>
    </div>
  );
}
