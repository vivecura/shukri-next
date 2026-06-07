import { useState, useRef, useEffect, useCallback } from "react";
import FanCards from "../Components/FanCards";
import FanCardsMobile from "../Components/FanCardsMobile";
import useIsMobile from "../hooks/useIsMobile";
import Seo from "../Components/Seo";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

function useScrollFadeIn(threshold = 0.1) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, style: { opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(40px)", transition: "opacity 1.2s ease-out, transform 1.2s ease-out" } };
}

const ChevronDown = ({ isOpen }) => (
  <svg className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

function AccordionItem({ title, children, isOpen, onToggle }) {
  return (
    <div className="border-b border-[#43a9ab]/10">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-6 px-1 text-left focus:outline-none group">
        <span className="text-base sm:text-lg font-medium text-[#515757] group-hover:text-[#43a9ab] transition-colors pr-4">{title}</span>
        <span className="text-[#43a9ab]"><ChevronDown isOpen={isOpen} /></span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[600px] opacity-100 pb-6" : "max-h-0 opacity-0"}`}>
        <div className="px-1 text-[#515757]/70 text-sm sm:text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function HeroBanner({ image, badge, title, subtitle, ctaText, ctaHref, trustItems }) {
  const [scrollY, setScrollY] = useState(0);
  const handleScroll = useCallback(() => setScrollY(window.scrollY), []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: "85vh" }}>
      <div
        className="absolute inset-0 w-full h-full"
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
      >
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover"
          style={{ minHeight: "110%" }}
        />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.50) 55%, rgba(0,0,0,0.40) 75%, rgba(255,255,255,0.3) 90%, rgba(255,255,255,1) 100%)",
        }} />
      </div>

      <div className="relative z-10 flex flex-col justify-end px-5 sm:px-8 pt-24 pb-12 sm:pb-16" style={{ minHeight: "85vh" }}>
        <div className="max-w-4xl mx-auto w-full">
          <div
            className="inline-block text-[10px] sm:text-xs font-medium tracking-[3px] uppercase mb-5 px-4 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", backdropFilter: "blur(8px)" }}
          >
            {badge}
          </div>
          <h1
            className="text-white font-black leading-[0.92] tracking-tighter mb-6"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4rem)" }}
          >
            {title}
          </h1>
          <p className="text-white/80 text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl">
            {subtitle}
          </p>

          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-[#43a9ab] text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-lg shadow-[#43a9ab]/25"
          >
            {ctaText}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>

          {trustItems && (
            <div className="mt-10 flex flex-wrap gap-4 sm:gap-8">
              {trustItems.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="text-xs sm:text-sm text-white tracking-wide">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const longevityChapters = [
  {
    video: "/Assets/Longevity%20Videos/Genetik%20Quer.mp4",
    videoMob: "/Assets/Longevity%20Videos/Genetik%20Hoch.mp4",
  },
  {
    video: "/Assets/Longevity%20Videos/Ist-Zustand%20Quer.mp4",
    videoMob: "/Assets/Longevity%20Videos/Ist%20Zustand%20Hoch.mp4",
  },
  {
    video: "/Assets/Longevity%20Videos/Umsetzung%20Quer.mp4",
    videoMob: "/Assets/Longevity%20Videos/Umsetzung%20Hoch.mp4",
  },
  {
    video: "/Assets/Longevity%20Videos/Reaktion%20des%20K%C3%B6rpers%20Quer.mp4",
    videoMob: "/Assets/Longevity%20Videos/Reaktion%20des%20K%C3%B6rpers%20Hoch.mp4",
  },
  {
    video: "/Assets/Longevity%20Videos/Therapeutische%20Unterst%C3%BCtzung%20Quer.mp4",
    videoMob: "/Assets/Longevity%20Videos/Therapeutische%20Unterst%C3%BCtzung%20hoch.mp4",
  },
];

function ScrollVideoExperience({ steps, chapters, isMobile }) {
  const sectionRef = useRef(null);
  const videoRefs = useRef([]);
  const [progress, setProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);

  const chapterCount = steps.length;
  const sliceSize = 1 / chapterCount;

  const handleScroll = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollableDistance = sectionHeight - viewportHeight;
    if (scrollableDistance <= 0) return;
    const rawProgress = Math.max(0, Math.min(1, -rect.top / scrollableDistance));
    setProgress(rawProgress);
    const chapterIndex = Math.min(chapterCount - 1, Math.floor(rawProgress * chapterCount));
    setActiveChapter(chapterIndex);
  }, [chapterCount]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === activeChapter) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeChapter]);

  const clipExpand = Math.min(1, progress / 0.12);
  const insetVal = (1 - clipExpand) * 18;
  const radiusVal = (1 - clipExpand) * 24;
  const clipPath = `inset(${insetVal}% round ${radiusVal}px)`;

  const getChapterStyle = (index) => {
    const chapterStart = index * sliceSize;
    const chapterEnd = (index + 1) * sliceSize;
    const chapterMid = chapterStart + sliceSize * 0.5;
    const startY = 25;
    const endY = -25;
    let opacity = 0;
    let translateY = startY;
    if (progress < chapterStart) {
      opacity = 0;
      translateY = startY;
    } else if (progress >= chapterStart && progress < chapterMid) {
      const t = (progress - chapterStart) / (chapterMid - chapterStart);
      opacity = t;
      translateY = startY * (1 - t);
    } else if (progress >= chapterMid && progress < chapterEnd) {
      if (index === chapterCount - 1) {
        opacity = 1;
        translateY = 0;
      } else {
        const t = (progress - chapterMid) / (chapterEnd - chapterMid);
        opacity = 1 - t;
        translateY = endY * t;
      }
    } else {
      opacity = 0;
      translateY = endY;
    }
    return { opacity, transform: `translateY(${translateY}vh)` };
  };

  return (
    <>
      <div style={{ height: "4vh" }} />
      <div
        ref={sectionRef}
        style={{ height: `${chapterCount * 150 + 30}vh` }}
        className="relative"
      >
        <div
          className="sticky top-0 h-screen w-full overflow-hidden bg-[#1a1a1a]"
          style={{ clipPath }}
        >
          {chapters.map((chapter, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{ opacity: i === activeChapter ? 1 : 0, transition: "opacity 0.8s ease" }}
            >
              <video
                ref={(el) => (videoRefs.current[i] = el)}
                src={isMobile ? chapter.videoMob : chapter.video}
                muted
                playsInline
                preload="auto"
                loop
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {steps.map((step, i) => (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none"
              style={getChapterStyle(i)}
            >
              <div className="text-center max-w-2xl">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
                  {step.title}
                </h2>
                {step.description && (
                  <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed max-w-lg mx-auto">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            style={{ opacity: 1, pointerEvents: "none" }}
          >
            <style>{`
              @keyframes glimmerDownLong {
                0%, 100% { opacity: 0; transform: translateY(-4px); }
                50% { opacity: 1; transform: translateY(4px); }
              }
              .scroll-glimmer-long { animation: glimmerDownLong 2.5s ease-in-out infinite; }
            `}</style>
            <svg className="w-6 h-6 text-white/50 scroll-glimmer-long" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

function HebelFlow({ data, heading, intro, relatedLabel }) {
  const [activeNum, setActiveNum] = useState(1);
  const active = data.find((h) => h.num === activeNum) || data[0];
  const connectedSet = new Set(active.related);

  return (
    <div className="hebel-side">
      <style>{`
        .hebel-side { font-family: inherit; max-width: 1200px; margin: 0 auto; padding: 80px 24px; color: #1a1f24; }
        .hebel-side h2 { font-size: clamp(30px, 4vw, 42px); font-weight: 700; color: #43A9AB; margin: 0 0 18px 0; letter-spacing: -0.015em; }
        .hebel-side .intro { font-size: 17px; line-height: 1.65; color: #6b7378; max-width: 640px; margin: 0 0 64px 0; }
        .hebel-split { display: grid; grid-template-columns: 360px 1fr; gap: 72px; align-items: start; }
        @media (max-width: 960px) { .hebel-split { grid-template-columns: 1fr; gap: 48px; } }
        .flow-list { position: relative; padding: 8px 0; }
        .flow-list::before {
          content: ''; position: absolute; left: 25px; top: 34px; bottom: 34px; width: 1.5px;
          background: linear-gradient(to bottom, rgba(67,169,171,0.1) 0%, rgba(67,169,171,0.3) 50%, rgba(67,169,171,0.1) 100%);
        }
        .flow-item {
          display: flex; align-items: center; gap: 18px; background: transparent; border: none;
          cursor: pointer; font-family: inherit; padding: 14px 0; width: 100%; text-align: left;
          position: relative; transition: transform 0.25s ease;
        }
        .flow-item:hover { transform: translateX(3px); }
        .flow-dot {
          width: 52px; height: 52px; flex-shrink: 0; border-radius: 50%; background: #ffffff;
          border: 1.5px solid rgba(67,169,171,0.35); display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 600; color: #43A9AB;
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1); position: relative; z-index: 1;
        }
        .flow-item:hover .flow-dot { border-color: #43A9AB; }
        .flow-item.is-active .flow-dot {
          background: #43A9AB; color: #ffffff; border-color: #43A9AB; border-width: 2px;
          box-shadow: 0 0 0 6px rgba(67,169,171,0.12);
        }
        .flow-item.is-connected .flow-dot { background: #e8f5f5; border-color: #43A9AB; }
        .flow-label { font-size: 16px; font-weight: 500; color: #4a5258; line-height: 1.35; transition: color 0.3s ease, font-weight 0.3s ease; }
        .flow-item.is-active .flow-label { color: #1a1f24; font-weight: 600; }
        .flow-detail-wrap { min-height: 480px; padding-top: 4px; }
        .flow-content { animation: contentFade 0.45s ease; }
        @keyframes contentFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .flow-big-num {
          font-size: clamp(56px, 7vw, 88px); font-weight: 300; color: #43A9AB; line-height: 0.9;
          letter-spacing: -0.03em; font-variant-numeric: tabular-nums; margin-bottom: 28px; display: block;
        }
        .flow-big-num sup { font-size: 0.32em; font-weight: 500; color: #9aa2a7; margin-left: 6px; letter-spacing: 0.1em; text-transform: uppercase; vertical-align: 10px; }
        .flow-title { font-size: clamp(26px, 3vw, 34px); font-weight: 700; color: #1a1f24; margin: 0 0 22px 0; letter-spacing: -0.01em; line-height: 1.15; }
        .flow-lead { font-size: 18px; line-height: 1.5; color: #43A9AB; font-weight: 500; margin: 0 0 22px 0; font-style: italic; }
        .flow-text { font-size: 16px; line-height: 1.75; color: #4a5258; margin: 0 0 14px 0; max-width: 620px; }
        .flow-text:last-of-type { margin-bottom: 36px; }
        .flow-related { display: flex; align-items: center; gap: 14px; padding-top: 24px; border-top: 1px solid #eef5f5; flex-wrap: wrap; }
        .flow-related-label { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #9aa2a7; font-weight: 600; }
        .flow-related-list { display: flex; gap: 8px; flex-wrap: wrap; }
        .flow-related-item {
          display: inline-flex; align-items: center; gap: 8px; background: transparent; color: #2d7a7b;
          padding: 6px 14px 6px 8px; border: 1px solid rgba(67,169,171,0.25); border-radius: 100px;
          font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;
        }
        .flow-related-item:hover { background: #43A9AB; color: #ffffff; border-color: #43A9AB; }
        .flow-related-num {
          display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px;
          background: rgba(67,169,171,0.12); border-radius: 50%; font-size: 11px; font-weight: 600;
          color: #43A9AB; transition: all 0.2s ease;
        }
        .flow-related-item:hover .flow-related-num { background: rgba(255,255,255,0.25); color: #ffffff; }
      `}</style>

      <h2>{heading}</h2>
      <p className="intro">
        {intro}
      </p>

      <div className="hebel-split">
        <aside className="flow-list" role="tablist">
          {data.map((h) => {
            const classes = [
              "flow-item",
              h.num === activeNum ? "is-active" : "",
              h.num !== activeNum && connectedSet.has(h.num) ? "is-connected" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={h.num}
                type="button"
                role="tab"
                className={classes}
                aria-selected={h.num === activeNum}
                onClick={() => setActiveNum(h.num)}
              >
                <span className="flow-dot">{h.num}</span>
                <span className="flow-label">{h.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="flow-detail-wrap">
          <div className="flow-content" key={active.num}>
            <span className="flow-big-num">
              {String(active.num).padStart(2, "0")}<sup>/06</sup>
            </span>
            <h3 className="flow-title">{active.title}</h3>
            <p className="flow-lead">{active.lead}</p>
            {active.paragraphs.map((p, idx) => (
              <p key={idx} className="flow-text">{p}</p>
            ))}
            <div className="flow-related">
              <span className="flow-related-label">{relatedLabel}</span>
              <div className="flow-related-list">
                {active.related.map((r) => {
                  const rel = data.find((h) => h.num === r);
                  if (!rel) return null;
                  return (
                    <button
                      key={r}
                      type="button"
                      className="flow-related-item"
                      onClick={() => setActiveNum(r)}
                    >
                      <span className="flow-related-num">{r}</span>
                      {rel.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PraeventionLongevity() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);
  const [openDiagnostik, setOpenDiagnostik] = useState(null);
  const isMobile = useIsMobile();
  const chaosAnim = useScrollFadeIn();
  const biofeedbackAnim = useScrollFadeIn();
  const processAnim = useScrollFadeIn();
  const systemAnim = useScrollFadeIn();
  const diagnostikAnim = useScrollFadeIn();
  const leversAnim = useScrollFadeIn();
  const startAnim = useScrollFadeIn();
  const fitAnim = useScrollFadeIn();
  const faqAnim = useScrollFadeIn();
  const ctaAnim = useScrollFadeIn();

  const mentoringCardsTranslated = t("praeventionLongevity.mentoringCards", { returnObjects: true });
  const mentoringCards = [
    {
      image: "/Assets/Images%20Umsetzung%2011%20Mentoring/Stoffwechsel%20stabilisieren.png",
      label: mentoringCardsTranslated[0].label,
      title: mentoringCardsTranslated[0].title,
      desc: mentoringCardsTranslated[0].desc,
      path: "",
      textAlign: "top",
    },
    {
      image: "/Assets/Images%20Umsetzung%2011%20Mentoring/Nervensystem%20regulieren.png",
      label: mentoringCardsTranslated[1].label,
      title: mentoringCardsTranslated[1].title,
      desc: mentoringCardsTranslated[1].desc,
      path: "",
      textAlign: "top",
    },
    {
      image: "/Assets/Images%20Umsetzung%2011%20Mentoring/Immunsystem%20entlasten.png",
      label: mentoringCardsTranslated[2].label,
      title: mentoringCardsTranslated[2].title,
      desc: mentoringCardsTranslated[2].desc,
      path: "",
      textAlign: "top",
    },
  ];

  const processSteps = t("praeventionLongevity.processSteps", { returnObjects: true });
  const faqData = t("praeventionLongevity.faq", { returnObjects: true });
  const hebelData = t("praeventionLongevity.hebel", { returnObjects: true });
  const diagnostikItems = t("praeventionLongevity.diagnostikItems", { returnObjects: true });
  const startSteps = t("praeventionLongevity.startSteps", { returnObjects: true });
  const fitItems = t("praeventionLongevity.fitItems", { returnObjects: true });
  const trustItems = t("praeventionLongevity.heroTrustItems", { returnObjects: true });

  return (
    <div className="bg-white min-h-screen">
      <Seo
        title={t("praeventionLongevity.seoTitle")}
        description={t("praeventionLongevity.seoDescription")}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqData.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
      </Helmet>

      {/* Hero Image Banner */}
      <HeroBanner
        image="/Assets/PraeventionLongevity.png"
        badge={t("praeventionLongevity.heroBadge")}
        title={<>{t("praeventionLongevity.heroTitlePart1")} <em className="italic">{t("praeventionLongevity.heroTitleEm")}</em></>}
        subtitle={t("praeventionLongevity.heroSubtitle")}
        ctaText={t("praeventionLongevity.heroCta")}
        ctaHref="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
        trustItems={trustItems}
      />

      {/* Das Longevity-Chaos */}
      <section ref={chaosAnim.ref} style={chaosAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-6 tracking-tight">
            {t("praeventionLongevity.chaosTitle")}
          </h2>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed mb-4">
            {t("praeventionLongevity.chaosBody")}
          </p>
        </div>
      </section>

      {/* Was oft uebersehen wird + Biofeedback */}
      <section ref={biofeedbackAnim.ref} style={biofeedbackAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-6 tracking-tight">
            {t("praeventionLongevity.overlookedTitle")}
          </h2>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed mb-4">
            {t("praeventionLongevity.overlookedBody1")}
          </p>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed mb-8">
            {t("praeventionLongevity.overlookedBody2")}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#43a9ab]/15 p-6 sm:p-8" style={{ background: "rgba(67,169,171,0.03)" }}>
              <div className="w-12 h-12 rounded-full bg-[#43a9ab]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#43a9ab]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h4 className="text-[#515757] text-lg font-semibold mb-2">{t("praeventionLongevity.hrvTitle")}</h4>
              <p className="text-[#515757]/60 text-sm leading-relaxed">{t("praeventionLongevity.hrvDesc")}</p>
            </div>
            <div className="rounded-2xl border border-[#43a9ab]/15 p-6 sm:p-8" style={{ background: "rgba(67,169,171,0.03)" }}>
              <div className="w-12 h-12 rounded-full bg-[#43a9ab]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#43a9ab]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h4 className="text-[#515757] text-lg font-semibold mb-2">{t("praeventionLongevity.cgmTitle")}</h4>
              <p className="text-[#515757]/60 text-sm leading-relaxed">{t("praeventionLongevity.cgmDesc")}</p>
            </div>
          </div>

          <p className="text-[#43a9ab] text-base sm:text-lg font-medium mt-8">
            {t("praeventionLongevity.overlookedClosing")}
          </p>
        </div>
      </section>

      {/* So arbeiten wir - Intro */}
      <section ref={processAnim.ref} style={processAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-6 tracking-tight">
            {t("praeventionLongevity.systemLogicTitle")}
          </h2>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed">
            {t("praeventionLongevity.systemLogicBody")}
          </p>
        </div>
      </section>

      {/* So arbeiten wir - Scroll-driven video experience */}
      <section className="pt-4 sm:pt-8">
        <ScrollVideoExperience
          steps={processSteps}
          chapters={longevityChapters}
          isMobile={typeof window !== "undefined" && window.innerWidth < 768}
        />
      </section>

      {/* Systemlogik */}
      <section ref={systemAnim.ref} style={systemAnim.style} className="pt-16 sm:pt-24 px-5 sm:px-10">
        <div className="w-full max-w-7xl mx-auto">
          <h2 className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter text-left mb-6" style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}>
            {t("praeventionLongevity.mentoringTitle")}
          </h2>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed max-w-3xl">
            {t("praeventionLongevity.mentoringBody")}
          </p>
        </div>
        {isMobile ? (
          <FanCardsMobile cards={mentoringCards} title="" />
        ) : (
          <FanCards cards={mentoringCards} title="" />
        )}
      </section>

      {/* Diagnostik mit Sinn */}
      <section ref={diagnostikAnim.ref} style={diagnostikAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-3 tracking-tight">
            {t("praeventionLongevity.diagnostikTitle")}
          </h2>
          <p className="text-[#515757]/60 text-base sm:text-lg leading-relaxed mb-8">
            {t("praeventionLongevity.diagnostikSubtitle")}
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {diagnostikItems.map((item, i) => {
              const isOpen = openDiagnostik === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpenDiagnostik(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="text-left rounded-2xl border p-6 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#43a9ab]/40"
                  style={{
                    background: isOpen ? "rgba(67,169,171,0.08)" : "rgba(67,169,171,0.03)",
                    borderColor: isOpen ? "rgba(67,169,171,0.4)" : "rgba(67,169,171,0.15)",
                  }}
                >
                  <p className="text-[#515757] text-sm font-semibold mb-2">{item.trigger}</p>
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-3 h-3 text-[#43a9ab] flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="text-[#43a9ab] text-sm">{item.tool}</span>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"}`}
                  >
                    <p className="text-[#515757]/70 text-sm leading-relaxed">{item.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[#515757]/70 text-base leading-relaxed mb-4">
            {t("praeventionLongevity.diagnostikBody1")}
          </p>
          <p className="text-[#515757]/70 text-base leading-relaxed">
            {t("praeventionLongevity.diagnostikBody2")}
          </p>
        </div>
      </section>

      {/* Die Hebel */}
      <section ref={leversAnim.ref} style={leversAnim.style}>
        <HebelFlow
          data={hebelData}
          heading={t("praeventionLongevity.hebelHeading")}
          intro={t("praeventionLongevity.hebelIntro")}
          relatedLabel={t("praeventionLongevity.hebelRelatedLabel")}
        />
      </section>

      {/* So starten wir */}
      <section ref={startAnim.ref} style={startAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-12 tracking-tight">{t("praeventionLongevity.startTitle")}</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {startSteps.map((step) => (
              <div key={step.num} className="relative">
                <div className="text-5xl font-black text-[#43a9ab]/10 mb-3">{step.num}</div>
                <h4 className="text-[#515757] text-lg font-semibold mb-2">{step.title}</h4>
                <p className="text-[#515757]/60 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <a
              href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-[#43a9ab] text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-sm"
            >
              {t("praeventionLongevity.bookCta")}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Fuer wen */}
      <section ref={fitAnim.ref} style={fitAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-8 tracking-tight">{t("praeventionLongevity.fitTitle")}</h2>
          <div className="space-y-4">
            {fitItems.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full bg-[#43a9ab]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-[#43a9ab]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[#515757]/70 text-base sm:text-lg">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqAnim.ref} style={faqAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-10 tracking-tight">{t("praeventionLongevity.faqTitle")}</h2>
          <div className="border-t border-[#43a9ab]/10">
            {faqData.map((faq, i) => (
              <AccordionItem
                key={i}
                title={faq.q}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <p>{faq.a}</p>
              </AccordionItem>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section ref={ctaAnim.ref} style={ctaAnim.style} className="py-20 sm:py-28 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-[#43A9AB] font-black leading-[0.92] tracking-tighter mb-6"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)" }}
          >
            {t("praeventionLongevity.finalCtaTitle")}
          </h2>
          <p className="text-[#515757]/60 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            {t("praeventionLongevity.finalCtaBody")}
          </p>
          <a
            href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-[#43a9ab] text-white px-10 py-4 rounded-xl text-base font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-lg shadow-[#43a9ab]/20"
          >
            {t("praeventionLongevity.bookCta")}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}

export default PraeventionLongevity;
