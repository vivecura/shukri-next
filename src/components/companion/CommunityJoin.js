"use client";

// CommunityJoin — Opt-in-Screen der Community: Regeln-Karte (Du-Anrede) +
// Nickname-Wahl. Der Beitritt passiert erst mit dem ausdrücklichen
// "Ich stimme den Regeln zu & trete bei" — kein Auto-Enrollment. Der echte
// Name bleibt privat: nach außen erscheint ausschließlich der Nickname.
// 409 (Nickname vergeben) wird als freundlicher Inline-Hinweis gezeigt.

import { useState } from "react";
import {
  C,
  cardStyle,
  sectionTitle,
  inputStyle,
  primaryBtn,
} from "@/components/companion/companionUi";

const RULES = [
  "Sei respektvoll und freundlich.",
  "Teile Erfahrungen — keine medizinischen Ratschläge. Nichts hier ersetzt den Rat deines Behandlers.",
  "Teile keine persönlichen Daten anderer Menschen.",
  "Deine Beiträge sehen alle Patientinnen und Patienten der Praxis.",
];

export default function CommunityJoin({ api, onJoined }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const join = async () => {
    const nick = nickname.trim();
    if (nick.length < 2) {
      setError("Bitte wähle einen Nickname mit mindestens 2 Zeichen.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api("/community/join", {
        method: "POST",
        body: { nickname: nick },
      });
      onJoined();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Willkommen in der Community</h3>
        <p
          style={{
            fontSize: 14,
            color: C.text,
            lineHeight: 1.55,
            margin: "0 0 12px",
          }}
        >
          Hier tauschst du dich mit anderen Patientinnen und Patienten der
          Praxis aus — freiwillig und unter Nickname. Ein paar Regeln:
        </p>
        <ul style={{ margin: 0, padding: "0 0 0 20px", display: "grid", gap: 8 }}>
          {RULES.map((rule) => (
            <li
              key={rule}
              style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}
            >
              {rule}
            </li>
          ))}
        </ul>
      </div>

      <div style={cardStyle}>
        <label
          htmlFor="community-nickname"
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 700,
            color: C.tealDeep,
            marginBottom: 8,
          }}
        >
          Dein Nickname
        </label>
        <input
          id="community-nickname"
          type="text"
          value={nickname}
          maxLength={24}
          autoComplete="off"
          placeholder="z. B. Sonnenblume"
          onChange={(e) => {
            setNickname(e.target.value);
            setError("");
          }}
          style={inputStyle}
        />
        <p
          style={{
            fontSize: 12.5,
            color: C.textSoft,
            lineHeight: 1.5,
            margin: "8px 0 0",
          }}
        >
          Dein echter Name bleibt privat — in der Community sehen dich alle
          nur unter deinem Nickname.
        </p>
        {error && (
          <p
            style={{
              fontSize: 13.5,
              color: C.red,
              fontWeight: 600,
              lineHeight: 1.5,
              margin: "10px 0 0",
            }}
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={join}
          disabled={saving}
          style={{
            ...primaryBtn,
            marginTop: 14,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Einen Moment …" : "Ich stimme den Regeln zu & trete bei"}
        </button>
      </div>
    </div>
  );
}
