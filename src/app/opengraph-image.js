import { ImageResponse } from "next/og";

export const alt = "ViveCura – Funktionelle Medizin, Prävention & Longevity in Berlin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: "#43a9ab",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          letterSpacing: "0.05em",
          padding: 80,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 800, marginBottom: 24 }}>
          ViveCura
        </div>
        <div style={{ fontSize: 36, opacity: 0.9, maxWidth: 1000 }}>
          Funktionelle Medizin · Prävention · Longevity
        </div>
        <div style={{ fontSize: 28, opacity: 0.7, marginTop: 40 }}>Berlin</div>
      </div>
    ),
    { ...size }
  );
}
