"use client";

// ============================================================================
// AdminCompanionSection — der per-Patient "📱 App"-Bereich im Akte-Tab
// (ViveCura Companion, Stufe 1).
//
// Drei Blöcke:
//   A 🔐 Einwilligung & Zugang   — das Einwilligungs-Gate (Leitprinzip 2) und
//                                  die Patientennummer VC-#### (Pseudonym).
//   B 📥 Import-Warteschlange    — Claudes Entwürfe; Shukris "Übernehmen"-Klick
//                                  = ärztliche Verordnung, erst dann live.
//   C 💊 Plan-Bausteine          — gleichwertige Handbedienung (KI-Exit):
//                                  anlegen, bearbeiten, pausieren, löschen.
//
// Reine UI. ALLE Konstanten, Helfer und Queries kommen aus @/lib/companion
// (Single Source of Truth) — hier wird NICHTS mehr dupliziert. Ohne
// KI-Einwilligung zeigen B + C nur den stillen Hinweis "Nur mit
// KI-Einwilligung" und der Zugang-anlegen-Button ist gesperrt. Jede Zeile
// trägt sichtbar ihr Herkunfts-Badge (von Claude / manuell). Wording-Regel:
// "Empfehlung von Shukri" — nie "Die App empfiehlt".
//
// Props: { submissionId, consentFromAnamnese } — consentFromAnamnese ist
// boolean|null: kennt das Panel das Anamnese-Häkchen schon, spart uns das
// eine Query; bei null liest die Sektion payload.consent_ki_pseudonym selbst.
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import {
  ITEM_KINDS,
  ITEM_KIND_IDS,
  SOURCE_LABELS,
  IMPORT_STATUS_LABELS,
  CONSENT_HINT,
  WEEKDAYS,
  hasKiConsent,
  fmtTimes,
  parseTimesInput,
  fmtWeekdays,
  sortPlanItems,
  parseOffsetsInput,
  toDatetimeLocalInput,
  datetimeLocalToIso,
  fmtDate,
  getAccess,
  getAnamneseKiConsent,
  createAccess,
  setConsent,
  setActive,
  listPlanItems,
  upsertPlanItem,
  deletePlanItem,
  listImportsForPatient,
  acceptImport,
  rejectImport,
} from "@/lib/companion";

// ---- Haus-Tokens als geteilte Klassen-Strings (ein Ort, ein Look) ----------
const CARD = "rounded-xl border border-gray-200 p-4";
const H3 = "text-sm font-semibold text-[#1f6e70] mb-1";
const HINT = "text-xs text-[#515757]/50 mb-4";
const MICRO_LABEL =
  "block text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1";
const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-[#515757] focus:outline-none focus:border-[#43a9ab]";
const PILL_PRIMARY =
  "text-xs px-3 py-1.5 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40";
const BADGE =
  "ml-auto text-[10px] font-semibold text-[#515757]/40 uppercase tracking-wider";
const INFO_BOX = "text-xs text-[#515757]/80 bg-[#43a9ab]/5 rounded-lg p-2";
const QUIET = "text-sm text-[#515757]/30 italic py-4";

// Frisches, leeres Bausteine-Formular (Funktion statt Konstante, damit nie
// ein Array/Objekt zwischen Renders geteilt wird).
function emptyForm() {
  return {
    id: null,
    kind: ITEM_KIND_IDS[0],
    name: "",
    dosis: "",
    instructions: "",
    timesStr: "",
    days: [],
    startDate: "",
    endDate: "",
    eventLocal: "",
    offsetsStr: "",
    reminderEnabled: true,
  };
}

export default function AdminCompanionSection({
  submissionId,
  consentFromAnamnese = null,
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Daten
  const [access, setAccess] = useState(null);
  const [anamneseConsent, setAnamneseConsent] = useState(
    !!consentFromAnamnese
  );
  const [imports, setImports] = useState([]);
  const [items, setItems] = useState([]);

  // Block A
  const [consentBusy, setConsentBusy] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);

  // Block B
  const [busyImportId, setBusyImportId] = useState(null);
  const [confirmImportId, setConfirmImportId] = useState(null); // Zwei-Schritt-Verwerfen

  // Block C
  const [form, setForm] = useState(emptyForm);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemSaved, setItemSaved] = useState(false);
  const [confirmItemId, setConfirmItemId] = useState(null); // Zwei-Schritt-Löschen

  // Alles parallel laden; das Anamnese-Häkchen nur, wenn das Panel es nicht
  // schon mitgibt (consentFromAnamnese boolean|null).
  const fetchAll = useCallback(async () => {
    const [consent, acc, imps, its] = await Promise.all([
      consentFromAnamnese == null
        ? getAnamneseKiConsent(submissionId)
        : Promise.resolve(!!consentFromAnamnese),
      getAccess(submissionId),
      listImportsForPatient(submissionId),
      listPlanItems(submissionId),
    ]);
    return { consent, acc, imps, its };
  }, [submissionId, consentFromAnamnese]);

  // Reload nach Mutationen (Übernehmen/Verwerfen, Fehler-Recovery).
  const load = useCallback(async () => {
    if (!submissionId) return;
    setErr("");
    try {
      const { consent, acc, imps, its } = await fetchAll();
      setAnamneseConsent(consent);
      setAccess(acc);
      setImports(imps);
      setItems(its);
    } catch (e) {
      setErr(e.message || "Konnte App-Daten nicht laden.");
    }
  }, [submissionId, fetchAll]);

  // Load-on-Mount mit alive-Flag. Das Panel remountet die Sektion per
  // key={submissionId} bei jedem Patientenwechsel — die Resets hier sind
  // Defense-in-Depth für den Fall, dass die Sektion doch einmal ohne key mit
  // wechselnder submissionId wiederverwendet wird: NIE darf ein geladenes
  // Bearbeiten-Formular (form.id!) oder ein Bestätigungs-Zustand von Patient A
  // auf Patient B übertragen werden (Cross-Patient-Write).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!submissionId) return;
      setLoading(true);
      setErr("");
      setForm(emptyForm());
      setConfirmItemId(null);
      setConfirmImportId(null);
      setBusyImportId(null);
      setItemSaved(false);
      try {
        const { consent, acc, imps, its } = await fetchAll();
        if (!alive) return;
        setAnamneseConsent(consent);
        setAccess(acc);
        setImports(imps);
        setItems(its);
      } catch (e) {
        if (alive) setErr(e.message || "Konnte App-Daten nicht laden.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [submissionId, fetchAll]);

  // Das Gate: Anamnese-Häkchen ODER gespeicherte Einwilligung auf dem Zugang.
  const consentGiven = hasKiConsent(anamneseConsent, access);

  // ---- Block A: Handler ----------------------------------------------------

  // Einwilligung setzen/widerrufen. Widerruf (Untick) gilt AUCH für
  // Anamnese-Patienten: die Datenschicht stempelt consent_revoked_at, das
  // überstimmt das unveränderliche Anamnese-Häkchen (DSGVO Art. 7(3) —
  // "jederzeit mit Wirkung für die Zukunft", so steht es im unterschriebenen
  // Einwilligungstext). Widerruf sperrt den Zugang sofort; erneutes Setzen
  // ist eine neue, manuelle Einwilligung.
  const toggleConsent = async (checked) => {
    setConsentBusy(true);
    setErr("");
    try {
      setAccess(
        await setConsent({ submissionId, granted: checked, source: "manuell" })
      );
    } catch (e) {
      setErr(e.message || "Einwilligung konnte nicht gespeichert werden.");
    } finally {
      setConsentBusy(false);
    }
  };

  // Zugang anlegen — createAccess prüft das Gate selbst noch einmal
  // (Doppelschloss: UI blockt, Datenschicht wirft trotzdem).
  const onCreateAccess = async () => {
    setAccessSaving(true);
    setErr("");
    try {
      setAccess(await createAccess({ submissionId }));
    } catch (e) {
      setErr(e.message || "Zugang konnte nicht angelegt werden.");
    } finally {
      setAccessSaving(false);
    }
  };

  const onToggleActive = async () => {
    if (!access) return;
    setErr("");
    try {
      setAccess(await setActive(submissionId, !access.active));
    } catch (e) {
      setErr(e.message || "Konnte den Zugang nicht umschalten.");
    }
  };

  // ---- Block B: Handler ----------------------------------------------------

  // Übernehmen = ärztliche Verordnung: erzeugt die Bausteine, dann Reload,
  // damit Block C sie sofort mit Origin-Badge zeigt.
  const onAcceptImport = async (id) => {
    setBusyImportId(id);
    setErr("");
    try {
      await acceptImport(id);
      await load();
    } catch (e) {
      setErr(e.message || "Übernehmen fehlgeschlagen.");
    } finally {
      setBusyImportId(null);
    }
  };

  const onRejectImport = async (id) => {
    setConfirmImportId(null);
    setBusyImportId(id);
    setErr("");
    try {
      await rejectImport(id);
      await load();
    } catch (e) {
      setErr(e.message || "Verwerfen fehlgeschlagen.");
    } finally {
      setBusyImportId(null);
    }
  };

  // ---- Block C: Handler ----------------------------------------------------

  const resetForm = () => setForm(emptyForm());

  const toggleDay = (n) =>
    setForm((f) => ({
      ...f,
      days: f.days.includes(n)
        ? f.days.filter((d) => d !== n)
        : [...f.days, n],
    }));

  // "Bearbeiten" lädt die Zeile ins Formular (auch Claudes Bausteine — der
  // Update-Pfad der Datenschicht lässt source unangetastet).
  const editItem = (it) => {
    setConfirmItemId(null);
    setForm({
      id: it.id,
      kind: it.kind,
      name: it.name || "",
      dosis: it.dosis || "",
      instructions: it.instructions || "",
      timesStr: fmtTimes(it.times),
      days: Array.isArray(it.days_of_week) ? [...it.days_of_week] : [],
      startDate: it.start_date || "",
      endDate: it.end_date || "",
      eventLocal: toDatetimeLocalInput(it.event_date),
      offsetsStr: (it.followup_offsets_hours || []).join(", "),
      reminderEnabled: it.reminder_enabled !== false,
    });
  };

  const showEvent =
    form.kind === "vorbereitung" || form.kind === "infusion_followup";
  const showOffsets = form.kind === "infusion_followup";

  const saveItem = async () => {
    setItemSaving(true);
    setItemSaved(false);
    setErr("");
    try {
      // Beim Bearbeiten active/sort der bestehenden Zeile erhalten;
      // neue Bausteine hängen ans Ende der Anzeige-Reihenfolge.
      const base = form.id ? items.find((x) => x.id === form.id) : null;
      const saved = await upsertPlanItem({
        id: form.id || undefined,
        submission_id: submissionId,
        source: "manuell",
        kind: form.kind,
        name: form.name,
        dosis: form.dosis,
        instructions: form.instructions,
        times: parseTimesInput(form.timesStr),
        days_of_week: [...form.days].sort((a, b) => a - b),
        reminder_enabled: form.reminderEnabled,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        event_date: showEvent ? datetimeLocalToIso(form.eventLocal) : null,
        followup_offsets_hours: showOffsets
          ? parseOffsetsInput(form.offsetsStr)
          : [],
        active: base ? base.active : true,
        sort: base ? base.sort : items.length,
      });
      setItems((rows) =>
        form.id
          ? rows.map((r) => (r.id === saved.id ? saved : r))
          : [...rows, saved]
      );
      resetForm();
      setItemSaved(true);
      // Save-State kurz sichtbar lassen, dann zurück auf Default.
      setTimeout(() => setItemSaved(false), 2500);
    } catch (e) {
      setErr(e.message || "Speichern fehlgeschlagen.");
    } finally {
      setItemSaving(false);
    }
  };

  // Erinnerung je Zeile an/aus — optimistisch, bei Fehler Reload.
  const toggleReminder = async (it) => {
    setErr("");
    const next = { ...it, reminder_enabled: it.reminder_enabled === false };
    setItems((rows) => rows.map((r) => (r.id === it.id ? next : r)));
    try {
      const saved = await upsertPlanItem(next);
      setItems((rows) => rows.map((r) => (r.id === it.id ? saved : r)));
    } catch (e) {
      setErr(e.message || "Konnte die Erinnerung nicht umschalten.");
      load();
    }
  };

  // Pausieren/Fortsetzen (active) — Baustein bleibt erhalten.
  const togglePause = async (it) => {
    setErr("");
    const next = { ...it, active: it.active === false };
    setItems((rows) => rows.map((r) => (r.id === it.id ? next : r)));
    try {
      const saved = await upsertPlanItem(next);
      setItems((rows) => rows.map((r) => (r.id === it.id ? saved : r)));
    } catch (e) {
      setErr(e.message || "Konnte den Baustein nicht umschalten.");
      load();
    }
  };

  // Löschen zweistufig, optimistisch: erst aus dem State filtern, bei Fehler
  // neu laden. NIE window.confirm.
  const doDeleteItem = async (id) => {
    setConfirmItemId(null);
    setErr("");
    if (form.id === id) resetForm();
    setItems((rows) => rows.filter((r) => r.id !== id));
    try {
      await deletePlanItem(id);
    } catch (e) {
      setErr(e.message || "Löschen fehlgeschlagen.");
      load();
    }
  };

  // ---- Render ---------------------------------------------------------------

  if (loading) {
    return <p className="text-sm text-[#515757]/40 py-4">Lädt…</p>;
  }

  const waiting = imports.filter((i) => i.status === "wartet");
  const decided = imports.filter((i) => i.status !== "wartet");

  const itemSaveLabel = itemSaving
    ? "Speichert…"
    : itemSaved
    ? "Gespeichert ✓"
    : form.id
    ? "✓ Änderungen speichern"
    : "✓ Baustein speichern";

  return (
    <div className="max-w-2xl space-y-6">
      {err && <p className="text-red-500 text-xs mb-3">{err}</p>}

      {/* ================= Block A — Einwilligung & Zugang ================= */}
      <div className={CARD}>
        <h3 className={H3}>🔐 Einwilligung &amp; Zugang</h3>
        <p className={HINT}>
          Ohne KI-Einwilligung kein App-Zugang, kein Import, kein QR-Code. Die
          App erinnert nur an Empfehlungen von Shukri.
        </p>

        <div className="flex items-start gap-2 flex-wrap mb-4">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              disabled={consentBusy}
              onChange={(e) => toggleConsent(e.target.checked)}
              className="mt-0.5 accent-[#43a9ab]"
            />
            <span className="text-[#515757]">
              {anamneseConsent && consentGiven
                ? "KI-Auswertung (pseudonymisiert) — aus der Anamnese"
                : anamneseConsent
                ? "KI-Einwilligung widerrufen — überstimmt das Anamnese-Häkchen"
                : "KI-Einwilligung liegt vor (Patient hat beim Termin unterschrieben)"}
            </span>
          </label>
          {access?.consent_app_at ? (
            <span className={BADGE}>
              {access.consent_source || "manuell"} ·{" "}
              {fmtDate(access.consent_app_at)}
            </span>
          ) : access?.consent_revoked_at ? (
            <span className={BADGE}>
              widerrufen · {fmtDate(access.consent_revoked_at)}
            </span>
          ) : null}
        </div>

        {/* Stiller Hinweis im Widerrufs-Zustand: der Untick ist gespeichert,
            das Gate (Block B + C, Zugang, Import) ist ab sofort zu. */}
        {!consentGiven && access?.consent_revoked_at && (
          <p className="text-xs text-[#515757]/50 mb-4">
            Widerruf wird gespeichert — App-Zugang und Claude-Import sind damit
            gestoppt.
          </p>
        )}

        {access ? (
          <div>
            <div className="flex items-center gap-4 flex-wrap mb-3">
              <span className="text-2xl font-semibold text-[#1f6e70] tabular-nums">
                {access.patient_number}
              </span>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!access.active}
                  onChange={onToggleActive}
                  className="accent-[#43a9ab]"
                />
                <span
                  className={access.active ? "text-[#515757]" : "text-red-500"}
                >
                  {access.active ? "Zugang aktiv" : "Zugang gesperrt"}
                </span>
              </label>
            </div>
            <p className={INFO_BOX}>
              QR-Code + PIN-Login folgen in Stufe 2 — die Nummer steht schon
              fest.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreateAccess}
            disabled={!consentGiven || accessSaving}
            title={!consentGiven ? CONSENT_HINT : undefined}
            className={PILL_PRIMARY}
          >
            {accessSaving ? "Legt an…" : "✓ Zugang anlegen"}
          </button>
        )}
      </div>

      {consentGiven ? (
        <>
          {/* ============== Block B — Import-Warteschlange ============== */}
          <div className={CARD}>
            <h3 className={H3}>📥 Import-Warteschlange</h3>
            <p className={HINT}>
              Übernehmen = deine Verordnung. Erst dann live in App und
              Anrufliste.
            </p>

            {waiting.length === 0 ? (
              <p className={QUIET}>Keine wartenden Importe.</p>
            ) : (
              <div className="space-y-2">
                {waiting.map((imp) => (
                  <ImportCard
                    key={imp.id}
                    imp={imp}
                    busy={busyImportId === imp.id}
                    confirming={confirmImportId === imp.id}
                    onAccept={onAcceptImport}
                    onAskReject={setConfirmImportId}
                    onConfirmReject={onRejectImport}
                  />
                ))}
              </div>
            )}

            {decided.length > 0 && (
              <div className="mt-4">
                <p className={MICRO_LABEL}>Entschieden</p>
                <div className="space-y-2">
                  {decided.map((imp) => (
                    <ImportHistoryRow key={imp.id} imp={imp} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================ Block C — Plan-Bausteine ================ */}
          <div className={CARD}>
            <h3 className={H3}>💊 Plan-Bausteine</h3>
            <p className={HINT}>
              Jeder Baustein ist eine Empfehlung von Shukri — die App erinnert
              nur an Verordnetes, sie empfiehlt selbst nichts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className={MICRO_LABEL}>Art</label>
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kind: e.target.value }))
                  }
                  className={INPUT}
                >
                  {ITEM_KIND_IDS.map((k) => (
                    <option key={k} value={k}>
                      {ITEM_KINDS[k].emoji} {ITEM_KINDS[k].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={MICRO_LABEL}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="z. B. Magnesium (FormMed)"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={MICRO_LABEL}>Dosis</label>
                <input
                  type="text"
                  value={form.dosis}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dosis: e.target.value }))
                  }
                  placeholder="z. B. 2 Kapseln à 300 mg"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={MICRO_LABEL}>Hinweis</label>
                <input
                  type="text"
                  value={form.instructions}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, instructions: e.target.value }))
                  }
                  placeholder="z. B. morgens nüchtern"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={MICRO_LABEL}>Erinnerungs-Uhrzeiten</label>
                <input
                  type="text"
                  value={form.timesStr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timesStr: e.target.value }))
                  }
                  onBlur={() =>
                    setForm((f) => ({
                      ...f,
                      timesStr: parseTimesInput(f.timesStr).join(", "),
                    }))
                  }
                  placeholder="08:00, 20:00"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={MICRO_LABEL}>Zeitraum</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                    aria-label="Start"
                    className={INPUT}
                  />
                  <span className="text-xs text-[#515757]/40 shrink-0">
                    bis
                  </span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                    }
                    aria-label="Ende"
                    className={INPUT}
                  />
                </div>
              </div>
              {showEvent && (
                <div>
                  <label className={MICRO_LABEL}>Termin</label>
                  <input
                    type="datetime-local"
                    value={form.eventLocal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, eventLocal: e.target.value }))
                    }
                    className={INPUT}
                  />
                </div>
              )}
              {showOffsets && (
                <div>
                  <label className={MICRO_LABEL}>
                    Check-in nach Infusion (Stunden)
                  </label>
                  <input
                    type="text"
                    value={form.offsetsStr}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, offsetsStr: e.target.value }))
                    }
                    onBlur={() =>
                      setForm((f) => ({
                        ...f,
                        offsetsStr: parseOffsetsInput(f.offsetsStr).join(", "),
                      }))
                    }
                    placeholder="24, 72"
                    className={INPUT}
                  />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className={MICRO_LABEL}>
                Wochentage (keine Auswahl = täglich)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((w) => {
                  const on = form.days.includes(w.n);
                  return (
                    <button
                      key={w.n}
                      type="button"
                      onClick={() => toggleDay(w.n)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        on
                          ? "bg-[#43a9ab] text-white border-[#43a9ab]"
                          : "bg-white text-[#515757]/60 border-gray-200 hover:border-[#43a9ab]/40"
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={form.reminderEnabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reminderEnabled: e.target.checked }))
                }
                className="mt-0.5 accent-[#43a9ab]"
              />
              <span className="text-[#515757]">Erinnerung aktiv</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveItem}
                disabled={itemSaving}
                className={PILL_PRIMARY}
              >
                {itemSaveLabel}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-[#515757]/50 hover:text-[#515757]"
                >
                  Abbrechen
                </button>
              )}
            </div>

            <div className="mt-5">
              {items.length === 0 ? (
                <p className={QUIET}>Noch keine Bausteine.</p>
              ) : (
                <div className="space-y-2">
                  {sortPlanItems(items).map((it) => (
                    <PlanItemRow
                      key={it.id}
                      it={it}
                      confirming={confirmItemId === it.id}
                      onEdit={editItem}
                      onToggleReminder={toggleReminder}
                      onTogglePause={togglePause}
                      onAskDelete={setConfirmItemId}
                      onConfirmDelete={doDeleteItem}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Gate zu: B + C nur als stiller Hinweis. */}
          <div className={CARD}>
            <h3 className={H3}>📥 Import-Warteschlange</h3>
            <p className={QUIET}>{CONSENT_HINT}</p>
          </div>
          <div className={CARD}>
            <h3 className={H3}>💊 Plan-Bausteine</h3>
            <p className={QUIET}>{CONSENT_HINT}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportCard — eine wartende Import-Karte (Block B) mit Bausteine-Vorschau,
// einklappbarem Lesetext und Übernehmen / zweistufigem Verwerfen.
// ---------------------------------------------------------------------------
function ImportCard({
  imp,
  busy,
  confirming,
  onAccept,
  onAskReject,
  onConfirmReject,
}) {
  const draftItems = Array.isArray(imp.payload?.items) ? imp.payload.items : [];

  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-[#515757]">Entwurf</span>
        <span className="text-xs text-[#515757]/50">
          · {fmtDate(imp.created_at)}
        </span>
        {imp.note && (
          <span className="text-xs text-[#515757]/50">· {imp.note}</span>
        )}
        <span className={BADGE}>
          {SOURCE_LABELS[imp.created_by] || imp.created_by}
        </span>
      </div>

      {draftItems.length > 0 && (
        <ul className="mt-2 space-y-1">
          {draftItems.map((it, i) => (
            <li
              key={i}
              className="text-xs text-[#515757]/70 flex flex-wrap items-baseline gap-x-1.5"
            >
              <span>{ITEM_KINDS[it.kind]?.emoji || "•"}</span>
              <span className="font-medium text-[#515757]">{it.name}</span>
              {it.dosis && <span>· {it.dosis}</span>}
              {Array.isArray(it.times) && it.times.length > 0 && (
                <span>· {fmtTimes(it.times)}</span>
              )}
              {((Array.isArray(it.times) && it.times.length > 0) ||
                (Array.isArray(it.days_of_week) &&
                  it.days_of_week.length > 0)) && (
                <span>· {fmtWeekdays(it.days_of_week)}</span>
              )}
              {it.event_date && <span>· Termin {fmtDate(it.event_date)}</span>}
              <span className="text-[#515757]/40">
                ({ITEM_KINDS[it.kind]?.label || it.kind})
              </span>
            </li>
          ))}
        </ul>
      )}

      {imp.payload?.lesetext && (
        <details className="mt-2">
          <summary className="text-xs text-[#43a9ab] cursor-pointer hover:underline">
            Lesetext anzeigen
          </summary>
          <p className={`mt-1 whitespace-pre-wrap ${INFO_BOX}`}>
            {imp.payload.lesetext}
          </p>
        </details>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {confirming ? (
          <>
            <span className="text-xs text-[#515757]/70">
              Wirklich verwerfen?
            </span>
            <button
              type="button"
              onClick={() => onConfirmReject(imp.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Ja, verwerfen
            </button>
            <button
              type="button"
              onClick={() => onAskReject(null)}
              className="text-xs text-[#515757]/50 hover:text-[#515757]"
            >
              Abbrechen
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onAccept(imp.id)}
              disabled={busy}
              className={PILL_PRIMARY}
            >
              {busy ? "Übernimmt…" : "Übernehmen"}
            </button>
            <button
              type="button"
              onClick={() => onAskReject(imp.id)}
              disabled={busy}
              className="text-xs text-[#515757]/40 hover:text-red-500 transition-colors"
            >
              Verwerfen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportHistoryRow — entschiedene Importe als graue, nachvollziehbare Historie.
// ---------------------------------------------------------------------------
function ImportHistoryRow({ imp }) {
  const count = Array.isArray(imp.payload?.items) ? imp.payload.items.length : 0;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#515757]/60">
          {IMPORT_STATUS_LABELS[imp.status] || imp.status}
        </span>
        <span className="text-xs text-[#515757]/40">
          · {fmtDate(imp.decided_at || imp.created_at)}
        </span>
        <span className="text-xs text-[#515757]/40">
          · {count} Baustein{count === 1 ? "" : "e"}
        </span>
        {imp.note && (
          <span className="text-xs text-[#515757]/40">· {imp.note}</span>
        )}
        <span className={BADGE}>
          {SOURCE_LABELS[imp.created_by] || imp.created_by}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanItemRow — eine Bausteine-Zeile (Block C): Emoji + Name + Dosis,
// Meta-Zeile, Herkunfts-Badge, Erinnerung-Toggle, Bearbeiten, Pausieren,
// zweistufiges Löschen.
// ---------------------------------------------------------------------------
function PlanItemRow({
  it,
  confirming,
  onEdit,
  onToggleReminder,
  onTogglePause,
  onAskDelete,
  onConfirmDelete,
}) {
  const kind = ITEM_KINDS[it.kind];
  const inactive = it.active === false;

  const meta = [];
  if (Array.isArray(it.times) && it.times.length) meta.push(fmtTimes(it.times));
  if (
    (Array.isArray(it.times) && it.times.length) ||
    (Array.isArray(it.days_of_week) && it.days_of_week.length)
  ) {
    meta.push(fmtWeekdays(it.days_of_week));
  }
  if (it.start_date || it.end_date) {
    meta.push(
      [
        it.start_date ? `ab ${fmtDate(it.start_date)}` : "",
        it.end_date ? `bis ${fmtDate(it.end_date)}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    );
  }
  if (it.event_date) meta.push(`Termin ${fmtDate(it.event_date)}`);
  if (
    Array.isArray(it.followup_offsets_hours) &&
    it.followup_offsets_hours.length
  ) {
    meta.push(`Check-in nach ${it.followup_offsets_hours.join(", ")} h`);
  }

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        inactive ? "border-gray-100 bg-gray-50/50" : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span>{kind?.emoji || "•"}</span>
        <span
          className={`font-medium ${
            inactive ? "text-[#515757]/50" : "text-[#515757]"
          }`}
        >
          {it.name}
        </span>
        {it.dosis && (
          <span className="text-xs text-[#515757]/50">· {it.dosis}</span>
        )}
        {inactive && (
          <span className="text-xs text-[#515757]/40">· pausiert</span>
        )}
        <span className={BADGE}>{SOURCE_LABELS[it.source] || it.source}</span>
      </div>

      {it.instructions && (
        <p className="mt-1 text-xs text-[#515757]/60">{it.instructions}</p>
      )}

      {meta.length > 0 && (
        <p className="mt-1 text-xs text-[#515757]/50">{meta.join(" · ")}</p>
      )}

      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-[#515757]/60 cursor-pointer">
          <input
            type="checkbox"
            checked={it.reminder_enabled !== false}
            onChange={() => onToggleReminder(it)}
            className="accent-[#43a9ab]"
          />
          Erinnerung
        </label>

        {confirming ? (
          <span className="flex items-center gap-3">
            <span className="text-xs text-[#515757]/70">
              Wirklich löschen?
            </span>
            <button
              type="button"
              onClick={() => onConfirmDelete(it.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Ja, löschen
            </button>
            <button
              type="button"
              onClick={() => onAskDelete(null)}
              className="text-xs text-[#515757]/50 hover:text-[#515757]"
            >
              Abbrechen
            </button>
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEdit(it)}
              className="text-xs text-[#43a9ab] hover:underline"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => onTogglePause(it)}
              className="text-xs text-[#515757]/50 hover:text-[#515757]"
            >
              {inactive ? "Fortsetzen" : "Pausieren"}
            </button>
            <button
              type="button"
              onClick={() => onAskDelete(it.id)}
              className="text-xs text-[#515757]/40 hover:text-red-500 transition-colors"
            >
              Löschen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
