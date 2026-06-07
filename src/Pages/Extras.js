import { useEffect, useRef, useState } from "react";
import ScrolledLines from "../Components/ScrolledLines";
import ScrollVideoExperience from "../Components/ScrollVideoExperience";
import { Link } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile";
import useLanguage from "../hooks/useLanguage";
import Seo from "../Components/Seo";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

function KetaminHero() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const sublines = t("extras.sublines", { returnObjects: true });
  const whyUs = t("extras.whyUs", { returnObjects: true });
  const heroImage = isMobile
    ? "/Assets/Ketamin%20Bild%20Jonas%20Hochkant%20AI.png"
    : "/Assets/Ketamin%20Infusion%20Bild%20Jonas%20AI%20.png";
  return (
    <section className="px-5 sm:px-8 lg:px-16 pt-8 sm:pt-12 pb-10 sm:pb-16 relative z-10">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 lg:items-stretch">
          <div className="lg:w-[55%]">
            <div className="lg:sticky lg:top-28">
              <div className={`w-full ${isMobile ? "aspect-[3/4]" : "aspect-[10/9]"} rounded-2xl overflow-hidden bg-[#c4b8a8]`}>
                <img
                  src={heroImage}
                  alt={t("extras.heroImageAlt")}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="lg:w-[40%] flex flex-col">
            <div className="pb-10 sm:pb-14">
              <span className="inline-block text-xs font-semibold text-[#43a9ab] bg-[#e0f4f5] px-3 py-1 rounded-full mb-5 tracking-wide">
                {t("extras.heroBadge")}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#43A9AB] mb-5 tracking-tight leading-[1.1]">
                {t("extras.heroTitle")}
              </h2>
              <ul className="space-y-2.5 mb-8">
                {sublines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[#515757]/80 text-base leading-relaxed">
                    <span className="text-[#43a9ab] mt-1">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <a
                href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-[#43a9ab] text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-sm"
              >
                {t("extras.heroBookNow")}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            <div className="border-t border-gray-200 py-8 sm:py-10">
              <h3 className="text-lg font-bold text-[#515757] mb-5">{t("extras.whyUsTitle")}</h3>
              <div className="space-y-4">
                {whyUs.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#43a9ab] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-semibold text-[#515757]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KetaminCTA() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const blogLink = lang === "en" ? "/en/blog/ketamin-therapie" : "/blog/ketamin-therapie";
  return (
    <section className="py-16 sm:py-24 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <span className="inline-block text-xs font-semibold text-[#43a9ab] bg-[#e0f4f5] px-3 py-1 rounded-full mb-5 tracking-[0.2em] uppercase">
          {t("extras.ctaBadge")}
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#43A9AB] tracking-tight mb-5">
          {t("extras.ctaTitle")}
        </h2>
        <p className="text-[#515757]/70 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-10">
          {t("extras.ctaSubtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#43a9ab] text-white px-7 py-3.5 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#389193] transition-colors duration-200 no-underline shadow-sm"
          >
            {t("extras.ctaBookButton")}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
          <Link
            to={blogLink}
            className="inline-flex items-center justify-center gap-2 border border-[#43a9ab] text-[#43a9ab] px-7 py-3.5 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#43a9ab]/5 transition-colors duration-200 no-underline"
          >
            {t("extras.ctaBlogButton")}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
        <p className="text-[#515757]/50 text-sm mt-8 max-w-lg mx-auto leading-relaxed">
          {t("extras.ctaFootnote")}
        </p>
      </div>
    </section>
  );
}

function KetaminFAQ() {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = useState(null);
  const faqItems = t("extras.faqItems", { returnObjects: true });
  return (
    <section className="py-16 sm:py-20 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#43A9AB] tracking-tight mb-10 sm:mb-12">
          {t("extras.faqTitle")}
        </h2>
        <div className="border-t border-gray-200">
          {faqItems.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} className="border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-5 sm:py-6 text-left focus:outline-none group"
                >
                  <span className="text-base sm:text-lg font-semibold text-[#515757] group-hover:text-[#43a9ab] transition-colors pr-4">
                    {item.q}
                  </span>
                  <svg
                    className={`w-5 h-5 text-[#43a9ab] flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-[800px] opacity-100 pb-5 sm:pb-6" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-sm sm:text-base text-[#515757]/80 leading-relaxed pr-10">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function IframeSection({ mobileSrc, desktopSrc, title }) {
  const isMobile = useIsMobile();
  const iframeRef = useRef(null);
  const [height, setHeight] = useState("600px");
  const src = isMobile ? mobileSrc : desktopSrc;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.body) setHeight(doc.documentElement.scrollHeight + "px");
      } catch {}
    };
    iframe.addEventListener("load", resize);
    const interval = setInterval(resize, 500);
    return () => {
      iframe.removeEventListener("load", resize);
      clearInterval(interval);
    };
  }, [src]);

  return (
    <section className="bg-white">
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        style={{ width: "100%", border: "none", height }}
      />
    </section>
  );
}

function Extras() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const isMobile = useIsMobile();
  const iframeSuffix = lang === "en" ? "-en" : "";
  const ketaminLines = t("extras.ketaminLines", { returnObjects: true });
  const warumChaptersTranslated = t("extras.warumChapters", { returnObjects: true });
  const warumChapters = [
    {
      title: warumChaptersTranslated[0].title,
      description: warumChaptersTranslated[0].description,
      video: "/Assets/videos/aerztliche-beratung.mp4",
    },
    {
      title: warumChaptersTranslated[1].title,
      description: warumChaptersTranslated[1].description,
      video: "/Assets/videos/stoffwechselanalyse.mp4",
    },
    {
      title: warumChaptersTranslated[2].title,
      description: warumChaptersTranslated[2].description,
      video: "/Assets/videos/hrv-stressanalyse.mp4",
    },
    {
      title: warumChaptersTranslated[3].title,
      description: warumChaptersTranslated[3].description,
      video: "/Assets/videos/naehrstoffanalyse.mp4",
    },
    {
      title: warumChaptersTranslated[4].title,
      description: warumChaptersTranslated[4].description,
      video: "/Assets/videos/blutproben.mp4",
    },
  ];
  const schemaFaq = t("extras.schemaFaq", { returnObjects: true });
  return (
    <div className="bg-white min-h-screen pt-20">
      <Seo
        title={t("extras.seoTitle")}
        description={t("extras.seoDescription")}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: schemaFaq.map((item) => ({
              "@type": "Question",
              name: item.name,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.text,
              },
            })),
          })}
        </script>
      </Helmet>
      {/* <ScrolledLines lines={ketaminLines} title={t("extras.scrolledLinesTitle")} /> */}
      <KetaminHero />
      <IframeSection
        title={t("extras.iframeTitleDreiRaeume")}
        mobileSrc={`/html/drei_raeume_mobile${iframeSuffix}.html`}
        desktopSrc={`/html/drei_raeume_desktop${iframeSuffix}.html`}
      />
      <IframeSection
        title={t("extras.iframeTitleVerstehenErleben")}
        mobileSrc={`/html/verstehen_vs_erleben_mobile${iframeSuffix}.html`}
        desktopSrc={`/html/verstehen_vs_erleben_desktop${iframeSuffix}.html`}
      />
      <IframeSection
        title={t("extras.iframeTitleIndikationen")}
        mobileSrc={`/html/indikationen_mobile${iframeSuffix}.html`}
        desktopSrc={`/html/indikationen_desktop${iframeSuffix}.html`}
      />
      <IframeSection
        title={t("extras.iframeTitleAblauf")}
        mobileSrc={`/html/ablauf_mobile${iframeSuffix}.html`}
        desktopSrc={`/html/ablauf_desktop${iframeSuffix}.html`}
      />
      <section className="pt-20 sm:pt-28">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#43A9AB]">
            {t("extras.warumTitle")}
          </h2>
        </div>
        <ScrollVideoExperience chapters={warumChapters} isMobile={isMobile} />
      </section>
      <KetaminFAQ />
      <KetaminCTA />
    </div>
  );
}

export default Extras;
