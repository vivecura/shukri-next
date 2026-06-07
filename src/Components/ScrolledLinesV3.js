import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useIsMobile from "../hooks/useIsMobile";

function renderWithColors(line, isActive, redWords, greenWords) {
  const parts = [];
  let remaining = line;
  const all = [
    ...redWords.map((w) => ({ word: w, color: "red" })),
    ...greenWords.map((w) => ({ word: w, color: "green" })),
  ];
  for (const { word, color } of all) {
    const idx = remaining.indexOf(word);
    if (idx === -1) continue;
    if (idx > 0) parts.push(<span key={parts.length}>{remaining.slice(0, idx)}</span>);
    parts.push(
      <span
        key={parts.length}
        className={isActive ? (color === "red" ? "text-red-500" : "text-green-500") : ""}
      >
        {word}
      </span>
    );
    remaining = remaining.slice(idx + word.length);
  }
  if (remaining) parts.push(<span key={parts.length}>{remaining}</span>);
  return parts.length ? parts : line;
}

function ScrolledLinesV3({ lines: linesProp }) {
  const { t } = useTranslation();
  const lines = linesProp || t("scrolledLinesV3.lines", { returnObjects: true });
  const redWords = t("scrolledLinesV3.redWords", { returnObjects: true });
  const greenWords = t("scrolledLinesV3.greenWords", { returnObjects: true });

  const sectionRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isMobile = useIsMobile();
  const videoSrc = isMobile ? "/Assets/videos/home-mobile.mp4" : "/Assets/videos/home-desktop.mp4";

  useEffect(() => {
    let rafId = 0;

    const updateActiveLine = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const stickyRange = rect.height - viewportHeight;

      if (rect.top > 0 || stickyRange <= 0) {
        setActiveIndex(0);
        return;
      }

      const progress = -rect.top / stickyRange;
      const clamped = Math.min(1, Math.max(0, progress));
      const nextIndex = Math.round(clamped * (lines.length - 1));
      setActiveIndex(nextIndex);
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateActiveLine);
    };

    updateActiveLine();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [lines]);

  const sectionHeight = `${100 + (lines.length - 1) * 30}vh`;

  return (
    <section ref={sectionRef} className="relative" style={{ height: sectionHeight }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <video
          key={videoSrc}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-black/40 z-[1]" />
      <div className="relative z-[2] flex h-full items-center justify-center px-4">
        <div className="w-full max-w-5xl text-center">
          {lines.map((line, index) => {
            const isActive = index === activeIndex;
            return (
              <p
                key={`${line}-${index}`}
                className={`transition-all duration-500 ease-out font-semibold tracking-tight ${
                  isActive
                    ? "text-white opacity-100 text-3xl sm:text-4xl md:text-5xl"
                    : "text-white/10 opacity-90 text-3xl sm:text-4xl md:text-5xl"
                }`}
              >
                {line}
              </p>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}

export default ScrolledLinesV3;
