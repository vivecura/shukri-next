// src/lib/topics.js
//
// Curated list of blog topics. To add a topic:
//   1. Append an entry below (slug is the DE-canonical id stored in blog_posts.topics)
//   2. Add the topic page to scripts/build-sitemap.js
//   3. Tag the relevant articles in /admin
//
// Topics are stored on the DE row of blog_posts; the EN translation
// inherits them via translation_of (same pattern as pinned/featured_on_home).

export const TOPICS = [
  { slug: "ketamin",                slug_en: "ketamine",          de: "Ketamin",                en: "Ketamine",         image: "/Assets/Spezielle%20Therapien2/Ketamin%20Therapie.png" },
  { slug: "schwermetallentgiftung", slug_en: "heavy-metal-detox", de: "Schwermetallentgiftung", en: "Heavy Metal Detox", image: "/Assets/Spezielle%20Therapien2/Schwermetall%20Ausleitung.png" },
  { slug: "schimmel",               slug_en: "mold",              de: "Schimmel",               en: "Mold",             image: "/Assets/Spezielle%20Therapien2/Schimmel%20Therapie.png" },
  { slug: "darmsanierung",          slug_en: "gut-reset",         de: "Darmsanierung",          en: "Gut Reset",        image: "/Assets/Spezielle%20Therapien2/Darm%20Reset.png" },
  { slug: "hormone",                slug_en: "hormones",          de: "Hormone",                en: "Hormones",         image: "/Assets/Spezielle%20Therapien2/Hormone.png" },
  { slug: "burnout",                slug_en: "burnout",           de: "Burnout",                en: "Burnout",          image: "/Assets/Spezielle%20Therapien2/Burnout_Fix_.png" },
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
