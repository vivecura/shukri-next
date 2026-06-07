import { useRef, useState, useEffect } from "react";
import Shukr from "../Assets/Shukr.jpg";
import Seo from "../Components/Seo";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import useLanguage from "../hooks/useLanguage";

function useScrollFadeIn(delay = 0) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return {
    ref,
    style: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.9s ease-out ${delay}s, transform 0.9s ease-out ${delay}s`,
    },
  };
}

function UeberMich() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const heroText = useScrollFadeIn(0.1);
  const section1 = useScrollFadeIn(0);
  const pullQuote1 = useScrollFadeIn(0);
  const section2 = useScrollFadeIn(0);
  const section3 = useScrollFadeIn(0);
  const pullQuote2 = useScrollFadeIn(0);
  const section4 = useScrollFadeIn(0);
  const section5 = useScrollFadeIn(0);
  const closing = useScrollFadeIn(0);

  return (
    <div className="bg-white min-h-screen">
      <Seo
        title={t("ueberMich.seoTitle")}
        description={t("ueberMich.seoDescription")}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Dr. Shukri Jarmoukli",
            jobTitle: "Arzt für funktionelle Medizin und Longevity",
            worksFor: { "@type": "MedicalClinic", name: "ViveCura", url: "https://vivecura.com" },
            url: "https://vivecura.com/ueber-mich",
            image: "https://vivecura.com/Assets/%C3%9Cber%20mich.png",
            sameAs: [
              "https://www.instagram.com/vivecura/",
              "https://www.linkedin.com/in/shukri-jarmoukli/",
              "https://www.tiktok.com/@shukri.jarmoukli",
              "https://www.youtube.com/@shukrijarmoukli",
            ],
          })}
        </script>
      </Helmet>

      {/* Hero — Text + Portrait side by side */}
      <section className="pt-36 sm:pt-44 pb-16 sm:pb-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 lg:items-center">
            <div className="lg:w-[55%]">
              <span className="inline-block text-xs font-semibold text-white bg-[#43A9AB] px-3 py-1 rounded-full mb-6 tracking-wide">
                {t("ueberMich.heroBadge")}
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#43A9AB] tracking-tight leading-[1.08] mb-8">
                {t("ueberMich.heroTitle")}
              </h1>
              <div ref={heroText.ref} style={heroText.style}>
                <p className="text-xl sm:text-2xl font-medium text-[#515757] leading-relaxed">
                  {t("ueberMich.heroLead")}
                </p>
              </div>
            </div>
            <div className="lg:w-[40%]">
              <div className="rounded-2xl overflow-hidden">
                <img src="/Assets/%C3%9Cber%20mich.png" alt="Dr. Shukri" className="w-full h-auto object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="h-px bg-[#515757]/10" />
      </div>

      {/* Section 1 — Philosophy */}
      <section ref={section1.ref} style={section1.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section1Para")}
          </p>
        </div>
      </section>

      {/* Pull Quote */}
      <section ref={pullQuote1.ref} style={pullQuote1.style} className="px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="border-l-4 border-[#43a9ab] pl-6 sm:pl-8 py-4">
            <p className="text-xl sm:text-2xl font-medium text-[#515757] leading-relaxed italic">
              {t("ueberMich.pullQuote1")}
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — Personal Story */}
      <section ref={section2.ref} style={section2.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section2Para")}
          </p>
        </div>
      </section>

      {/* Section 3 — Transformation */}
      <section ref={section3.ref} style={section3.style} className="pb-16 sm:pb-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#43A9AB] tracking-tight mb-2">
            {t("ueberMich.section3Heading")}
          </h2>
        </div>
      </section>

      {/* Pull Quote 2 — Cold */}
      <section ref={pullQuote2.ref} style={pullQuote2.style} className="px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl px-8 sm:px-12 py-10 sm:py-14" style={{ backgroundColor: "#43A9AB" }}>
            <p className="text-lg sm:text-xl text-white leading-relaxed">
              <strong>{t("ueberMich.coldQuoteBold")}</strong> {t("ueberMich.coldQuoteRest")}
            </p>
            <p className="text-base sm:text-lg text-white/70 leading-relaxed mt-4">
              {t("ueberMich.coldQuoteSecondary")}
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 — Integrative Approach */}
      <section ref={section4.ref} style={section4.style} className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section4Para1")}
          </p>
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section4Para2")}
          </p>
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section4Para3")}
          </p>
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section4Para4")}
          </p>
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section4Para5")}
          </p>
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section4Para6")}
          </p>
        </div>
      </section>

      {/* Section 5 — Experience */}
      <section ref={section5.ref} style={section5.style} className="pb-16 sm:pb-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
            {t("ueberMich.section5Para")}
          </p>
        </div>
      </section>

      {/* Closing Statement */}
      <section ref={closing.ref} style={closing.style} className="pb-24 sm:pb-36 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="border-t border-[#515757]/10 pt-12 space-y-6">
            <p className="text-xl sm:text-2xl font-medium text-[#515757] leading-relaxed">
              {t("ueberMich.closingPart1")}<em>{t("ueberMich.closingEmphasis")}</em>{t("ueberMich.closingPart2")}
            </p>
            <p className="text-base sm:text-lg text-[#515757]/80 leading-relaxed">
              {t("ueberMich.closingSocialsLead")}
            </p>
            <div className="pt-2">
              <a
                href={lang === "en" ? "/ueber-mich_Vivecura_v4-en.html" : "/ueber-mich_Vivecura_v4.html"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-[#43a9ab] text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-sm"
              >
                {t("ueberMich.moreButton")}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
            <div className="pt-6">
              <p className="text-sm font-semibold tracking-[2px] uppercase text-[#43a9ab] mb-4">
                {t("ueberMich.followMe")}
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="https://www.instagram.com/vivecura/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-[#515757]/50 hover:text-[#43a9ab] transition-colors duration-200"
                >
                  <svg className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/shukri-jarmoukli/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-[#515757]/50 hover:text-[#43a9ab] transition-colors duration-200"
                >
                  <svg className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="3" />
                    <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 014 0v4M11 10v7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@shukri.jarmoukli"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-[#515757]/50 hover:text-[#43a9ab] transition-colors duration-200"
                >
                  <svg className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/@shukrijarmoukli"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="text-[#515757]/50 hover:text-[#43a9ab] transition-colors duration-200"
                >
                  <svg className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="16" rx="4" />
                    <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default UeberMich;
