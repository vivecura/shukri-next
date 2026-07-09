"use client";

// CompanionCheckin — der Tages-Check-in als wiederverwendbares Formular:
// drei 1-10-Regler (Befinden / Energie / Schlaf) + Freitext. Wird zweimal
// benutzt: als Karte im Heute-Tab und als Herzstück des Tagebuch-Tabs.
//
// Edit-today-Semantik: es gibt genau EINEN Tages-Eintrag pro Tag — Speichern
// legt ihn an bzw. ändert ihn (Upsert macht der Server). Unberührte Regler
// bleiben null und werden NICHT mitgeschickt (der Server ließe null zwar zu,
// aber ein still mitgesendetes "5" wäre ein erfundener Messwert).
//
// Notiz-Dirty-Flag: die Notiz wird NUR mitgeschickt, wenn sie in dieser
// Sitzung wirklich bearbeitet wurde — sonst würde ein veralteter lokaler
// Stand die serverseitig angehängte Hilfe-Knopf-Notiz (POST /help hängt an
// notes an) beim nächsten Regler-Speichern überschreiben.

import { useState } from "react";
import { C, primaryBtn } from "@/components/companion/companionUi";

const SCALES = [
  { key: "feeling", label: "Befinden", low: "sehr schlecht", high: "sehr gut" },
  { key: "energy", label: "Energie", low: "leer", high: "voll da" },
  { key: "sleep", label: "Schlaf", low: "sehr schlecht", high: "sehr gut" },
];

export default function CompanionCheckin({ api, initial, onSaved }) {
  const [values, setValues] = useState({
    feeling: initial?.feeling ?? null,
    energy: initial?.energy ?? null,
    sleep: initial?.sleep ?? null,
  });
  const [notes, setNotes] = useState(initial?.notes ?? "");
  // Dirty-Flag: hat der Patient die Notiz in DIESER Sitzung angefasst?
  // Nur dann geht sie mit ins Speichern (siehe Kopfkommentar).
  const [notesEdited, setNotesEdited] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | saved
  const [error, setError] = useState("");

  // Wenn der Eintrag von außen (frisch geladen / gespeichert) hereinkommt,
  // Formular auf den Serverstand synchronisieren — als "adjust state during
  // render" (React-Doku "You Might Not Need an Effect") statt useEffect:
  // kein Zwischen-Render mit veraltetem Formular, kein Effekt-Kaskaden-Lint.
  const [syncedId, setSyncedId] = useState(initial?.id ?? null);
  if ((initial?.id ?? null) !== syncedId) {
    setSyncedId(initial?.id ?? null);
    setValues({
      feeling: initial?.feeling ?? null,
      energy: initial?.energy ?? null,
      sleep: initial?.sleep ?? null,
    });
    setNotes(initial?.notes ?? "");
    setNotesEdited(false);
  }

  const dirty =
    values.feeling !== (initial?.feeling ?? null) ||
    values.energy !== (initial?.energy ?? null) ||
    values.sleep !== (initial?.sleep ?? null) ||
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
      for (const s of SCALES) {
        if (values[s.key] !== null) body[s.key] = values[s.key];
      }
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

  return (
    <div>
      {SCALES.map((s) => (
        <div key={s.key} style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
              {s.label}
            </span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: values[s.key] === null ? C.textSoft : C.tealDeep,
                minWidth: 34,
                textAlign: "right",
              }}
            >
              {values[s.key] === null ? "–" : `${values[s.key]}/10`}
            </span>
          </div>
          <input
            className="companion-slider"
            type="range"
            min={1}
            max={10}
            step={1}
            value={values[s.key] ?? 5}
            onChange={(e) =>
              setValues((v) => ({ ...v, [s.key]: Number(e.target.value) }))
            }
            style={{ width: "100%", accentColor: C.teal }}
            aria-label={`${s.label} von 1 bis 10`}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: C.textSoft,
            }}
          >
            <span>1 = {s.low}</span>
            <span>10 = {s.high}</span>
          </div>
        </div>
      ))}

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
