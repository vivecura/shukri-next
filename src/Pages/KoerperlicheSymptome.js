import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ScrolledLines from "../Components/ScrolledLines";
import SchwerpunkteGrid from "../Components/SchwerpunkteGrid";
import Seo from "../Components/Seo";

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

const includesIcons = {
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
  sparkle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const includesIconKeys = ["heart", "scan", "leaf", "sparkle"];

const ZITAT_WUNDERPILLE_CSS = `
.quote-wrap {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 900px;
  margin: 15vh auto 0;
  padding: 0 24px 24px;
}
.quote-box {
  position: relative;
  background: #ffffff;
  border: 1px solid rgba(67, 169, 171, 0.25);
  border-radius: 24px;
  padding: 64px 72px;
  overflow: hidden;
}
@media (max-width: 680px) {
  .quote-box { padding: 48px 36px; }
}
.quote-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 40px;
  bottom: 40px;
  width: 4px;
  background: linear-gradient(to bottom, transparent, #43A9AB 20%, #43A9AB 80%, transparent);
  border-radius: 0 4px 4px 0;
}
.quote-box::after {
  content: '';
  position: absolute;
  top: -120px;
  right: -120px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(67,169,171,0.06), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.quote-mark {
  font-size: 140px;
  line-height: 1;
  color: rgba(67, 169, 171, 0.12);
  font-family: Georgia, serif;
  position: absolute;
  top: 20px;
  left: 56px;
  pointer-events: none;
  user-select: none;
}
@media (max-width: 680px) {
  .quote-mark { font-size: 90px; left: 28px; }
}
.quote-text {
  font-size: clamp(20px, 2.6vw, 28px);
  font-weight: 600;
  line-height: 1.5;
  color: #1a1f24;
  letter-spacing: -0.015em;
  margin: 0 0 32px 0;
  position: relative;
  z-index: 1;
}
.quote-text em {
  font-style: normal;
  color: #43A9AB;
}
.quote-attr {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}
.quote-attr-line {
  width: 32px;
  height: 1.5px;
  background: rgba(67, 169, 171, 0.5);
  flex-shrink: 0;
}
.quote-attr-name {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #43A9AB;
}
.quote-attr-role {
  font-size: 13px;
  color: #9aa2a7;
  margin-left: 4px;
}
`;

function ZitatWunderpille() {
  const { t } = useTranslation();
  return (
    <div className="quote-wrap">
      <style>{ZITAT_WUNDERPILLE_CSS}</style>
      <figure className="quote-box">
        <span className="quote-mark">&ldquo;</span>
        <blockquote className="quote-text">
          {t("koerperlicheSymptome.quotePrefix")}
          <em>{t("koerperlicheSymptome.quoteEmphasis")}</em>
          {t("koerperlicheSymptome.quoteSuffix")}
        </blockquote>
      </figure>
    </div>
  );
}

function KoerperlicheSymptome() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);
  const perspectiveAnim = useScrollFadeIn();
  const approachAnim = useScrollFadeIn();
  const diagnostikAnim = useScrollFadeIn();
  const processAnim = useScrollFadeIn();
  const fitAnim = useScrollFadeIn();
  const faqAnim = useScrollFadeIn();
  const ctaAnim = useScrollFadeIn();

  const recognizeItems = t("koerperlicheSymptome.recognizeItems", { returnObjects: true });
  const includesItems = t("koerperlicheSymptome.includesItems", { returnObjects: true });
  const therapies = t("koerperlicheSymptome.therapies", { returnObjects: true });
  const therapyImages = [
    "/Assets/Bilder%206%20Kacheln/Ersch%C3%B6pfung.png",
    "/Assets/Bilder%206%20Kacheln/Darm.png",
    "/Assets/Bilder%206%20Kacheln/Schmerzen.png",
    "/Assets/Bilder%206%20Kacheln/Schlafprobleme.png",
    "/Assets/Bilder%206%20Kacheln/Kopfschmerz.png",
    "/Assets/Bilder%206%20Kacheln/Infektanf%C3%A4lligkeit.png",
  ];
  const fitItems = t("koerperlicheSymptome.fitItems", { returnObjects: true });
  const faqData = t("koerperlicheSymptome.faq", { returnObjects: true });
  const trustItems = t("koerperlicheSymptome.trustItems", { returnObjects: true });

  return (
    <div className="bg-white min-h-screen">
      <Seo
        title={t("koerperlicheSymptome.seoTitle")}
        description={t("koerperlicheSymptome.seoDescription")}
      />

      {/* Hero Image Banner */}
      <HeroBanner
        image="/Assets/KoerperlicheBeschwerden.png"
        badge={t("koerperlicheSymptome.heroBadge")}
        title={
          <>
            {t("koerperlicheSymptome.heroTitlePrefix")}
            <em className="italic">{t("koerperlicheSymptome.heroTitleEmphasis")}</em>
          </>
        }
        subtitle={t("koerperlicheSymptome.heroSubtitle")}
        ctaText={t("koerperlicheSymptome.heroCta")}
        ctaHref="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
        trustItems={trustItems}
      />

      {/* Vielleicht kennst du das */}
      <ScrolledLines lines={recognizeItems} title={t("koerperlicheSymptome.recognizeTitle")} />
      <ZitatWunderpille />

      {/* Perspektivwechsel */}
      <section ref={perspectiveAnim.ref} style={perspectiveAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-12"
            style={{ background: "linear-gradient(135deg, rgba(67,169,171,0.06) 0%, rgba(67,169,171,0.02) 100%)" }}
          >
            <div className="text-[10px] font-light tracking-[3px] uppercase text-[#43a9ab]/60 mb-4">
              {t("koerperlicheSymptome.perspectiveLabel")}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#43A9AB] mb-6">{t("koerperlicheSymptome.perspectiveTitle")}</h3>
            <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed mb-4">
              {t("koerperlicheSymptome.perspectiveP1")}
            </p>
            <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed mb-4">
              {t("koerperlicheSymptome.perspectiveP2")}
            </p>
            <p className="text-[#515757] text-base sm:text-lg leading-relaxed font-medium">
              {t("koerperlicheSymptome.perspectiveP3")}
            </p>
          </div>
        </div>
      </section>

      {/* So arbeite ich anders */}
      <section ref={approachAnim.ref} style={approachAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-6 tracking-tight">
            {t("koerperlicheSymptome.approachTitle")}
          </h2>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed mb-4">
            {t("koerperlicheSymptome.approachP1")}
          </p>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed">
            {t("koerperlicheSymptome.approachP2")}
          </p>
        </div>
      </section>

      {/* Themen-Cluster */}
      <SchwerpunkteGrid
        title=""
        therapies={therapies.map((th, i) => ({ ...th, image: therapyImages[i] }))}
      />
      <div className="max-w-7xl mx-auto px-5 sm:px-10 pb-16 sm:pb-20">
        <a
          href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center bg-[#43a9ab] text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-sm"
        >
          {t("koerperlicheSymptome.improvementCta")}
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      {/* Diagnostik */}
      <section ref={diagnostikAnim.ref} style={diagnostikAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] font-light tracking-[3px] uppercase text-[#43a9ab]/60 mb-4">
            {t("koerperlicheSymptome.diagnostikLabel")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-6 tracking-tight">
            {t("koerperlicheSymptome.diagnostikTitle")}
          </h2>
          <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed mb-6">
            {t("koerperlicheSymptome.diagnostikP1")}
          </p>

          <div className="rounded-2xl border border-[#43a9ab]/15 p-6 sm:p-8 mt-8" style={{ background: "rgba(67,169,171,0.03)" }}>
            <div className="text-[10px] font-light tracking-[3px] uppercase text-[#43a9ab]/60 mb-3">{t("koerperlicheSymptome.exampleLabel")}</div>
            <p className="text-[#515757]/70 text-base leading-relaxed mb-3">
              {t("koerperlicheSymptome.exampleP1")}
            </p>
            <p className="text-[#515757]/70 text-base leading-relaxed">
              {t("koerperlicheSymptome.exampleP2Prefix")}
              <em>{t("koerperlicheSymptome.exampleP2Em1")}</em>
              {t("koerperlicheSymptome.exampleP2Mid")}
              <em>{t("koerperlicheSymptome.exampleP2Em2")}</em>
              {t("koerperlicheSymptome.exampleP2Suffix")}
            </p>
          </div>
        </div>
      </section>

      {/* Alles was du brauchst in einem Termin */}
      <section ref={processAnim.ref} style={processAnim.style} className="pt-16 sm:pt-24 pb-20 sm:pb-28 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #d4ece1 0%, #e0f4f5 30%, #d9f0e4 60%, #c8e6d8 100%)" }}>
            <div className="px-8 sm:px-14 py-12 sm:py-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-10 text-center">
                {t("koerperlicheSymptome.includesTitle")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {includesItems.map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/80 text-[#43a9ab] flex items-center justify-center mx-auto mb-4 shadow-sm">
                      {includesIcons[includesIconKeys[i]]}
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

      {/* F&uuml;r wen */}
      <section ref={fitAnim.ref} style={fitAnim.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-8 tracking-tight">{t("koerperlicheSymptome.fitTitle")}</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] mb-10 tracking-tight">{t("koerperlicheSymptome.faqTitle")}</h2>
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
            {t("koerperlicheSymptome.ctaTitle")}
          </h2>
          <p className="text-[#515757]/60 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            {t("koerperlicheSymptome.ctaSubtitle")}
          </p>
          <a
            href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-[#43a9ab] text-white px-10 py-4 rounded-xl text-base font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-lg shadow-[#43a9ab]/20"
          >
            {t("koerperlicheSymptome.ctaButton")}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}

export default KoerperlicheSymptome;
