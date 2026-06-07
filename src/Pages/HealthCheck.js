import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import SchwerpunkteGrid from "../Components/SchwerpunkteGrid";
import UnifiedBottomCta from "../Components/UnifiedBottomCta";
import Seo from "../Components/Seo";

function useScrollFadeIn() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return {
    ref,
    style: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translateY(0)" : "translateY(40px)",
      transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
    },
  };
}

const ChevronDown = ({ isOpen }) => (
  <svg className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const focusIcons = {
  tooth: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M12 2C9.5 2 7 3.5 7 6.5c0 2 .5 3.5 1 5.5.5 2 1 4.5 1 6.5 0 1 .5 2 1.5 2s1.5-1 1.5-2V16c0-.5.5-1 1-1s1 .5 1 1v2.5c0 1 .5 2 1.5 2s1.5-1 1.5-2c0-2 .5-4.5 1-6.5s1-3.5 1-5.5C18 3.5 15.5 2 12 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34M5 19l2-2M3 7c3.6-1.4 8-1 11 2 3 3 3.4 7.4 2 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function FocusCard({ title, items, icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl p-6 transition-all duration-300 border-2 cursor-pointer w-full ${
        isActive
          ? "bg-white border-[#43a9ab] shadow-lg scale-[1.02]"
          : "bg-white border-transparent shadow-sm hover:shadow-md hover:border-[#43a9ab]/20"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ${
        isActive ? "bg-[#e0f4f5] text-[#43a9ab]" : "bg-gray-100 text-gray-500"
      }`}>
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-[#515757] mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </button>
  );
}

function StepCard({ number, title, description, isLast }) {
  return (
    <div className="flex-1 relative">
      <div className="flex flex-col items-center text-center px-4">
        <div className="w-12 h-12 rounded-full bg-[#e0f4f5] text-[#43a9ab] flex items-center justify-center text-lg font-bold mb-4">
          {number}
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[#515757] mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
      {!isLast && (
        <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-[1px] bg-[#43a9ab]/20" />
      )}
    </div>
  );
}

function TestimonialCard({ quote, name }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-[280px] sm:w-[320px] flex-shrink-0 p-6 sm:p-7 flex flex-col justify-between select-none min-h-[220px]">
      <div>
        <div className="flex mb-3">
          {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">"{quote}"</p>
      </div>
      <p className="text-[#515757] font-semibold text-sm mt-4">{name}</p>
    </div>
  );
}

function AccordionItem({ title, children, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-200">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-5 sm:py-6 px-1 text-left focus:outline-none group cursor-pointer">
        <span className="text-base sm:text-lg font-medium text-[#515757] group-hover:text-[#422f40] transition-colors pr-4">{title}</span>
        <ChevronDown isOpen={isOpen} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100 pb-5" : "max-h-0 opacity-0"}`}>
        <div className="px-1 text-gray-600 text-sm sm:text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

const experienceChapters = [
  {
    video: "/Assets/videos/aerztliche-beratung.mp4",
    videoMob: "/Assets/videos/aerztliche-beratung.mp4",
  },
  {
    video: "/Assets/videos/stoffwechselanalyse.mp4",
    videoMob: "/Assets/videos/stoffwechselanalyse.mp4",
  },
  {
    video: "/Assets/videos/hrv-stressanalyse.mp4",
    videoMob: "/Assets/videos/hrv-stressanalyse.mp4",
  },
  {
    video: "/Assets/videos/naehrstoffanalyse.mp4",
    videoMob: "/Assets/videos/naehrstoffanalyse.mp4",
  },
  {
    video: "/Assets/videos/blutproben.mp4",
    videoMob: "/Assets/videos/blutproben.mp4",
  },
];

function ScrollVideoExperience({ steps, isMobile }) {
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

  // Play/pause videos
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

  // Clip-path: first 12% of scroll expands from rounded rect to fullscreen
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
          {/* Video layers */}
          {experienceChapters.map((chapter, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                opacity: i === activeChapter ? 1 : 0,
                transition: "opacity 0.8s ease",
              }}
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

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {/* Chapter text cards */}
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

          {/* Scroll hint — slow glimmer */}
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            style={{ opacity: 1, pointerEvents: "none" }}
          >
            <style>{`
              @keyframes glimmerDown {
                0%, 100% { opacity: 0; transform: translateY(-4px); }
                50% { opacity: 1; transform: translateY(4px); }
              }
              .scroll-glimmer { animation: glimmerDown 2.5s ease-in-out infinite; }
            `}</style>
            <svg className="w-6 h-6 text-white/50 scroll-glimmer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

function HealthCheck() {
  const { t } = useTranslation();
  const [activeFocus, setActiveFocus] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const includesAnim = useScrollFadeIn();
  const benefitsAnim = useScrollFadeIn();
  const faqAnim = useScrollFadeIn();

  const focusAreas = [
    {
      title: t("healthCheck.focus.darm.title"),
      items: t("healthCheck.focus.darm.items", { returnObjects: true }),
      icon: focusIcons.leaf,
    },
    {
      title: t("healthCheck.focus.psyche.title"),
      items: t("healthCheck.focus.psyche.items", { returnObjects: true }),
      icon: focusIcons.heart,
    },
    {
      title: t("healthCheck.focus.stoffwechsel.title"),
      items: t("healthCheck.focus.stoffwechsel.items", { returnObjects: true }),
      icon: focusIcons.scan,
    },
    {
      title: t("healthCheck.focus.leistung.title"),
      items: t("healthCheck.focus.leistung.items", { returnObjects: true }),
      icon: focusIcons.sparkle,
    },
    {
      title: t("healthCheck.focus.immun.title"),
      items: t("healthCheck.focus.immun.items", { returnObjects: true }),
      icon: focusIcons.shield,
    },
    {
      title: t("healthCheck.focus.praevention.title"),
      items: t("healthCheck.focus.praevention.items", { returnObjects: true }),
      icon: focusIcons.tooth,
    },
  ];

  const steps = [
    { title: t("healthCheck.steps.s1.title"), description: t("healthCheck.steps.s1.desc") },
    { title: t("healthCheck.steps.s2.title"), description: t("healthCheck.steps.s2.desc") },
    { title: t("healthCheck.steps.s3.title"), description: t("healthCheck.steps.s3.desc") },
    { title: t("healthCheck.steps.s4.title"), description: t("healthCheck.steps.s4.desc") },
    { title: t("healthCheck.steps.s5.title"), description: t("healthCheck.steps.s5.desc") },
  ];

  const faqs = [
    { title: t("healthCheck.faq.q1.title"), content: t("healthCheck.faq.q1.content") },
    { title: t("healthCheck.faq.q2.title"), content: t("healthCheck.faq.q2.content") },
    { title: t("healthCheck.faq.q3.title"), content: t("healthCheck.faq.q3.content") },
    { title: t("healthCheck.faq.q4.title"), content: t("healthCheck.faq.q4.content") },
    { title: t("healthCheck.faq.q5.title"), content: t("healthCheck.faq.q5.content") },
    { title: t("healthCheck.faq.q6.title"), content: t("healthCheck.faq.q6.content") },
  ];

  const benefits = [
    {
      icon: focusIcons.scan,
      title: t("healthCheck.benefits.b1.title"),
      desc: t("healthCheck.benefits.b1.desc"),
    },
    {
      icon: focusIcons.heart,
      title: t("healthCheck.benefits.b2.title"),
      desc: t("healthCheck.benefits.b2.desc"),
    },
    {
      icon: focusIcons.leaf,
      title: t("healthCheck.benefits.b3.title"),
      desc: t("healthCheck.benefits.b3.desc"),
    },
    {
      icon: focusIcons.shield,
      title: t("healthCheck.benefits.b4.title"),
      desc: t("healthCheck.benefits.b4.desc"),
    },
  ];

  return (
    <div className="bg-white min-h-screen">
      <Seo
        title={t("healthCheck.seoTitle")}
        description={t("healthCheck.seoDescription")}
      />

      {/* ── HERO — Sticky image left + scrolling sidebar right ── */}
      <section className="pt-40 sm:pt-44 px-5 sm:px-8 lg:px-16">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 lg:items-stretch">

            {/* Left — Sticky Image */}
            <div className="lg:w-[55%]">
              <div className="lg:sticky lg:top-28">
                <div className="w-full aspect-[10/9] rounded-2xl overflow-hidden bg-[#c4b8a8]">
                  <img src="/Assets/Diagnostik2.png" alt={t("healthCheck.heroImageAlt")} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Right — Scrolling content blocks */}
            <div className="lg:w-[40%] flex flex-col">

              {/* Block 1: Title + Price */}
              <div className="pb-10 sm:pb-14">
                <span className="inline-block text-xs font-semibold text-[#43a9ab] bg-[#e0f4f5] px-3 py-1 rounded-full mb-5 tracking-wide">
                  {t("healthCheck.hero.badge")}
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#43A9AB] mb-4 tracking-tight leading-[1.1]">
                  {t("healthCheck.hero.title")}
                </h1>
                <p className="text-gray-500 text-base leading-relaxed mb-6">
                  {t("healthCheck.hero.subtitle")}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-semibold text-[#43a9ab]">{t("healthCheck.hero.price")}</span>
                  <a
                    href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-[#43a9ab] text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-sm"
                  >
                    {t("healthCheck.hero.cta")}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Block 2: At a Glance */}
              <div className="border-t border-gray-200 py-8 sm:py-10">
                <h2 className="text-lg font-bold text-[#515757] mb-5">{t("healthCheck.glanceSection.title")}</h2>
                <div className="space-y-4">
                  {[
                    { icon: focusIcons.scan, label: t("healthCheck.glance.g1.title") },
                    { icon: focusIcons.heart, label: t("healthCheck.glance.g2.title") },
                    { icon: focusIcons.leaf, label: t("healthCheck.glance.g3.title") },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[#43a9ab] flex-shrink-0">{item.icon}</span>
                      <span className="text-sm text-[#515757]">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Block 3: Why Us */}
              <div className="border-t border-gray-200 py-8 sm:py-10">
                <h2 className="text-lg font-bold text-[#515757] mb-5">{t("healthCheck.whyUs.title")}</h2>
                <div className="space-y-4">
                  {[
                    { title: t("healthCheck.whyUs.w1.title"), desc: t("healthCheck.whyUs.w1.desc") },
                    { title: t("healthCheck.whyUs.w2.title"), desc: t("healthCheck.whyUs.w2.desc") },
                    { title: t("healthCheck.whyUs.w3.title"), desc: t("healthCheck.whyUs.w3.desc") },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-[#43a9ab] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-[#515757]/70">
                        <span className="font-semibold text-[#515757]">{item.title}.</span> {item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Block 4: Choose Your Focus */}
              <div className="border-t border-gray-200 py-8 sm:py-10">
                <h2 className="text-lg font-bold text-[#515757] mb-5">{t("healthCheck.focusSection.title")}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {focusAreas.map((area, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveFocus(i)}
                      className={`flex items-center gap-2.5 p-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                        activeFocus === i
                          ? "bg-white border-[#43a9ab] shadow-sm"
                          : "bg-transparent border-gray-200 hover:border-[#43a9ab]/30"
                      }`}
                    >
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        activeFocus === i ? "bg-[#e0f4f5] text-[#43a9ab]" : "bg-gray-100 text-gray-400"
                      }`}>
                        {area.icon}
                      </span>
                      <span className="text-xs font-medium text-[#515757] leading-tight">{area.title}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6">
                  <a
                    href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center bg-[#43a9ab] text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline"
                  >
                    {t("healthCheck.hero.cta")}
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── STEP BY STEP — Scroll-driven video experience ── */}
      <section className="pt-20 sm:pt-28">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#43A9AB]">
            {t("healthCheck.stepsSection.title")}
          </h2>
        </div>
        <ScrollVideoExperience steps={steps} isMobile={typeof window !== "undefined" && window.innerWidth < 768} />
      </section>

      {/* ── SCHWERPUNKTE GRID (9 cards) ── */}
      <SchwerpunkteGrid
        therapies={[
          {
            title: t("healthCheck.therapies.bia.title"),
            desc: t("healthCheck.therapies.bia.desc"),
            image: "/Assets/spezielle%20therapien/BIA.png",
          },
          {
            title: t("healthCheck.therapies.hrv.title"),
            desc: t("healthCheck.therapies.hrv.desc"),
            image: "/Assets/spezielle%20therapien/Stressanalyse%20HRV.png",
          },
          {
            title: t("healthCheck.therapies.genetik.title"),
            desc: t("healthCheck.therapies.genetik.desc"),
            image: "/Assets/spezielle%20therapien/GenetikandEpigenetik.png",
          },
          {
            title: t("healthCheck.therapies.naehrstoff.title"),
            desc: t("healthCheck.therapies.naehrstoff.desc"),
            image: "/Assets/spezielle%20therapien/Naehrstoffanalyse.png",
          },
          {
            title: t("healthCheck.therapies.labor.title"),
            desc: t("healthCheck.therapies.labor.desc"),
            image: "/Assets/spezielle%20therapien/Labor.png",
          },
          {
            title: t("healthCheck.therapies.darm.title"),
            desc: t("healthCheck.therapies.darm.desc"),
            image: "/Assets/spezielle%20therapien/Darmfunktion.png",
          },
          {
            title: t("healthCheck.therapies.schimmel.title"),
            desc: t("healthCheck.therapies.schimmel.desc"),
            image: "/Assets/spezielle%20therapien/SchimmelanaMykotoxine.png",
          },
          {
            title: t("healthCheck.therapies.schwermetalle.title"),
            desc: t("healthCheck.therapies.schwermetalle.desc"),
            image: "/Assets/spezielle%20therapien/Schwermetall%20Ausleitung.png",
          },
          {
            title: t("healthCheck.therapies.schlaf.title"),
            desc: t("healthCheck.therapies.schlaf.desc"),
            image: "/Assets/spezielle%20therapien/Schlafanalyse.png",
          },
        ]}
      />

      {/* ── EVERYTHING INCLUDED ── */}
      <section ref={includesAnim.ref} style={includesAnim.style} className="pt-28 sm:pt-40 pb-20 sm:pb-28 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #d4ece1 0%, #e0f4f5 30%, #d9f0e4 60%, #c8e6d8 100%)" }}>
            <div className="px-8 sm:px-14 py-12 sm:py-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-10 text-center">
                {t("healthCheck.includes.title")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    icon: focusIcons.heart,
                    title: t("healthCheck.includes.i2.title"),
                    desc: t("healthCheck.includes.i2.desc"),
                  },
                  {
                    icon: focusIcons.scan,
                    title: t("healthCheck.includes.i1.title"),
                    desc: t("healthCheck.includes.i1.desc"),
                  },
                  {
                    icon: focusIcons.leaf,
                    title: t("healthCheck.includes.i3.title"),
                    desc: t("healthCheck.includes.i3.desc"),
                  },
                  {
                    icon: focusIcons.sparkle,
                    title: t("healthCheck.includes.i4.title"),
                    desc: t("healthCheck.includes.i4.desc"),
                  },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/80 text-[#43a9ab] flex items-center justify-center mx-auto mb-4 shadow-sm">
                      {item.icon}
                    </div>
                    <h3 className="text-base font-bold text-[#515757] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#515757]/60 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US — 4 benefits — HIDDEN, keep for later ── */}
      {false && (
      <section ref={benefitsAnim.ref} style={benefitsAnim.style} className="pb-20 sm:pb-28 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#43A9AB] mb-4 text-center">
            {t("healthCheck.benefitsSection.title")}
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto text-center mb-12">
            {t("healthCheck.benefitsSection.subtitle")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#e0f4f5] text-[#43a9ab] flex items-center justify-center mx-auto mb-4">
                  {b.icon}
                </div>
                <h3 className="text-base font-bold text-[#515757] mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── FAQ — HIDDEN, keep for later ── */}
      {false && (
      <section ref={faqAnim.ref} style={faqAnim.style} className="pb-20 sm:pb-28 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#43A9AB] mb-10 text-center">
            {t("healthCheck.faqSection.title")}
          </h2>
          <div className="border-t border-gray-200">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} title={faq.title} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)}>
                <p>{faq.content}</p>
              </AccordionItem>
            ))}
          </div>
        </div>
      </section>
      )}

      <UnifiedBottomCta className="pb-20 sm:pb-28 px-5 sm:px-8 pt-8 sm:pt-12" />

    </div>
  );
}

export default HealthCheck;
