// src/components/pages/Anamnese.js
//
// Patient intake form body. Wraps public/anamnese.html in a full-viewport
// iframe so the existing standalone form logic (4-step gating, signature pad,
// file upload, DE/EN toggle, etc.) keeps working as-is.
//
// Client component because we temporarily mutate document.body styles to
// match the form's dark background and remove default margin while mounted,
// restoring them on unmount.

"use client";

import { useEffect } from "react";

export default function AnamneseBody() {
  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevMargin = document.body.style.margin;
    document.body.style.background = "#f7fafa";
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
        background: "#f7fafa",
      }}
    />
  );
}
