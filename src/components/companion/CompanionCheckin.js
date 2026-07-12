"use client";

// CompanionCheckin — der Tages-Check-in als wiederverwendbares Formular:
// sechs 1-10-Regler (Befinden / Energie / Schlaf / Verdauung / Stress-
// belastung / Klarheit — EINE Quelle: CHECKIN_SCALES in companionUi) +
// individuelle Symptome (0-10 STÄRKE, höher = stärker) + Freitext. Wird
// zweimal benutzt: als Karte im Heute-Tab und als Herzstück des Tagebuch-Tabs.
//
// Edit-today-Semantik: es gibt genau EINEN Tages-Eintrag pro Tag — Speichern
// legt ihn an bzw. ändert ihn (Upsert macht der Server). Unberührte Regler
// bleiben null und werden NICHT mitgeschickt (der Server ließe null zwar zu,
// aber ein still mitgesendetes "5" wäre ein erfundener Messwert). Das gilt
// genauso für die Symptom-Regler: nur gesetzte Werte gehen als
// symptomScores {id: 0-10} mit — der Server mergt sie in symptom_scores.
//
// Symptome verwalten: die Liste kommt vom Server (props.symptoms, aus
// /today); Ergänzen/Entfernen speichert SOFORT über /symptoms (POST/DELETE),
// unabhängig vom Check-in-Save. Entfernen deaktiviert nur (active=false,
// zweistufige Inline-Bestätigung) — der bisherige Verlauf bleibt lesbar.
//
// Notiz-Dirty-Flag: die Notiz wird NUR mitgeschickt, wenn sie in dieser
// Sitzung wirklich bearbeitet wurde — sonst würde ein veralteter lokaler
// Stand die serverseitig angehängte Hilfe-Knopf-Notiz (POST /help hängt an
// notes an) beim nächsten Regler-Speichern überschreiben.

import { useState } from "react";
import {
  C,
  primaryBtn,
  CHECKIN_SCALES,
  SYMPTOM_SCALE,
} from "@/components/companion/companionUi";

// Formular-Zustand aus dem Server-Check-in ableiten (null = unberührt).
function valuesFrom(initial) {
  return Object.fromEntries(
    CHECKIN_SCALES.map((s) => [s.key, initial?.[s.key] ?? null])
  );
}
function scoresFrom(initial) {
  return { ...(initial?.symptom_scores || {}) };
}

export default function CompanionCheckin({ api, initial, symptoms, onSaved }) {
  const [values, setValues] = useState(() => valuesFrom(initial));
  const [symptomScores, setSymptomScores] = useState(() => scoresFrom(initial));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  // Dirty-Flag: hat der Patient die Notiz in DIESER Sitzung angefasst?
  // Nur dann geht sie mit ins Speichern (siehe Kopfkommentar).
  const [notesEdited, setNotesEdited] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | saved
  const [error, setError] = useState("");

  // Symptomliste lokal, damit Ergänzen/Entfernen sofort sichtbar ist, ohne
  // dass der Eltern-Tab neu laden muss.
  const [syms, setSyms] = useState(symptoms || []);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null); // Stufe 1 der Entfernen-Bestätigung
  const [adding, setAdding] = useState(false); // Inline-Eingabe offen?
  const [newName, setNewName] = useState("");
  const [symBusy, setSymBusy] = useState(false);
  const [symError, setSymError] = useState("");

  // Wenn der Eintrag von außen (frisch geladen / gespeichert) hereinkommt,
  // Formular auf den Serverstand synchronisieren — als "adjust state during
  // render" (React-Doku "You Might Not Need an Effect") statt useEffect:
  // kein Zwischen-Render mit veraltetem Formular, kein Effekt-Kaskaden-Lint.
  const [syncedId, setSyncedId] = useState(initial?.id ?? null);
  if ((initial?.id ?? null) !== syncedId) {
    setSyncedId(initial?.id ?? null);
    setValues(valuesFrom(initial));
    setSymptomScores(scoresFrom(initial));
    setNotes(initial?.notes ?? "");
    setNotesEdited(false);
  }
  // Gleiche Technik für die Symptomliste: der Eltern-Tab liefert bei jedem
  // Laden eine NEUE Array-Referenz — Referenzvergleich auf die Prop selbst
  // (nicht auf einen Fallback wie `symptoms || []`, der würde endlos loopen).
  const [syncedSymProp, setSyncedSymProp] = useState(symptoms);
  if (symptoms !== syncedSymProp) {
    setSyncedSymProp(symptoms);
    setSyms(symptoms || []);
  }

  const initialScores = initial?.symptom_scores || {};
  const dirty =
    CHECKIN_SCALES.some((s) => values[s.key] !== (initial?.[s.key] ?? null)) ||
    syms.some(
      (sym) =>
        (symptomScores[sym.id] ?? null) !== (initialScores[sym.id] ?? null)
    ) ||
    notes !== (initial?.notes ?? "");

  async function save() {
    if (status === "saving") return;
    setStatus("saving");
    setError("");
    try {
      // Notiz nur mitschicken, wenn sie hier wirklich bearbeitet wurde —
      // der Server behandelt "Feld fehlt" als "nicht anfassen".
      const sentNotes = notesEdited;
      const body = {};
      if (sentNotes) body.notes = notes;
      for (const s of CHECKIN_SCALES) {
        if (values[s.key] !== null) body[s.key] = values[s.key];
      }
      // Nur gesetzte Symptom-Werte AKTIVER Symptome — Werte entfernter
      // Symptome bleiben lokal liegen und gehen nicht mehr mit.
      const scores = {};
      for (const sym of syms) {
        const v = symptomScores[sym.id];
        if (v !== null && v !== undefined) scores[sym.id] = v;
      }
      if (Object.keys(scores).length > 0) body.symptomScores = scores;

      const res = await api("/checkin", { method: "POST", body });
      onSaved?.(res.checkin);
      if (sentNotes) {
        // Die gesendete Notiz ist jetzt Serverstand — Flag zurücksetzen.
        setNotesEdited(false);
      } else {
        // Notiz war nicht dabei: den (evtl. serverseitig ergänzten) Stand
        // übernehmen, damit die Anzeige nicht hinter dem Tagebuch herhinkt.
        setNotes(res.checkin?.notes ?? "");
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  }

  async function addSymptom() {
    const name = newName.trim();
    if (!name || symBusy) return;
    setSymBusy(true);
    setSymError("");
    try {
      const res = await api("/symptoms", { method: "POST", body: { name } });
      setSyms((prev) => [...prev, res.symptom]);
      setNewName("");
      setAdding(false);
    } catch (err) {
      setSymError(err.message);
    } finally {
      setSymBusy(false);
    }
  }

  async function removeSymptom(id) {
    if (symBusy) return;
    setSymBusy(true);
    setSymError("");
    try {
      await api("/symptoms", { method: "DELETE", body: { id } });
      setSyms((prev) => prev.filter((s) => s.id !== id));
      setSymptomScores((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setConfirmRemoveId(null);
    } catch (err) {
      setSymError(err.message);
    } finally {
      setSymBusy(false);
    }
  }

  return (
    <div>
      {CHECKIN_SCALES.map((s) => (
        <ScaleSlider
          key={s.key}
          label={s.label}
          value={values[s.key]}
          min={1}
          max={10}
          lowLabel={s.low}
          highLabel={s.high}
          onChange={(n) => setValues((v) => ({ ...v, [s.key]: n }))}
        />
      ))}

      {/* Deine Symptome — individuelle 0-10-Stärke-Regler */}
      <div
        style={{
          margin: "20px 0 12px",
          paddingTop: 14,
          borderTop: `1px solid ${C.tealPale}`,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: C.tealDeep }}>
          Deine Symptome
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: C.textSoft,
            margin: "3px 0 0",
            lineHeight: 1.5,
          }}
        >
          Eigene Beschwerden, die du festhalten möchtest — von 0 (gar nicht)
          bis 10 (sehr stark).
        </p>
      </div>

      {syms.map((sym) =>
        confirmRemoveId === sym.id ? (
          // Stufe 2 der Inline-Bestätigung: die Zeile wird zur Rückfrage.
          <div
            key={sym.id}
            style={{
              border: `1.5px solid ${C.red}55`,
              background: C.redPale,
              borderRadius: 12,
              padding: "11px 12px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: C.text,
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              {`„${sym.name}" aus deiner Liste entfernen? Dein bisheriger Verlauf bleibt sichtbar.`}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => removeSymptom(sym.id)}
                disabled={symBusy}
                style={{
                  flex: 1,
                  background: C.red,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: symBusy ? 0.6 : 1,
                }}
              >
                {symBusy ? "Wird entfernt …" : "Entfernen"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemoveId(null)}
                disabled={symBusy}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: C.tealDeep,
                  border: `1.5px solid ${C.line}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Behalten
              </button>
            </div>
          </div>
        ) : (
          <ScaleSlider
            key={sym.id}
            label={sym.name}
            value={symptomScores[sym.id] ?? null}
            min={SYMPTOM_SCALE.min}
            max={SYMPTOM_SCALE.max}
            lowLabel={SYMPTOM_SCALE.low}
            highLabel={SYMPTOM_SCALE.high}
            onChange={(n) =>
              setSymptomScores((prev) => ({ ...prev, [sym.id]: n }))
            }
            action={
              // Stufe 1: das ✕ öffnet nur die Rückfrage — nichts passiert
              // sofort (zweistufige Inline-Bestätigung).
              <button
                type="button"
                onClick={() => setConfirmRemoveId(sym.id)}
                aria-label={`${sym.name} entfernen`}
                style={{
                  background: "none",
                  border: `1.5px solid ${C.line}`,
                  borderRadius: 8,
                  color: C.textSoft,
                  width: 26,
                  height: 26,
                  fontSize: 13,
                  lineHeight: 1,
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                ✕
              </button>
            }
          />
        )
      )}

      {/* ＋ Symptom ergänzen — Tap öffnet die Inline-Eingabe */}
      {adding ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={newName}
              maxLength={40}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSymptom();
                }
              }}
              placeholder="z. B. Hautirritation"
              aria-label="Name des neuen Symptoms"
              style={{
                flex: 1,
                minWidth: 0,
                boxSizing: "border-box",
                border: `1.5px solid ${C.line}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 15,
                color: C.text,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={addSymptom}
              disabled={!newName.trim() || symBusy}
              style={{
                background: C.teal,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
                opacity: !newName.trim() || symBusy ? 0.6 : 1,
              }}
            >
              {symBusy ? "…" : "Hinzufügen"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewName("");
              setSymError("");
            }}
            disabled={symBusy}
            style={{
              background: "none",
              border: "none",
              color: C.textSoft,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              padding: "8px 2px 0",
            }}
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setSymError("");
          }}
          style={{
            display: "block",
            width: "100%",
            background: "transparent",
            color: C.tealDeep,
            border: `1.5px dashed ${C.line}`,
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          ＋ Symptom ergänzen
        </button>
      )}

      {symError && (
        <div
          style={{
            marginBottom: 12,
            background: C.redPale,
            color: C.red,
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 14,
          }}
        >
          {symError}
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value.slice(0, 2000));
          setNotesEdited(true);
        }}
        placeholder="Möchtest du etwas notieren? (optional)"
        rows={3}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: `1.5px solid ${C.line}`,
          borderRadius: 12,
          padding: "11px 12px",
          fontSize: 15,
          color: C.text,
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
        }}
      />

      {error && (
        <div
          style={{
            marginTop: 10,
            background: C.redPale,
            color: C.red,
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={status === "saving" || (!dirty && status !== "saved")}
        style={{
          ...primaryBtn,
          marginTop: 12,
          background: status === "saved" ? C.tealDeep : C.teal,
          opacity: status === "saving" || (!dirty && status !== "saved") ? 0.6 : 1,
        }}
      >
        {status === "saving"
          ? "Wird gespeichert …"
          : status === "saved"
            ? "Gespeichert ✓"
            : initial?.id
              ? "Eintrag aktualisieren"
              : "Eintrag speichern"}
      </button>
    </div>
  );
}

// Ein Regler mit Kopfzeile (Label + Wert bzw. "–" solange unberührt) und
// Endbeschriftungen — identisches Idiom für die sechs festen Skalen (1-10)
// und die Symptom-Stärke (0-10). action = optionaler Knopf rechts (✕).
function ScaleSlider({
  label,
  value,
  min,
  max,
  lowLabel,
  highLabel,
  onChange,
  action,
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: value === null ? C.textSoft : C.tealDeep,
              minWidth: 34,
              textAlign: "right",
            }}
          >
            {value === null ? "–" : `${value}/10`}
          </span>
          {action}
        </span>
      </div>
      <input
        className="companion-slider"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.teal }}
        aria-label={`${label} von ${min} bis ${max}`}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: C.textSoft,
        }}
      >
        <span>
          {min} = {lowLabel}
        </span>
        <span>
          {max} = {highLabel}
        </span>
      </div>
    </div>
  );
}
