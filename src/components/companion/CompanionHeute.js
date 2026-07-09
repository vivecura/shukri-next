"use client";

// CompanionHeute — der Heute-Tab: Abhak-Liste (optimistisch mit Rollback +
// Teal-Pop), Check-in-Karte und der 🆘-Knopf mit Bestätigungs-Bottom-Sheet.
//
// Der 🆘-Knopf ist ruhig, aber präsent gestaltet (outlined, kein Alarm-Rot-
// Geschrei): die App ist KEIN Notfallkanal — das Sheet und die Bestätigung
// sagen beide klar "Im Notfall 112".

import { useCallback, useEffect, useRef, useState } from "react";
import {
  C,
  cardStyle,
  ghostBtn,
  primaryBtn,
  sectionTitle,
  EmpfehlungBadge,
  fmtDayLong,
} from "@/components/companion/companionUi";
import CompanionCheckin from "@/components/companion/CompanionCheckin";

const KIND_EMOJI = { supplement: "💊", todo: "✅", vorbereitung: "📋" };
const slotKey = (itemId, time) => `${itemId}|${time ?? ""}`;

export default function CompanionHeute({ api }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState([]);
  const [checkin, setCheckin] = useState(null);
  const [toast, setToast] = useState("");
  const [popping, setPopping] = useState(null); // slotKey mit laufender Pop-Animation
  const [helpOpen, setHelpOpen] = useState(false);
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api("/today");
      setDate(data.date);
      setItems(data.items || []);
      setCheckin(data.checkin);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }

  function patchSlot(itemId, time, patch) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              slots: it.slots.map((s) =>
                (s.time ?? null) === (time ?? null) ? { ...s, ...patch } : s
              ),
            }
          : it
      )
    );
  }

  async function toggle(item, slot) {
    const next = !slot.done;
    // Optimistisch abhaken — bei Fehler unten zurückrollen.
    patchSlot(item.id, slot.time, { done: next });
    if (next) {
      setPopping(slotKey(item.id, slot.time));
      setTimeout(() => setPopping(null), 400);
    }
    try {
      const res = await api("/toggle-item", {
        method: "POST",
        body: { itemId: item.id, time: slot.time, done: next },
      });
      // Reconciliation mit dem Serverstand (Doppel-Tipp, Races).
      patchSlot(item.id, slot.time, res.slot);
    } catch (err) {
      patchSlot(item.id, slot.time, { done: !next });
      showToast(err.message);
    }
  }

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard text={error} onRetry={load} />;

  const totalSlots = items.reduce((n, it) => n + it.slots.length, 0);
  const doneSlots = items.reduce(
    (n, it) => n + it.slots.filter((s) => s.done).length,
    0
  );
  const allDone = totalSlots > 0 && doneSlots === totalSlots;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Kopfzeile mit Datum + Fortschritt */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "0 2px",
        }}
      >
        <h2 style={{ ...sectionTitle, margin: 0, fontSize: 19 }}>
          {fmtDayLong(date)}
        </h2>
        {totalSlots > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.tealSoft }}>
            {doneSlots} von {totalSlots} erledigt
          </span>
        )}
      </div>

      {/* Abhak-Liste */}
      {items.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", color: C.textSoft, fontSize: 14 }}>
          Für heute steht nichts auf deiner Liste.
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: "6px 14px" }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                padding: "13px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${C.tealPale}`,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, lineHeight: "24px" }}>
                  {KIND_EMOJI[item.kind] || "•"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15.5,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      {item.name}
                    </span>
                    <EmpfehlungBadge />
                  </div>
                  {(item.dosis || item.instructions) && (
                    <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2, lineHeight: 1.45 }}>
                      {[item.dosis, item.instructions].filter(Boolean).join(" · ")}
                    </div>
                  )}

                  {/* Slots: mehrere Uhrzeiten → Chips; sonst ein Tages-Haken */}
                  {item.slots.length > 1 || item.slots[0]?.time ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {item.slots.map((slot) => (
                        <SlotChip
                          key={slotKey(item.id, slot.time)}
                          slot={slot}
                          popping={popping === slotKey(item.id, slot.time)}
                          onToggle={() => toggle(item, slot)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Einzelner Tages-Slot ohne Uhrzeit → großer Haken rechts */}
                {item.slots.length === 1 && !item.slots[0].time && (
                  <CheckCircle
                    done={item.slots[0].done}
                    popping={popping === slotKey(item.id, null)}
                    onToggle={() => toggle(item, item.slots[0])}
                    label={item.name}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <div
          style={{
            textAlign: "center",
            fontSize: 14,
            fontWeight: 700,
            color: C.tealDeep,
            padding: "2px 0",
          }}
        >
          Alles erledigt für heute — stark! 🎉
        </div>
      )}

      {/* Check-in-Karte */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Wie geht es dir heute?</h3>
        <CompanionCheckin api={api} initial={checkin} onSaved={setCheckin} />
      </div>

      {/* Hilfe-Knopf — ruhig, aber gut sichtbar */}
      {checkin?.help_flag ? (
        <div
          style={{
            ...cardStyle,
            background: C.tealPale,
            border: `1px solid ${C.teal}55`,
            textAlign: "center",
            fontSize: 14,
            color: C.tealDeep,
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          🆘 Deine Rückruf-Bitte ist angekommen. Wir melden uns bei dir.
          <br />
          Im Notfall 112.
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          style={{
            ...ghostBtn,
            border: `1.5px solid ${C.red}66`,
            color: C.red,
            background: "#fff",
            fontWeight: 700,
          }}
        >
          🆘 Ich brauche Hilfe / Rückruf
        </button>
      )}

      {helpOpen && (
        <HelpSheet
          api={api}
          onClose={() => setHelpOpen(false)}
          onSent={() =>
            setCheckin((c) => ({ ...(c || {}), help_flag: true }))
          }
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            background: C.tealDeep,
            color: "#fff",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 14,
            maxWidth: "88vw",
            zIndex: 60,
            boxShadow: "0 4px 14px rgba(31,110,112,0.3)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function CheckCircle({ done, popping, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? `${label} wieder öffnen` : `${label} abhaken`}
      className={popping ? "companion-pop" : undefined}
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        flexShrink: 0,
        border: `2px solid ${done ? C.teal : C.line}`,
        background: done ? C.teal : "#fff",
        color: "#fff",
        fontSize: 18,
        fontWeight: 800,
        lineHeight: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      {done ? "✓" : ""}
    </button>
  );
}

function SlotChip({ slot, popping, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={popping ? "companion-pop" : undefined}
      style={{
        border: `1.5px solid ${slot.done ? C.teal : C.line}`,
        background: slot.done ? C.teal : "#fff",
        color: slot.done ? "#fff" : C.text,
        borderRadius: 999,
        padding: "7px 13px",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      {slot.done ? "✓ " : ""}
      {slot.time ? `${slot.time} Uhr` : "Erledigt"}
    </button>
  );
}

// Bestätigungs-Bottom-Sheet des Hilfe-Knopfs. Zustände: idle → sending → done.
function HelpSheet({ api, onClose, onSent }) {
  const [note, setNote] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done
  const [error, setError] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      await api("/help", { method: "POST", body: { note: note.trim() } });
      onSent?.();
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && state !== "sending") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31, 110, 112, 0.35)",
        zIndex: 70,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 480,
          padding: "22px 20px calc(20px + env(safe-area-inset-bottom))",
          boxShadow: "0 -6px 24px rgba(31,110,112,0.25)",
        }}
      >
        {state === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
            <h3 style={{ ...sectionTitle, fontSize: 19 }}>
              Wir melden uns bei dir.
            </h3>
            <p style={{ fontSize: 15, color: C.text, margin: "0 0 18px", lineHeight: 1.5 }}>
              Deine Nachricht ist in der Praxis angekommen.
              <br />
              <strong>Im Notfall 112.</strong>
            </p>
            <button type="button" style={primaryBtn} onClick={onClose}>
              Alles klar
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ ...sectionTitle, fontSize: 19 }}>
              Sollen wir dich zurückrufen?
            </h3>
            <p style={{ fontSize: 14, color: C.text, margin: "0 0 12px", lineHeight: 1.55 }}>
              Shukri und das Praxis-Team bekommen deine Nachricht und melden
              sich bei dir. Die App ist kein Notfallkanal —{" "}
              <strong>im Notfall wähle bitte sofort 112</strong>.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              placeholder="Was ist los? (optional)"
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
                marginBottom: 12,
              }}
            />
            {error && (
              <div
                style={{
                  background: C.redPale,
                  color: C.red,
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={send}
              disabled={state === "sending"}
              style={{
                ...primaryBtn,
                background: C.red,
                opacity: state === "sending" ? 0.6 : 1,
              }}
            >
              {state === "sending" ? "Wird gesendet …" : "Ja, bitte meldet euch"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={state === "sending"}
              style={{ ...ghostBtn, marginTop: 10 }}
            >
              Abbrechen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lade-/Fehlerkarten (auch von den anderen Tabs importiert)
// ---------------------------------------------------------------------------

export function LoadingCard() {
  return (
    <div
      style={{ ...cardStyle, textAlign: "center", color: C.textSoft, fontSize: 14 }}
      className="companion-pulse"
    >
      Lädt …
    </div>
  );
}

export function ErrorCard({ text, onRetry }) {
  return (
    <div style={{ ...cardStyle, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: C.text, margin: "0 0 12px" }}>{text}</p>
      {onRetry && (
        <button type="button" style={ghostBtn} onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
