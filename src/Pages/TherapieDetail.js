import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useLanguage from "../hooks/useLanguage";
import Seo from "../Components/Seo";

// Each entry holds DE+EN slugs and DE+EN HTML paths.
// Lookup accepts either the DE or the EN slug, so the same /therapien/:slug
// (DE) and /en/therapies/:slug (EN) routes both resolve correctly.
const therapies = [
  {
    titleKey: "therapieDetail.titles.ketamin",
    descriptionKey: "therapieDetail.descriptions.ketamin",
    slugDe: "ketamin",
    slugEn: "ketamine",
    htmlDe: "/therapien-html/ketamin.html",
    htmlEn: "/therapien-html/ketamine-en.html",
  },
  {
    titleKey: "therapieDetail.titles.schwermetall",
    descriptionKey: "therapieDetail.descriptions.schwermetall",
    slugDe: "schwermetall-ausleitung",
    slugEn: "heavy-metal-detox",
    htmlDe: "/therapien-html/schwermetall-ausleitung.html",
    htmlEn: "/therapien-html/heavy-metal-detox-en.html",
  },
  {
    titleKey: "therapieDetail.titles.schimmel",
    descriptionKey: "therapieDetail.descriptions.schimmel",
    slugDe: "schimmel-therapie",
    slugEn: "mold-therapy",
    htmlDe: "/therapien-html/schimmel-therapie.html",
    htmlEn: "/therapien-html/mold-therapy-en.html",
  },
  {
    titleKey: "therapieDetail.titles.darmreset",
    descriptionKey: "therapieDetail.descriptions.darmreset",
    slugDe: "darm-reset",
    slugEn: "gut-reset",
    htmlDe: "/therapien-html/darm-reset.html",
    htmlEn: "/therapien-html/gut-reset-en.html",
  },
  {
    titleKey: "therapieDetail.titles.hormone",
    descriptionKey: "therapieDetail.descriptions.hormone",
    slugDe: "hormone",
    slugEn: "hormones",
    htmlDe: "/therapien-html/hormone.html",
    htmlEn: "/therapien-html/hormones-en.html",
  },
  {
    titleKey: "therapieDetail.titles.burnout",
    descriptionKey: "therapieDetail.descriptions.burnout",
    slugDe: "burnout-fix",
    slugEn: "burnout-fix",
    htmlDe: "/therapien-html/burnout-fix.html",
    htmlEn: "/therapien-html/burnout-fix-en.html",
  },
];

function findTherapy(slug) {
  return therapies.find((t) => t.slugDe === slug || t.slugEn === slug) || null;
}

export default function TherapieDetail() {
  const { slug } = useParams();
  const therapy = findTherapy(slug);
  const iframeRef = useRef(null);
  const [height, setHeight] = useState("100vh");
  const { t } = useTranslation();
  const lang = useLanguage();
  const homePath = lang === "en" ? "/en" : "/";
  const htmlSrc = therapy ? (lang === "en" ? therapy.htmlEn : therapy.htmlDe) : null;
  const title = therapy ? t(therapy.titleKey) : "";
  const description = therapy ? t(therapy.descriptionKey) : "";

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.body) {
          setHeight(doc.documentElement.scrollHeight + "px");
        }
      } catch {}
    };
    iframe.addEventListener("load", resize);
    const interval = setInterval(resize, 500);
    return () => {
      iframe.removeEventListener("load", resize);
      clearInterval(interval);
    };
  }, [slug, lang]);

  if (!therapy) {
    return (
      <div className="bg-white min-h-screen pt-32 px-6 text-center">
        <h1 className="text-3xl font-bold text-[#515757]">{t("therapieDetail.notFound")}</h1>
        <Link to={homePath} className="text-[#43a9ab] mt-4 inline-block">{t("therapieDetail.toHome")}</Link>
      </div>
    );
  }

  if (!htmlSrc) {
    return (
      <div className="bg-white min-h-screen pt-24 pb-20">
        <Seo title={title} description={description} />
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl font-black text-[#43A9AB] tracking-tighter mb-6">
            {title}
          </h1>
          <p className="text-[#515757]/70 text-lg leading-relaxed mb-10">
            {t("therapieDetail.placeholder")}
          </p>
          <Link
            to={homePath}
            className="inline-block px-6 py-3 rounded-full bg-[#43a9ab] text-white font-semibold hover:bg-[#378f91] transition-colors no-underline"
          >
            {t("therapieDetail.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white pt-20">
      <Seo title={title} description={description} />
      <iframe
        ref={iframeRef}
        src={htmlSrc}
        title={title}
        style={{ width: "100%", border: "none", height }}
      />
    </div>
  );
}
