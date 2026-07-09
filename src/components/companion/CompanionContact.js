"use client";

// CompanionContact — die kompakte "Kontakt zur Praxis"-Karte der Patienten-App.
// Sichtbar ohne Suchen: am Ende des Heute-Tabs UND des Mein-Plan-Tabs.
//
// Drei volle, gut tippbare Wege (mobile-first): anrufen, Termin buchen
// (Doctolib), Nachricht schreiben (/kontakt — das Kontaktformular der Website,
// Anfragen landen wie gewohnt in contact_requests). Kein Notfallkanal — dafür
// steht der ständige 112-Disclaimer im Fuß der App (bleibt unangetastet).

import { C, cardStyle, ghostBtn, sectionTitle } from "@/components/companion/companionUi";

const DOCTOLIB_URL =
  "https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile";

// Ghost-Button als Link: gleicher Look wie die App-Buttons, nur als <a>.
const linkBtn = {
  ...ghostBtn,
  boxSizing: "border-box",
  textAlign: "center",
  textDecoration: "none",
};

export default function CompanionContact() {
  return (
    <div style={cardStyle}>
      <h3 style={sectionTitle}>Kontakt zur Praxis</h3>
      <p
        style={{
          fontSize: 13,
          color: C.textSoft,
          margin: "0 0 12px",
          lineHeight: 1.5,
        }}
      >
        Wir sind für dich da — melde dich, wenn etwas unklar ist.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <a href="tel:+4930200060860" style={linkBtn}>
          📞 Praxis anrufen
          <span
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: C.textSoft,
              marginTop: 2,
            }}
          >
            030 200060860
          </span>
        </a>
        <a
          href={DOCTOLIB_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={linkBtn}
        >
          📅 Termin buchen
        </a>
        <a
          href="/kontakt"
          target="_blank"
          rel="noopener noreferrer"
          style={linkBtn}
        >
          ✉️ Nachricht schreiben
        </a>
      </div>
    </div>
  );
}
