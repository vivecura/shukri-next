// src/Pages/Anamnese.js
//
// Patient intake form at /anamnese. Wraps the standalone iPad/phone-oriented
// HTML form (public/anamnese.html) in a full-viewport iframe so the existing
// form logic (4-step gating, signature pad, file upload, DE/EN toggle, etc.)
// keeps working as-is.

import { useEffect } from "react";

export default function Anamnese() {
  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevMargin = document.body.style.margin;
    document.body.style.background = "#0d1015";
    document.body.style.margin = "0";
    return () => {
      document.body.style.background = prevBg;
      document.body.style.margin = prevMargin;
    };
  }, []);

  return (
    <iframe
      src="/anamnese.html"
      title="ViveCura · Patienten-Aufnahme"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        background: "#0d1015",
      }}
    />
  );
}
