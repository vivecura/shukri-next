// src/Pages/HonorarHub.js
//
// Doctor-facing hub shown on the practice iPad at /honorar.
// Pick a service -> opens its Honorarvereinbarung -> hand the iPad to the patient.
// Tablet-first design; matches the dark teal ViveCura form styling.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HONORAR_FORMS } from "../lib/honorarForms";

const C = {
  teal: "#43A9AB",
  tealSoft: "#5fc4c6",
  bg: "#0d1015",
  charcoal: "#1a1f24",
  cream: "#f4efe6",
  creamDim: "#a8a39a",
};

export default function HonorarHub() {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = C.bg;
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.cream,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        padding: "48px 32px 64px",
      }}
    >
      <style>{`
        .hon-grid{
          display:grid;
          grid-template-columns:repeat(2, minmax(0,1fr));
          gap:22px;
          max-width:1000px;
          margin:0 auto;
        }
        @media (min-width:1100px){ .hon-grid{ grid-template-columns:repeat(3, minmax(0,1fr)); } }
        @media (max-width:680px){ .hon-grid{ grid-template-columns:1fr; } }
        .hon-card{
          background:${C.charcoal};
          border:1px solid rgba(255,255,255,.08);
          border-radius:18px;
          padding:26px 24px;
          text-align:left;
          cursor:pointer;
          color:inherit;
          font:inherit;
          transition:transform .15s ease, border-color .15s ease, background .15s ease;
          display:flex;
          flex-direction:column;
          gap:12px;
          min-height:190px;
        }
        .hon-card:hover, .hon-card:focus-visible{
          transform:translateY(-3px);
          border-color:${C.teal};
          background:#20262d;
          outline:none;
        }
        .hon-card:active{ transform:translateY(0); }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto 36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: C.teal,
              color: C.bg,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            V
          </span>
          <span style={{ letterSpacing: ".18em", fontWeight: 700 }}>VIVECURA</span>
        </div>
        <h1 style={{ fontSize: 26, margin: "18px 0 4px" }}>Honorarvereinbarung</h1>
        <p style={{ color: C.creamDim, fontSize: 15 }}>
          Leistung auswählen und das iPad anschließend der Patientin / dem Patienten zum Ausfüllen und Unterschreiben reichen.
        </p>
      </div>

      <div className="hon-grid">
        {HONORAR_FORMS.map((f) => (
          <button
            key={f.slug}
            className="hon-card"
            onClick={() => navigate(`/honorar/${f.slug}`)}
          >
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                color: C.tealSoft,
                fontWeight: 700,
              }}
            >
              Honorarvereinbarung
            </span>
            <span style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.25 }}>
              {f.label}
            </span>
            <span style={{ fontSize: 13.5, color: C.creamDim, flex: 1 }}>
              {f.tagline}
            </span>
            <span
              style={{
                marginTop: 4,
                fontSize: 14,
                fontWeight: 700,
                color: C.cream,
              }}
            >
              {f.gesamt.replace("Gesamthonorar: ", "")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
