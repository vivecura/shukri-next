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

import { useEffect, useState, useCallback, useRef } from "react";
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
  resetPin,
  listPlanItems,
  upsertPlanItem,
  deletePlanItem,
  listImportsForPatient,
  acceptImport,
  rejectImport,
} from "@/lib/companion";
import {
  CANONICAL_SLOTS,
  timesToSchema,
  parseSchema,
  applySchemaToTimes,
  fmtTimesAsSlots,
} from "@/lib/daySlots";

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

// Chip-Toggles (Art, Uhrzeiten, Wochentage, Nachfragen) — ein Look für alle:
// aktiv = gefülltes Teal, inaktiv = weiß mit stiller Kante.
const CHIP = "rounded-full border transition-colors";
const CHIP_ON = "bg-[#43a9ab] text-white border-[#43a9ab]";
const CHIP_OFF =
  "bg-white text-[#515757]/60 border-gray-200 hover:border-[#43a9ab]/40";

// Uhrzeiten: die vier kanonischen Tageszeit-Slots aus @/lib/daySlots (☀️🌞🌙🛌)
// sind die Chips — ein Tipp toggelt die kanonische Uhrzeit des Slots in der
// Liste. Dazu das kompakte Schema-Feld (klassische Notation "1-0-1") und das
// Freitext-Feld für freie Uhrzeiten; alle drei synchron über timesStr.
// Kompaktes Schema-Feld: wie INPUT, nur mit fester Breite statt w-full.
const SCHEMA_INPUT =
  "w-44 flex-none px-3 py-2 text-sm border border-gray-200 rounded-lg text-[#515757] focus:outline-none focus:border-[#43a9ab]";

// Nachfrage-Presets der Infusions-Nachsorge (Stunden nach der Infusion).
const OFFSET_PRESETS = [
  { h: 24, label: "24 h" },
  { h: 72, label: "3 Tage" },
  { h: 168, label: "7 Tage" },
];

const WORKDAYS = [1, 2, 3, 4, 5]; // Mo–Fr

// Welche Felder jede Art braucht — nur die werden gezeigt UND gespeichert
// (versteckte Felder gehen als leer/null raus, damit z. B. ein To-do nie eine
// verwaiste Dosis mitschleppt).
const KIND_FIELDS = {
  supplement: { dosis: true, hinweis: true, times: true, days: true, range: true, event: false, offsets: false, zieldatum: false },
  todo: { dosis: false, hinweis: true, times: true, days: true, range: true, event: false, offsets: false, zieldatum: false },
  vorbereitung: { dosis: false, hinweis: true, times: false, days: false, range: false, event: true, offsets: false, zieldatum: false },
  next_step: { dosis: false, hinweis: true, times: false, days: false, range: false, event: false, offsets: false, zieldatum: true },
  infusion_followup: { dosis: false, hinweis: false, times: false, days: false, range: false, event: true, offsets: true, zieldatum: false },
};

// Name-Platzhalter je Art — kleine Eingabehilfe im Speed-Formular.
const KIND_PLACEHOLDER = {
  supplement: "z. B. Magnesium (FormMed)",
  todo: "z. B. 10 Minuten Spaziergang",
  vorbereitung: "z. B. Nüchtern zur Blutabnahme",
  next_step: "z. B. Folgetermin vereinbaren",
  infusion_followup: "z. B. Eiseninfusion",
};

// Frisches, leeres Bausteine-Formular (Funktion statt Konstante, damit nie
// ein Array/Objekt zwischen Renders geteilt wird). Startet als Supplement mit
// dem Smart Default 08:00 (häufigster Fall: "morgens nehmen").
function emptyForm() {
  return {
    id: null,
    kind: ITEM_KIND_IDS[0],
    name: "",
    dosis: "",
    instructions: "",
    timesStr: "08:00",
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
  const [pinResetBusy, setPinResetBusy] = useState(false);
  const [confirmPinReset, setConfirmPinReset] = useState(false); // Zwei-Schritt-Reset
  // 🚀 Patient einrichten — Vollbild-Modal (QR + 4 Praxis-Schritte, druckbar).
  const [setupOpen, setSetupOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Block B
  const [busyImportId, setBusyImportId] = useState(null);
  const [confirmImportId, setConfirmImportId] = useState(null); // Zwei-Schritt-Verwerfen

  // Block C
  const [form, setForm] = useState(emptyForm);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemSaved, setItemSaved] = useState(false);
  const [confirmItemId, setConfirmItemId] = useState(null); // Zwei-Schritt-Löschen
  const nameRef = useRef(null); // Fokus-Ziel für die Serien-Eingabe
  // true, solange die Uhrzeiten nur ein Smart Default sind (nie von Hand
  // angefasst) — nur dann darf ein Art-Wechsel sie überschreiben/leeren.
  const autoTimesRef = useRef(true);
  // Schema-Feld (klassische Notation "1-0-1"): Anzeige ist normal AUS timesStr
  // abgeleitet (Chips → Schema); nur während des Tippens hält schemaDraft den
  // rohen Text, damit unfertige Eingaben ("1-0") nicht weggerissen werden.
  // null = abgeleitet anzeigen. Jede andere Uhrzeiten-Quelle (Chip, Freitext,
  // Art-Wechsel, Bearbeiten, Reset) setzt den Draft zurück.
  const [schemaDraft, setSchemaDraft] = useState(null);

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
      setSchemaDraft(null);
      setConfirmItemId(null);
      setConfirmImportId(null);
      setConfirmPinReset(false);
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

  // PIN zurücksetzen (zweistufig, NIE window.confirm): pin_hash → null, der
  // Patient legt beim nächsten Login unter /companion eine neue PIN fest.
  // resetPin liefert die frische Zeile → setAccess ist Patch UND Refetch.
  const onResetPin = async () => {
    setConfirmPinReset(false);
    setPinResetBusy(true);
    setErr("");
    try {
      setAccess(await resetPin(submissionId));
    } catch (e) {
      setErr(e.message || "PIN konnte nicht zurückgesetzt werden.");
    } finally {
      setPinResetBusy(false);
    }
  };

  // 🚀 Patient einrichten: Modal öffnen + QR erzeugen. Der QR kodiert
  // <origin>/companion — window.location.origin statt hartem Hostnamen, damit
  // der Code auch auf der Vercel-Preview auf die Preview zeigt. qrcode wird
  // erst beim Klick dynamisch geladen (client-only, bleibt aus dem
  // Patienten-Bundle und dem initialen Admin-Chunk raus). Der Data-URL-Cache
  // überlebt Öffnen/Schließen — der QR ist je Origin immer derselbe.
  const openSetup = async () => {
    setErr("");
    setSetupOpen(true);
    if (qrDataUrl) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(
        `${window.location.origin}/companion`,
        { width: 560, margin: 1 }
      );
      setQrDataUrl(dataUrl);
    } catch {
      setErr("QR-Code konnte nicht erzeugt werden. Bitte erneut versuchen.");
      setSetupOpen(false);
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

  const resetForm = () => {
    autoTimesRef.current = true; // frisches Formular = frische Smart Defaults
    setSchemaDraft(null);
    setForm(emptyForm());
  };

  const toggleDay = (n) =>
    setForm((f) => ({
      ...f,
      days: f.days.includes(n)
        ? f.days.filter((d) => d !== n)
        : [...f.days, n],
    }));

  // "Täglich" = leeres days-Array (fmtWeekdays-Semantik); "Mo–Fr" setzt die
  // fünf Werktage in einem Tipp. Beides überschreibt die Einzel-Auswahl —
  // umgekehrt deaktiviert jeder Einzel-Toggle "Täglich" automatisch, weil der
  // Chip nur bei days.length === 0 leuchtet.
  const setDaily = () => setForm((f) => ({ ...f, days: [] }));
  const setWorkdays = () => setForm((f) => ({ ...f, days: [...WORKDAYS] }));

  // Slot-Chip toggeln (kanonische Uhrzeit rein/raus) — Chips, Schema und
  // Freitext teilen sich timesStr als einzige Wahrheit; ein Chip-Tipp ist
  // damit automatisch in Feld UND Schema sichtbar.
  const toggleTime = (t) => {
    autoTimesRef.current = false;
    setSchemaDraft(null);
    setForm((f) => {
      const times = parseTimesInput(f.timesStr);
      const next = times.includes(t)
        ? times.filter((x) => x !== t)
        : [...times, t].sort();
      return { ...f, timesStr: next.join(", ") };
    });
  };

  // Schema-Eingabe (klassische Notation): live parsen — sobald "1-0-1" bzw.
  // "1-0-1-1" lesbar ist, werden die kanonischen Slot-Uhrzeiten in timesStr
  // gesetzt/entfernt (freie Uhrzeiten bleiben stehen). Unfertiges bleibt als
  // Draft im Feld; onBlur normalisiert auf die abgeleitete Anzeige.
  const onSchemaChange = (raw) => {
    setSchemaDraft(raw);
    const parsed = parseSchema(raw);
    if (parsed) {
      autoTimesRef.current = false;
      setForm((f) => ({
        ...f,
        timesStr: applySchemaToTimes(parseTimesInput(f.timesStr), parsed.on).join(
          ", "
        ),
      }));
    }
  };

  // Nachfrage-Preset toggeln (gleiches Prinzip wie toggleTime, über offsetsStr).
  const toggleOffset = (h) =>
    setForm((f) => {
      const cur = parseOffsetsInput(f.offsetsStr);
      const next = cur.includes(h)
        ? cur.filter((x) => x !== h)
        : [...cur, h].sort((a, b) => a - b);
      return { ...f, offsetsStr: next.join(", ") };
    });

  // Art-Wechsel per Chip: kompatible, bereits eingetippte Werte bleiben
  // stehen; nur leere/automatische Felder bekommen die Smart Defaults der
  // neuen Art (Supplement → 08:00, To-do → täglich ohne Uhrzeit,
  // Infusions-Nachsorge → Termin jetzt + alle drei Nachfragen).
  const switchKind = (kind) => {
    setSchemaDraft(null);
    setForm((f) => {
      if (f.kind === kind) return f;
      const next = { ...f, kind };
      if (kind === "supplement" && parseTimesInput(f.timesStr).length === 0) {
        next.timesStr = "08:00";
        autoTimesRef.current = true;
      }
      if (kind === "todo" && autoTimesRef.current) {
        next.timesStr = ""; // Default: täglich, ohne feste Uhrzeit
      }
      if (kind === "infusion_followup") {
        if (!f.eventLocal) {
          next.eventLocal = toDatetimeLocalInput(new Date().toISOString());
        }
        if (parseOffsetsInput(f.offsetsStr).length === 0) {
          next.offsetsStr = OFFSET_PRESETS.map((o) => o.h).join(", ");
        }
      }
      return next;
    });
  };

  // "Bearbeiten" lädt die Zeile ins Formular (auch Claudes Bausteine — der
  // Update-Pfad der Datenschicht lässt source unangetastet).
  const editItem = (it) => {
    setConfirmItemId(null);
    setSchemaDraft(null);
    autoTimesRef.current = false; // Bestandswerte sind nie "nur Default"
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

  // Die Feld-Landkarte der aktuellen Art steuert Anzeige UND Speicher-Payload
  // (versteckte Felder gehen leer/null raus).
  const fields = KIND_FIELDS[form.kind] || KIND_FIELDS.supplement;

  const saveItem = async () => {
    // Pflichtfeld-Gate: vorbereitung/infusion_followup (fields.event) ohne
    // Termin-Datum würden gespeichert, aber vom Erinnerungs-Sweep still NIE
    // erinnert (Regel B/C brauchen event_date) — deshalb hart blocken.
    if (fields.event && !datetimeLocalToIso(form.eventLocal)) {
      setErr(
        "Bitte Termin-Datum angeben — ohne Datum kann die App nicht erinnern."
      );
      return;
    }
    setItemSaving(true);
    setItemSaved(false);
    setErr("");
    const wasEdit = !!form.id;
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
        dosis: fields.dosis ? form.dosis : "",
        instructions: fields.hinweis ? form.instructions : "",
        times: fields.times ? parseTimesInput(form.timesStr) : [],
        days_of_week: fields.days ? [...form.days].sort((a, b) => a - b) : [],
        reminder_enabled: form.reminderEnabled,
        start_date: fields.range ? form.startDate || null : null,
        end_date:
          fields.range || fields.zieldatum ? form.endDate || null : null,
        event_date: fields.event ? datetimeLocalToIso(form.eventLocal) : null,
        followup_offsets_hours: fields.offsets
          ? parseOffsetsInput(form.offsetsStr)
          : [],
        active: base ? base.active : true,
        sort: base ? base.sort : items.length,
      });
      setItems((rows) =>
        wasEdit
          ? rows.map((r) => (r.id === saved.id ? saved : r))
          : [...rows, saved]
      );
      if (wasEdit) {
        resetForm();
      } else {
        // Serien-Eingabe: Art, Uhrzeiten, Wochentage, Zeitraum & Co. bleiben
        // stehen — nur Name/Dosis/Hinweis leeren und Fokus zurück ins
        // Name-Feld, damit zehn Supplemente in Folge kein Neu-Einstellen
        // brauchen.
        setForm((f) => ({ ...f, name: "", dosis: "", instructions: "" }));
        nameRef.current?.focus();
      }
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
    ? "✓ Gespeichert"
    : form.id
    ? "✓ Änderungen speichern"
    : "✓ Baustein speichern";

  // Abgeleitete Chip-Zustände des Bausteine-Formulars: Chips und Freitext
  // teilen sich timesStr/offsetsStr, aktiv ist, was geparst drinsteht.
  const activeTimes = parseTimesInput(form.timesStr);
  const activeOffsets = parseOffsetsInput(form.offsetsStr);
  // Freie Uhrzeiten (kein kanonischer Slot) erscheinen als eigene Extra-Chips;
  // das Schema-Feld zeigt den Tipp-Draft, sonst die abgeleitete Notation.
  const customTimes = activeTimes.filter(
    (t) => !CANONICAL_SLOTS.some((s) => s.time === t)
  );
  const schemaValue = schemaDraft ?? timesToSchema(activeTimes);
  const schemaAmountHint = !!parseSchema(schemaValue)?.hasAmount;
  const isWorkdays =
    form.days.length === WORKDAYS.length &&
    WORKDAYS.every((n) => form.days.includes(n));

  return (
    <div className="max-w-2xl space-y-6">
      {/* Weicher Wechsel der kontextuellen Felder beim Art-Klick. */}
      <style>{`
        @keyframes acsFadeIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: none; }
        }
        .acs-fade { animation: acsFadeIn 0.18s ease; }
      `}</style>
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
              Patient meldet sich an unter{" "}
              <span className="font-semibold">vivecura.com/companion</span> mit
              Nummer{" "}
              <span className="font-semibold tabular-nums">
                {access.patient_number}
              </span>{" "}
              (PIN legt er beim ersten Login selbst fest).
            </p>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              {/* has_pin ist das abgeleitete Flag der Datenschicht — der
                  pin_hash selbst erreicht den Admin-Client nie. */}
              {access.has_pin ? (
                confirmPinReset ? (
                  <>
                    <span className="text-xs text-[#515757]/70">
                      PIN wirklich zurücksetzen? Der Patient legt beim nächsten
                      Login eine neue fest.
                    </span>
                    <button
                      type="button"
                      onClick={onResetPin}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Ja, zurücksetzen
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPinReset(false)}
                      className="text-xs text-[#515757]/50 hover:text-[#515757]"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmPinReset(true)}
                    disabled={pinResetBusy}
                    className="text-xs text-[#515757]/50 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {pinResetBusy ? "Setzt zurück…" : "PIN zurücksetzen"}
                  </button>
                )
              ) : (
                <span className="text-xs text-[#515757]/40">
                  Noch keine PIN festgelegt — passiert beim ersten Login.
                </span>
              )}
            </div>

            {/* Community-Status (Stufe 6): der Beitritt passiert IN der App
                durch den Patienten selbst (Regeln + Nickname) — hier nur der
                Lese-Status für das Team. */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {access.community_joined_at && access.nickname ? (
                <>
                  <span className="text-sm text-[#515757]">
                    👥 Community-Nickname:{" "}
                    <span className="font-medium">{access.nickname}</span>
                  </span>
                  <span className={BADGE}>
                    Community-Mitglied seit{" "}
                    {fmtDate(access.community_joined_at)}
                  </span>
                </>
              ) : (
                <span className="text-xs text-[#515757]/40">
                  👥 Noch nicht in der Community — der Beitritt (Regeln +
                  Nickname) passiert in der App.
                </span>
              )}
            </div>

            {/* 🚀 Patient einrichten — das 2-Minuten-Onboarding am Gerät des
                Patienten (QR + Nummer + 4 Schritte, druckbar). */}
            <div className="mt-3">
              <button
                type="button"
                onClick={openSetup}
                disabled={!consentGiven}
                title={!consentGiven ? CONSENT_HINT : undefined}
                className={PILL_PRIMARY}
              >
                🚀 Patient einrichten
              </button>
            </div>
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

        {setupOpen && access && (
          <PatientSetupModal
            patientNumber={access.patient_number}
            qrDataUrl={qrDataUrl}
            onClose={() => setSetupOpen(false)}
          />
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

            {/* Art-Auswahl: 5 immer sichtbare Chips — ein Klick wechselt die
                kontextuellen Felder darunter (Speed statt Dropdown). */}
            <div className="mb-4">
              <label className={MICRO_LABEL}>Art</label>
              <div className="flex flex-wrap gap-1.5">
                {ITEM_KIND_IDS.map((k) => {
                  const on = form.kind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => switchKind(k)}
                      aria-pressed={on}
                      className={`text-xs sm:text-sm px-3 py-1.5 font-medium ${CHIP} ${
                        on ? CHIP_ON : CHIP_OFF
                      }`}
                    >
                      {ITEM_KINDS[k].emoji} {ITEM_KINDS[k].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kontextuelle Felder: nur was die Art braucht. key={form.kind}
                remountet den Block beim Art-Wechsel — der weiche Übergang
                kommt aus der acs-fade-Animation (Style-Tag oben). */}
            <div key={form.kind} className="acs-fade">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={MICRO_LABEL}>Name</label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder={KIND_PLACEHOLDER[form.kind]}
                    className={INPUT}
                  />
                </div>
                {fields.dosis && (
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
                )}
                {fields.hinweis && (
                  <div>
                    <label className={MICRO_LABEL}>Hinweis</label>
                    <input
                      type="text"
                      value={form.instructions}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          instructions: e.target.value,
                        }))
                      }
                      placeholder="z. B. morgens nüchtern"
                      className={INPUT}
                    />
                  </div>
                )}
                {fields.event && (
                  <div>
                    <label className={MICRO_LABEL}>
                      {form.kind === "infusion_followup"
                        ? "Infusion am"
                        : "Termin"}
                    </label>
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
                {fields.zieldatum && (
                  <div>
                    <label className={MICRO_LABEL}>Zieldatum (optional)</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endDate: e.target.value }))
                      }
                      className={INPUT}
                    />
                  </div>
                )}
              </div>

              {/* Uhrzeiten: die vier Tageszeit-Slot-Chips (kanonische Uhrzeit
                  rein/raus) + freie Uhrzeiten als Extra-Chips, darunter das
                  kompakte Schema-Feld (1-0-1) und der Freitext — alles
                  synchron über timesStr (ein Tipp erscheint sofort überall). */}
              {fields.times && (
                <div className="mb-4">
                  <label className={MICRO_LABEL}>
                    {form.kind === "todo"
                      ? "Uhrzeiten (optional)"
                      : "Erinnerungs-Uhrzeiten"}
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {CANONICAL_SLOTS.map((s) => {
                      const on = activeTimes.includes(s.time);
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => toggleTime(s.time)}
                          aria-pressed={on}
                          title={`${s.time} Uhr`}
                          className={`text-xs px-3 py-1.5 ${CHIP} ${
                            on ? CHIP_ON : CHIP_OFF
                          }`}
                        >
                          {s.emoji} {s.label}
                        </button>
                      );
                    })}
                    {customTimes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTime(t)}
                        aria-pressed={true}
                        title="Eigene Uhrzeit — Tipp entfernt sie"
                        className={`text-xs px-3 py-1.5 ${CHIP} ${CHIP_ON}`}
                      >
                        🕐 {t}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <input
                      type="text"
                      value={schemaValue}
                      onChange={(e) => onSchemaChange(e.target.value)}
                      onBlur={() => setSchemaDraft(null)}
                      placeholder="z. B. 1-0-1 oder 1-0-1-1"
                      aria-label="Schema (klassische Notation)"
                      className={SCHEMA_INPUT}
                    />
                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="text"
                        value={form.timesStr}
                        onChange={(e) => {
                          autoTimesRef.current = false;
                          setSchemaDraft(null);
                          setForm((f) => ({ ...f, timesStr: e.target.value }));
                        }}
                        onBlur={() =>
                          setForm((f) => ({
                            ...f,
                            timesStr: parseTimesInput(f.timesStr).join(", "),
                          }))
                        }
                        placeholder="08:00, 20:00"
                        aria-label="Uhrzeiten (Freitext)"
                        className={INPUT}
                      />
                    </div>
                  </div>
                  {schemaAmountHint && (
                    <p className="mt-1 text-xs text-[#515757]/50">
                      Menge (z. B. 2 Kapseln) gehört in die Dosis.
                    </p>
                  )}
                </div>
              )}

              {/* Wochentage: prominentes "Täglich" (an, solange kein Tag
                  gewählt ist) + "Mo–Fr" + die 7 Einzel-Toggles. Ein Tages-Tipp
                  deaktiviert "Täglich" automatisch — und umgekehrt. */}
              {fields.days && (
                <div className="mb-4">
                  <label className={MICRO_LABEL}>Wochentage</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={setDaily}
                      aria-pressed={form.days.length === 0}
                      className={`text-xs px-3 py-1.5 font-semibold ${CHIP} ${
                        form.days.length === 0 ? CHIP_ON : CHIP_OFF
                      }`}
                    >
                      Täglich
                    </button>
                    <button
                      type="button"
                      onClick={isWorkdays ? setDaily : setWorkdays}
                      aria-pressed={isWorkdays}
                      className={`text-xs px-3 py-1.5 ${CHIP} ${
                        isWorkdays ? CHIP_ON : CHIP_OFF
                      }`}
                    >
                      Mo–Fr
                    </button>
                    <span
                      className="w-px h-4 bg-gray-200 mx-0.5"
                      aria-hidden="true"
                    />
                    {WEEKDAYS.map((w) => {
                      const on = form.days.includes(w.n);
                      return (
                        <button
                          key={w.n}
                          type="button"
                          onClick={() => toggleDay(w.n)}
                          aria-pressed={on}
                          className={`text-xs px-2.5 py-1 ${CHIP} ${
                            on ? CHIP_ON : CHIP_OFF
                          }`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Zeitraum (optional) */}
              {fields.range && (
                <div className="mb-4">
                  <label className={MICRO_LABEL}>Zeitraum (optional)</label>
                  <div className="flex items-center gap-2 sm:max-w-sm">
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
              )}

              {/* Nachfragen nach der Infusion: Preset-Chips + Freitext-Fallback,
                  synchron über offsetsStr. */}
              {fields.offsets && (
                <div className="mb-4">
                  <label className={MICRO_LABEL}>
                    Nachfrage nach der Infusion
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {OFFSET_PRESETS.map((p) => {
                      const on = activeOffsets.includes(p.h);
                      return (
                        <button
                          key={p.h}
                          type="button"
                          onClick={() => toggleOffset(p.h)}
                          aria-pressed={on}
                          className={`text-xs px-3 py-1.5 ${CHIP} ${
                            on ? CHIP_ON : CHIP_OFF
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="text"
                        value={form.offsetsStr}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            offsetsStr: e.target.value,
                          }))
                        }
                        onBlur={() =>
                          setForm((f) => ({
                            ...f,
                            offsetsStr: parseOffsetsInput(f.offsetsStr).join(
                              ", "
                            ),
                          }))
                        }
                        placeholder="Stunden, z. B. 24, 72, 168"
                        aria-label="Nachfragen in Stunden (Freitext)"
                        className={INPUT}
                      />
                    </div>
                  </div>
                </div>
              )}
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
  // Uhrzeiten als Slot-Worte ("morgens · abends"); freie Zeiten bleiben roh.
  if (Array.isArray(it.times) && it.times.length)
    meta.push(fmtTimesAsSlots(it.times));
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

// ---------------------------------------------------------------------------
// PatientSetupModal — "🚀 Patient einrichten": das 2-Minuten-Onboarding direkt
// am Gerät des Patienten. Vollbild (fixed inset-0), großer QR auf
// <origin>/companion, die Patientennummer riesig, die 4 Praxis-Schritte —
// und druckbar für den Tresen-Aushang: @media print blendet alles außer dem
// Modal aus (visibility-Trick), die Buttons verschwinden über print:hidden.
// ---------------------------------------------------------------------------
function PatientSetupModal({ patientNumber, qrDataUrl, onClose }) {
  return (
    <div className="acs-setup-modal fixed inset-0 z-50 bg-white overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .acs-setup-modal, .acs-setup-modal * { visibility: visible; }
          .acs-setup-modal { position: absolute !important; inset: 0; overflow: visible; }
        }
      `}</style>

      <div className="max-w-md mx-auto px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-[#1f6e70]">
          📱 ViveCura Companion einrichten
        </h2>
        <p className="mt-1 text-xs text-[#515757]/50">
          Direkt am Handy des Patienten — Schritt für Schritt.
        </p>

        {/* Großer QR — kodiert <origin>/companion (Preview-sicher). */}
        <div className="mt-6 flex justify-center">
          {qrDataUrl ? (
            /* Data-URL aus QRCode.toDataURL — next/image bringt hier nichts. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrDataUrl}
              alt="QR-Code zur Companion-App"
              width={280}
              height={280}
              className="w-[280px] h-[280px]"
            />
          ) : (
            <div className="w-[280px] h-[280px] rounded-lg bg-gray-100 animate-pulse" />
          )}
        </div>
        <p className="mt-2 text-xs text-[#515757]/50">
          Führt zu <span className="font-semibold">vivecura.com/companion</span>
        </p>

        {/* Die Nummer riesig — sie ist der Login-Name des Patienten. */}
        <p className="mt-6 text-xs text-[#515757]/50 uppercase tracking-wider">
          Patientennummer
        </p>
        <p className="text-5xl font-semibold text-[#1f6e70] tabular-nums tracking-wider">
          {patientNumber}
        </p>

        {/* Die 4 Praxis-Schritte. */}
        <ol className="mt-8 space-y-3 text-left text-sm text-[#515757]">
          {[
            "Safari auf dem Handy des Patienten öffnen",
            "QR-Code mit der Kamera scannen",
            "Teilen-Symbol → Zum Home-Bildschirm (App installieren)",
            "Patient wählt selbst seine PIN und aktiviert 🔔 Mitteilungen",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-[#43a9ab] text-white text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-xs text-[#515757]/50">
          Dauert ca. 2 Minuten — direkt am Gerät des Patienten.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs px-4 py-2 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors"
          >
            Drucken
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-full border border-gray-200 text-[#515757]/70 hover:text-[#515757] transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
