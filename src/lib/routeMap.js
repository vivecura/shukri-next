// src/lib/routeMap.js
//
// Single source of truth mapping German static URLs to English static URLs.
// Blog post URLs are NOT in here — they live in the DB (each post has its own slug per language).
//
// Format: { de: "/path-de", en: "/path-en" }

export const ROUTE_MAP = [
  { de: "/",                      en: "/en" },
  { de: "/ueber-mich",            en: "/en/about" },
  { de: "/spezielle-therapien",   en: "/en/special-therapies" },
  { de: "/diagnostik",            en: "/en/diagnostics" },
  { de: "/praevention-longevity", en: "/en/prevention-longevity" },
  { de: "/psychotherapie",        en: "/en/psychotherapy" },
  { de: "/koerperliche-symptome", en: "/en/physical-symptoms" },
  { de: "/infusions",             en: "/en/infusions" },
  { de: "/ketamin",               en: "/en/ketamine" },
  { de: "/beratung",              en: "/en/consultations" },
  { de: "/mentoring",             en: "/en/mentoring" },
  { de: "/mein-buch",             en: "/en/my-book" },
  { de: "/experience",            en: "/en/experience" },
  { de: "/blog",                  en: "/en/blog" },
  { de: "/rechtliches",           en: "/en/legal-notice" },
  { de: "/kontakt",               en: "/en/contact" },
  // Therapy detail pages (iframe-based static HTML pages)
  { de: "/therapien/ketamin",                 en: "/en/therapies/ketamine" },
  { de: "/therapien/schwermetall-ausleitung", en: "/en/therapies/heavy-metal-detox" },
  { de: "/therapien/schimmel-therapie",       en: "/en/therapies/mold-therapy" },
  { de: "/therapien/darm-reset",              en: "/en/therapies/gut-reset" },
  { de: "/therapien/hormone",                 en: "/en/therapies/hormones" },
  { de: "/therapien/burnout-fix",             en: "/en/therapies/burnout-fix" },
];

// Returns the language for a given pathname. EN if it starts with /en, otherwise DE.
export function detectLang(pathname) {
  if (!pathname) return "de";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "de";
}

// Translates a static-page URL between DE and EN. Returns null if not found.
// For blog posts, the caller must consult the DB instead.
export function translatePath(pathname, targetLang) {
  if (!pathname) return null;
  const sourceLang = detectLang(pathname);
  if (sourceLang === targetLang) return pathname;
  const entry = ROUTE_MAP.find((r) => r[sourceLang] === pathname);
  return entry ? entry[targetLang] : null;
}
