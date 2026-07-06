// src/lib/topics.js
//
// Curated list of blog topics. To add a topic:
//   1. Append an entry below (slug is the DE-canonical id stored in blog_posts.topics)
//   2. Tag the relevant articles in /admin
//
// The sitemap (src/app/sitemap.js) and the topic pages
// (src/app/blog/thema/[slug]) derive from TOPICS automatically, so no other
// file needs to be touched when adding a topic.
//
// Topics are stored on the DE row of blog_posts; the EN translation
// inherits them via translation_of (same pattern as pinned/featured_on_home).

export const TOPICS = [
  { slug: "ketamin",                slug_en: "ketamine",          de: "Ketamin",                en: "Ketamine",         image: "/Assets/Spezielle%20Therapien2/Ketamin%20Therapie.png" },
  { slug: "schwermetallentgiftung", slug_en: "heavy-metal-detox", de: "Schwermetallentgiftung", en: "Heavy Metal Detox", image: "/Assets/Spezielle%20Therapien2/Schwermetall%20Ausleitung.png" },
  { slug: "schimmel",               slug_en: "mold",              de: "Schimmel",               en: "Mold",             image: "/Assets/Spezielle%20Therapien2/Schimmel%20Therapie.png" },
  { slug: "darmsanierung",          slug_en: "gut-reset",         de: "Darmsanierung",          en: "Gut Reset",        image: "/Assets/Spezielle%20Therapien2/Darm%20Reset.png" },
  { slug: "hormone",                slug_en: "hormones",          de: "Hormone",                en: "Hormones",         image: "/Assets/Spezielle%20Therapien2/Hormone%20v2.png" },
  { slug: "burnout",                slug_en: "burnout",           de: "Burnout",                en: "Burnout",          image: "/Assets/Spezielle%20Therapien2/Burnout_Fix_.png" },
  { slug: "schlaf",                 slug_en: "sleep",             de: "Schlaf",                 en: "Sleep",            image: "/Assets/Spezielle%20Therapien2/Schlaf.png" },
  { slug: "eisen",                  slug_en: "iron",              de: "Eisen",                  en: "Iron",             image: "/Assets/Spezielle%20Therapien2/Eisen.png" },
  { slug: "abnehmen",               slug_en: "weight-loss",       de: "Abnehmen",               en: "Weight Loss",      image: "/Assets/Spezielle%20Therapien2/Abnehmen.png" },
  { slug: "ernaehrung",             slug_en: "nutrition",         de: "Ernährung",              en: "Nutrition",        image: "/Assets/Spezielle%20Therapien2/Ernaehrung.png" },
  { slug: "sport",                  slug_en: "exercise",          de: "Sport",                  en: "Exercise",         image: "/Assets/Spezielle%20Therapien2/Sport.png" },
  { slug: "fasten",                 slug_en: "fasting",           de: "Fasten",                 en: "Fasting",          image: "/Assets/Spezielle%20Therapien2/Fasten.png" },
  { slug: "nahrungsergaenzung",     slug_en: "supplements",       de: "Nahrungsergänzung",      en: "Supplements",      image: "/Assets/Spezielle%20Therapien2/Nahrungsergaenzung.png" },
  { slug: "heilpflanzen",           slug_en: "herbal-medicine",   de: "Heilpflanzen",           en: "Herbal Medicine",  image: "/Assets/Spezielle%20Therapien2/Heilpflanzen.png" },
  { slug: "entgiftung",             slug_en: "detox",             de: "Entgiftung",             en: "Detox",            image: "/Assets/Spezielle%20Therapien2/Entgiftung.png" },
  { slug: "naturkraefte",           slug_en: "natural-forces",    de: "Naturkräfte",            en: "Natural Forces",   image: "/Assets/Spezielle%20Therapien2/Naturkraefte.png" },
  { slug: "schilddruese",           slug_en: "thyroid",           de: "Schilddrüse",            en: "Thyroid",          image: "/Assets/Spezielle%20Therapien2/Schilddruese.png" },
];

// Lookup by the canonical DE slug (the form stored in Supabase).
export function getTopicBySlug(slug) {
  return TOPICS.find((t) => t.slug === slug) || null;
}

// Lookup by the EN-URL slug (for the /en/blog/topic/:slug route).
export function getTopicByEnSlug(slugEn) {
  return TOPICS.find((t) => t.slug_en === slugEn) || null;
}

// Display label for the current UI language.
export function getTopicLabel(topic, lang) {
  if (!topic) return "";
  return lang === "en" ? topic.en : topic.de;
}

// URL slug for the current UI language (DE uses slug, EN uses slug_en).
export function getTopicUrlSlug(topic, lang) {
  if (!topic) return "";
  return lang === "en" ? topic.slug_en : topic.slug;
}

// Build the topic page URL for a given topic + language.
export function buildTopicUrl(topic, lang) {
  if (!topic) return lang === "en" ? "/en/blog" : "/blog";
  return lang === "en"
    ? `/en/blog/topic/${topic.slug_en}`
    : `/blog/thema/${topic.slug}`;
}
