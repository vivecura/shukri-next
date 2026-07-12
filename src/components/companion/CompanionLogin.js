"use client";

// CompanionLogin — der komplette Anmelde-Flow der Patienten-App:
//   1. Anmelden: Nummer (VC-#### mit festem Präfix) + PIN auf EINEM Screen.
//      Antwortet der Server mit needsPin (Erst-Besuch, PIN noch nicht
//      festgelegt), wechselt der Client auf die PIN-Einrichtung.
//   2. PIN festlegen (erster Besuch: zweimal eingeben, muss übereinstimmen).
//
// Anti-Enumeration-Design: es gibt KEINE Nummer-Vorab-Probe mehr — ob eine
// Nummer existiert, verrät der Server erst nach einem vollen, ins Rate-Limit
// zählenden Login-Versuch (needsPin) bzw. gar nicht (generisches "Nummer
// oder PIN falsch."). Fehlermeldungen der API werden WÖRTLICH angezeigt —
// sie sind bewusst generisch gehalten, der Client erfindet keine eigenen
// Detail-Diagnosen. Der Server bekommt immer nur die EINE bestätigte PIN.

import { useState } from "react";
import {
  C,
  cardStyle,
  inputStyle,
  primaryBtn,
  Disclaimer,
} from "@/components/companion/companionUi";

const FALLBACK_ERROR =
  "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.";
const PIN_REGEX = /^\d{6,12}$/;

async function postJson(path, body) {
  const res = await fetch(`/api/companion${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // kein JSON — generischer Fehler unten
  }
  if (!res.ok) throw new Error(data?.error || FALLBACK_ERROR);
  return data || {};
}

export default function CompanionLogin({ onSuccess }) {
  const [step, setStep] = useState("login"); // login | setpin
  const [digits, setDigits] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nummer = `VC-${digits}`;

  function backToLogin() {
    setStep("login");
    setPin("");
    setPin2("");
    setError("");
  }

  async function submitLogin(e) {
    e.preventDefault();
    if (!digits || !pin || saving) return;
    setSaving(true);
    setError("");
    try {
      const data = await postJson("/login", { nummer, pin });
      if (data.needsPin) {
        // Erst-Besuch: Zugang berechtigt, PIN noch nicht festgelegt →
        // PIN-Einrichtung zeigen (Felder frisch, nichts vorbefüllen).
        setPin("");
        setPin2("");
        setStep("setpin");
        setSaving(false);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function submitSetPin(e) {
    e.preventDefault();
    if (saving) return;
    if (!PIN_REGEX.test(pin)) {
      setError("Die PIN muss aus 6 bis 12 Ziffern bestehen.");
      return;
    }
    if (pin !== pin2) {
      setError("Die beiden PINs stimmen nicht überein.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await postJson("/set-pin", { nummer, pin });
      onSuccess?.();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const label = {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    color: C.tealDeep,
    margin: "0 0 6px",
  };
  const hint = { fontSize: 13, color: C.textSoft, lineHeight: 1.5, margin: "8px 0 0" };

  return (
    <div style={{ padding: "40px 20px 12px", maxWidth: 420, margin: "0 auto" }}>
      {/* Kopf */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Assets/LOGO7.png"
          alt="ViveCura"
          width={72}
          height={72}
          style={{ borderRadius: 20, display: "inline-block" }}
        />
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.tealDeep,
            margin: "14px 0 4px",
          }}
        >
          ViveCura Companion
        </h1>
        <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>
          Dein Begleiter aus der Praxis
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 20 }}>
        {step === "login" && (
          <form onSubmit={submitLogin}>
            <label style={label} htmlFor="companion-nummer">
              Deine Patienten-Nummer
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: C.tealPale,
                  color: C.tealDeep,
                  fontWeight: 800,
                  fontSize: 17,
                  borderRadius: 12,
                  padding: "0 14px",
                }}
              >
                VC-
              </span>
              <input
                id="companion-nummer"
                style={{ ...inputStyle, letterSpacing: 2 }}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0012"
                value={digits}
                onChange={(e) =>
                  setDigits(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoFocus
              />
            </div>
            <label
              style={{ ...label, marginTop: 14 }}
              htmlFor="companion-pin"
            >
              Deine PIN
            </label>
            <input
              id="companion-pin"
              style={{ ...inputStyle, letterSpacing: 6 }}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
            />
            <p style={hint}>
              Deine Nummer hast du in der Praxis bekommen (zum Beispiel
              VC-0012). Beim ersten Besuch gibst du hier eine beliebige PIN
              ein — deine eigene PIN legst du direkt danach fest.
            </p>
            {error && <ErrorBox text={error} />}
            <button
              type="submit"
              style={{
                ...primaryBtn,
                marginTop: 16,
                opacity: saving || !digits || !pin ? 0.6 : 1,
              }}
              disabled={saving || !digits || !pin}
            >
              {saving ? "Einen Moment …" : "Anmelden"}
            </button>
          </form>
        )}

        {step === "setpin" && (
          <form onSubmit={submitSetPin}>
            <p style={{ fontSize: 14, color: C.text, margin: "0 0 14px", lineHeight: 1.5 }}>
              Willkommen! Beim ersten Besuch legst du deine eigene PIN fest
              (6 bis 12 Ziffern). Damit meldest du dich ab jetzt an.
            </p>
            <label style={label} htmlFor="companion-newpin">
              Neue PIN (mindestens 6 Ziffern)
            </label>
            <input
              id="companion-newpin"
              style={{ ...inputStyle, letterSpacing: 6, marginBottom: 12 }}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              autoFocus
            />
            <label style={label} htmlFor="companion-newpin2">
              PIN wiederholen
            </label>
            <input
              id="companion-newpin2"
              style={{ ...inputStyle, letterSpacing: 6 }}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="••••••"
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 12))}
            />
            {error && <ErrorBox text={error} />}
            <button
              type="submit"
              style={{
                ...primaryBtn,
                marginTop: 16,
                opacity: saving || !pin || !pin2 ? 0.6 : 1,
              }}
              disabled={saving || !pin || !pin2}
            >
              {saving ? "Einen Moment …" : "PIN festlegen und loslegen"}
            </button>
            <BackLink onClick={backToLogin} />
          </form>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}

function ErrorBox({ text }) {
  return (
    <div
      style={{
        marginTop: 14,
        background: C.redPale,
        color: C.red,
        border: `1px solid ${C.red}33`,
        borderRadius: 12,
        padding: "10px 12px",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  );
}

function BackLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        margin: "14px auto 0",
        background: "none",
        border: "none",
        color: C.tealSoft,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      Andere Nummer eingeben
    </button>
  );
}
