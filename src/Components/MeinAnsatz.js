import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const outerCirclePositions = [
  { id: 0, left: 204, top: 26, lineId: "l1" },
  { id: 1, left: 343, top: 93, lineId: "l2" },
  { id: 2, left: 378, top: 244, lineId: "l3" },
  { id: 3, left: 281, top: 364, lineId: "l4" },
  { id: 4, left: 127, top: 364, lineId: "l5" },
  { id: 5, left: 31, top: 244, lineId: "l6" },
  { id: 6, left: 65, top: 93, lineId: "l7" },
];

const lines = [
  { id: "l1", x1: 260, y1: 186, x2: 260, y2: 138 },
  { id: "l2", x1: 318, y1: 214, x2: 355, y2: 184 },
  { id: "l3", x1: 332, y1: 277, x2: 379, y2: 287 },
  { id: "l4", x1: 292, y1: 327, x2: 313, y2: 370 },
  { id: "l5", x1: 228, y1: 327, x2: 207, y2: 370 },
  { id: "l6", x1: 188, y1: 277, x2: 142, y2: 287 },
  { id: "l7", x1: 202, y1: 214, x2: 165, y2: 184 },
];

const icons = [
  // 0 - Funktionelle Medizin
  <svg key="i0" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="13" r="4" stroke="#43a9ab" strokeWidth="1.5" />
    <circle cx="13" cy="4" r="1.8" stroke="#43a9ab" strokeWidth="1.4" />
    <circle cx="13" cy="22" r="1.8" stroke="#43a9ab" strokeWidth="1.4" />
    <circle cx="4" cy="13" r="1.8" stroke="#43a9ab" strokeWidth="1.4" />
    <circle cx="22" cy="13" r="1.8" stroke="#43a9ab" strokeWidth="1.4" />
    <line x1="13" y1="9.5" x2="13" y2="5.8" stroke="#43a9ab" strokeWidth="1.4" />
    <line x1="13" y1="16.5" x2="13" y2="20.2" stroke="#43a9ab" strokeWidth="1.4" />
    <line x1="9.5" y1="13" x2="5.8" y2="13" stroke="#43a9ab" strokeWidth="1.4" />
    <line x1="16.5" y1="13" x2="20.2" y2="13" stroke="#43a9ab" strokeWidth="1.4" />
  </svg>,
  // 1 - Anthroposophische Medizin
  <svg key="i1" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="6.5" r="3.2" stroke="#43a9ab" strokeWidth="1.5" />
    <line x1="13" y1="9.7" x2="13" y2="17" stroke="#43a9ab" strokeWidth="1.5" />
    <line x1="9" y1="13" x2="17" y2="13" stroke="#43a9ab" strokeWidth="1.5" />
    <path d="M7 23 C7 17.5 19 17.5 19 23" stroke="#43a9ab" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>,
  // 2 - Toxikologie
  <svg key="i2" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M10 4.5 L10 10 L5 21 L21 21 L16 10 L16 4.5" stroke="#43a9ab" strokeWidth="1.5" strokeLinejoin="round" />
    <line x1="10" y1="4.5" x2="16" y2="4.5" stroke="#43a9ab" strokeWidth="1.5" />
    <path d="M8.5 16 Q13 13 17.5 16" stroke="#389193" strokeWidth="1.2" fill="none" />
  </svg>,
  // 3 - Lebensstilmedizin
  <svg key="i3" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M13 22 C13 22 4 16 4 9.5 C4 6.5 6.5 4.5 9.5 4.5 C11 4.5 12.5 5.4 13 7 C13.5 5.4 15 4.5 16.5 4.5 C19.5 4.5 22 6.5 22 9.5 C22 16 13 22 13 22Z" stroke="#43a9ab" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
  </svg>,
  // 4 - Genetik & Epigenetik
  <svg key="i4" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M9.5 4 C9.5 4 17.5 8 17.5 13 C17.5 18 9.5 22 9.5 22" stroke="#43a9ab" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M16.5 4 C16.5 4 8.5 8 8.5 13 C8.5 18 16.5 22 16.5 22" stroke="#43a9ab" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <line x1="11" y1="9" x2="15" y2="9" stroke="#389193" strokeWidth="1.2" />
    <line x1="10" y1="13" x2="16" y2="13" stroke="#389193" strokeWidth="1.2" />
    <line x1="11" y1="17" x2="15" y2="17" stroke="#389193" strokeWidth="1.2" />
  </svg>,
  // 5 - Biohacking
  <svg key="i5" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M15.5 4 L9 14 L14.5 14 L10.5 22 L20 11 L14.5 11 L18.5 4 Z" stroke="#43a9ab" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
  </svg>,
  // 6 - Coaching & Umsetzung
  <svg key="i6" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="13" r="9" stroke="#43a9ab" strokeWidth="1.5" />
    <circle cx="13" cy="13" r="5" stroke="#389193" strokeWidth="1.3" />
    <circle cx="13" cy="13" r="2.2" fill="#43a9ab" />
  </svg>,
];

export default function MeinAnsatz() {
  const { t, i18n } = useTranslation();
  const items = t("meinAnsatz.items", { returnObjects: true });
  const circleLabels = t("meinAnsatz.circleLabels", { returnObjects: true });
  const headerSuffix = t("meinAnsatz.headerTitleSuffix", { defaultValue: "" });

  const [active, setActive] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [panelData, setPanelData] = useState(null);
  const [entered, setEntered] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
        } else {
          setShowPanel(false);
          setActive(null);
          setPanelData(null);
        }
      },
      { threshold: 0.05 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  function handleClick(id) {
    if (active === id) {
      setShowPanel(false);
      setActive(null);
      return;
    }
    setActive(id);
    setShowPanel(false);
    const idx = id === 7 ? 0 : id + 1;
    setTimeout(() => {
      setPanelData(items[idx]);
      setShowPanel(true);
    }, 160);
  }

  const activeLineId = active !== null && active !== 7
    ? outerCirclePositions.find((c) => c.id === active)?.lineId
    : null;

  const isEn = i18n.language === "en";

  return (
    <section
      ref={sectionRef}
      className="relative flex flex-col items-center bg-white overflow-x-hidden py-14 px-5 sm:px-10"
    >
      {/* Ambient glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          width: 800, height: 800,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(67,169,171,0.07) 0%, transparent 68%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-[1] w-full flex flex-col items-center max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-left mb-12 sm:mb-16 w-full self-start max-w-[70%] sm:max-w-[50%]">
          <h2
            className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter"
            style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}
          >
            {isEn ? (
              <>
                {t("meinAnsatz.headerTitle")} <em className="italic">{t("meinAnsatz.headerEmphasis")}</em>
                {headerSuffix ? ` ${headerSuffix}` : ""}
              </>
            ) : (
              <>
                {t("meinAnsatz.headerTitle")} <em className="italic">{t("meinAnsatz.headerEmphasis")}</em>
              </>
            )}
          </h2>
        </div>

        {/* Diagram + Panel row */}
        <div
          className="w-full flex flex-col lg:flex-row items-center lg:items-center gap-8 lg:gap-12"
          style={{
            justifyContent: active !== null ? "center" : "center",
          }}
        >

          {/* Diagram — starts centered, shifts left on click (desktop only) */}
          <div
            className="diagram-wrapper relative flex-shrink-0"
            style={{ width: 520, height: 520 }}
          >
            {/* SVG lines + orbit ring */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 520 520"
            >
              <circle
                cx="260" cy="260" r="178"
                stroke="rgba(67,169,171,0.12)" strokeWidth="1" fill="none"
              />
              {lines.map((l) => (
                <line
                  key={l.id}
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={activeLineId === l.id ? "rgba(67,169,171,0.65)" : "rgba(67,169,171,0.22)"}
                  strokeWidth={activeLineId === l.id ? 1.5 : 1}
                  strokeDasharray="5 5"
                  fill="none"
                  style={{ transition: "stroke 0.35s ease, stroke-width 0.35s ease" }}
                />
              ))}
            </svg>

            {/* Center circle */}
            <div
              onClick={() => handleClick(7)}
              className="absolute rounded-full flex flex-col items-center justify-center cursor-pointer text-center select-none"
              style={{
                width: 148, height: 148,
                top: "50%", left: "50%",
                transform: active === 7
                  ? "translate(-50%,-50%) scale(1.09)"
                  : "translate(-50%,-50%) scale(1)",
                background: "#43a9ab",
                zIndex: 10,
                boxShadow: active === 7
                  ? "0 0 78px rgba(67,169,171,0.50), 0 0 160px rgba(67,169,171,0.18)"
                  : "0 0 48px rgba(67,169,171,0.22), 0 0 100px rgba(67,169,171,0.08)",
                transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.38s ease",
                opacity: entered ? 1 : 0,
                animation: entered ? "popCenter 0.55s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
              }}
            >
              <svg width="38" height="46" viewBox="0 0 52 62" fill="none">
                <circle cx="26" cy="10" r="8" stroke="#fff" strokeWidth="2" />
                <path d="M10 34 C10 22 42 22 42 34 L42 50 C42 50 36 54 26 54 C16 54 10 50 10 50 Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" fill="none" />
                <path d="M10 34 L3 44" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M42 34 L49 44" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 54 L18 62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M32 54 L34 62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 38 L21 38 L23 34 L26 42 L29 36 L31 38 L34 38" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div
                className="text-white text-[11.5px] font-medium tracking-[0.5px]"
                style={{ marginTop: 6 }}
              >
                {t("meinAnsatz.centerLabel")}
              </div>
            </div>

            {/* Outer circles */}
            {outerCirclePositions.map((circle, i) => {
              const isActive = active === circle.id;
              return (
                <div
                  key={circle.id}
                  onClick={() => handleClick(circle.id)}
                  className="absolute rounded-full flex flex-col items-center justify-center cursor-pointer text-center select-none"
                  style={{
                    width: 112, height: 112,
                    left: circle.left, top: circle.top,
                    background: isActive
                      ? "rgba(67,169,171,0.20)"
                      : "rgba(67,169,171,0.07)",
                    border: `1.5px solid ${isActive ? "#43a9ab" : "rgba(67,169,171,0.40)"}`,
                    boxShadow: isActive
                      ? "0 0 44px rgba(67,169,171,0.30), 0 0 88px rgba(67,169,171,0.10)"
                      : "none",
                    transform: isActive ? "scale(1.11)" : "scale(1)",
                    transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.38s ease, background 0.38s ease, border-color 0.38s ease",
                    opacity: entered ? 1 : 0,
                    animation: entered
                      ? `pop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${(i + 1) * 0.08}s both`
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(67,169,171,0.16)";
                      e.currentTarget.style.borderColor = "#43a9ab";
                      e.currentTarget.style.boxShadow = "0 0 28px rgba(67,169,171,0.22)";
                      e.currentTarget.style.transform = "scale(1.07)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(67,169,171,0.07)";
                      e.currentTarget.style.borderColor = "rgba(67,169,171,0.40)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  <div style={{ marginBottom: 7 }}>{icons[i]}</div>
                  <div
                    className="text-[10px] font-medium tracking-[0.3px] leading-[1.38]"
                    style={{ color: "#43a9ab", padding: "0 10px", whiteSpace: "pre-line" }}
                  >
                    {circleLabels[i]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info panel — slides in from right on desktop, drops below on mobile */}
          <div
            className="flex flex-col justify-center overflow-hidden"
            style={{
              width: active !== null ? "100%" : 0,
              maxWidth: active !== null ? 420 : 0,
              maxHeight: active !== null ? 1000 : 0,
              opacity: active !== null ? 1 : 0,
              transition: "max-width 0.6s cubic-bezier(0.4,0,0.2,1), width 0.6s cubic-bezier(0.4,0,0.2,1), max-height 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease",
            }}
          >
            <div
              style={{
                opacity: showPanel ? 1 : 0,
                transform: showPanel ? "translateX(0)" : "translateX(30px)",
                transition: "opacity 0.48s ease, transform 0.48s ease",
                pointerEvents: showPanel ? "auto" : "none",
                minWidth: 340,
              }}
            >
              {panelData && (
                <div
                  className="relative overflow-hidden"
                  style={{
                    border: "1px solid rgba(67,169,171,0.25)",
                    borderRadius: 24,
                    padding: "36px 40px",
                    background: "rgba(67,169,171,0.04)",
                  }}
                >
                  <div
                    className="absolute top-0"
                    style={{
                      left: "8%", right: "8%", height: 1,
                      background: "linear-gradient(90deg, transparent, rgba(67,169,171,0.55), transparent)",
                    }}
                  />
                  <div
                    className="text-[10px] font-light tracking-[3.5px] uppercase mb-3"
                    style={{ color: "#389193" }}
                  >
                    {panelData.badge}
                  </div>
                  <div
                    className="mb-4 leading-[1.1]"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 28, fontWeight: 400,
                      color: "#515757",
                    }}
                  >
                    {panelData.title}
                  </div>
                  <div
                    className="text-[14.5px] font-light leading-[1.82]"
                    style={{ color: "rgba(81,87,87,0.70)" }}
                  >
                    {panelData.text}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Hint — visible only when nothing is selected */}
        <div
          className="mt-10 text-[11px] font-light tracking-[2.5px] uppercase text-center"
          style={{
            color: "rgba(81,87,87,0.30)",
            opacity: active !== null ? 0 : 1,
            transition: "opacity 0.4s ease",
            pointerEvents: active !== null ? "none" : "auto",
          }}
        >
          {t("meinAnsatz.hint")}
        </div>
      </div>

      <style>{`
        @keyframes pop {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes popCenter {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @media (max-width: 580px) {
          .diagram-wrapper {
            transform: scale(0.68);
            transform-origin: top center;
            margin-bottom: -166px;
          }
        }
      `}</style>
    </section>
  );
}
