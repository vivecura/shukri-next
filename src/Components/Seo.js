import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { detectLang, translatePath } from "../lib/routeMap";

const SITE_URL = "https://vivecura.com";
const DEFAULT_IMAGE = `${SITE_URL}/Assets/logo6.png`;
const SITE_NAME = "ViveCura";

function Seo({
  title,
  description,
  path,
  image,
  type = "website",
  // For blog posts: provide both DE and EN URL paths so hreflang can be emitted.
  // If omitted, hreflang is computed from the static routeMap.
  paths,
}) {
  const location = useLocation();
  const currentPath = path || location.pathname;
  const lang = detectLang(currentPath);

  const fullTitle = title
    ? `${title} – ${SITE_NAME}`
    : lang === "en"
      ? `${SITE_NAME} – Functional Medicine, Prevention & Longevity in Berlin`
      : `${SITE_NAME} – Funktionelle Medizin, Prävention & Longevity in Berlin`;

  const url = `${SITE_URL}${currentPath}`;
  const ogImage = image || DEFAULT_IMAGE;

  // hreflang pairs
  const dePath = paths?.de || (lang === "de" ? currentPath : translatePath(currentPath, "de"));
  const enPath = paths?.en || (lang === "en" ? currentPath : translatePath(currentPath, "en"));

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />

      {dePath && <link rel="alternate" hrefLang="de" href={`${SITE_URL}${dePath}`} />}
      {enPath && <link rel="alternate" hrefLang="en" href={`${SITE_URL}${enPath}`} />}
      {dePath && <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${dePath}`} />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={lang === "en" ? "en_US" : "de_DE"} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

export default Seo;
