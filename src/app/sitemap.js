import { fetchAllPublishedPostsForSitemap } from "@/lib/blogQueries.server";
import { ROUTE_MAP } from "@/lib/routeMap";
import { TOPICS } from "@/lib/topics";

const SITE_URL = "https://vivecura.com";

export default async function sitemap() {
  const entries = [];

  // 1. Static routes (DE + EN) with reciprocal hreflang alternates.
  // Both language entries advertise the same {de, en, x-default} set so the
  // pair is mutually referenced. x-default points at the DE (canonical) URL.
  for (const r of ROUTE_MAP) {
    const languages = {
      de: `${SITE_URL}${r.de}`,
      en: `${SITE_URL}${r.en}`,
      "x-default": `${SITE_URL}${r.de}`,
    };
    entries.push({
      url: `${SITE_URL}${r.de}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: r.de === "/" ? 1.0 : 0.8,
      alternates: { languages },
    });
    entries.push({
      url: `${SITE_URL}${r.en}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: r.en === "/en" ? 0.9 : 0.7,
      alternates: { languages },
    });
  }

  // 2. Topic filter routes (DE + EN) with reciprocal hreflang alternates.
  for (const t of TOPICS) {
    const languages = {
      de: `${SITE_URL}/blog/thema/${t.slug}`,
      en: `${SITE_URL}/en/blog/topic/${t.slug_en}`,
      "x-default": `${SITE_URL}/blog/thema/${t.slug}`,
    };
    entries.push({
      url: `${SITE_URL}/blog/thema/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
      alternates: { languages },
    });
    entries.push({
      url: `${SITE_URL}/en/blog/topic/${t.slug_en}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
      alternates: { languages },
    });
  }

  // 3. Blog posts from DB (DE + EN). Pair DE<->EN via translation_of so each
  // localized post advertises its counterpart. Data model: DE is canonical
  // (translation_of=NULL, canonical id = its own id); EN's translation_of
  // points at the DE id.
  const posts = await fetchAllPublishedPostsForSitemap();

  const deSlugByCanonical = new Map();
  const enSlugByCanonical = new Map();
  for (const p of posts) {
    const canonicalId = p.translation_of || p.id;
    if (p.language === "de") deSlugByCanonical.set(canonicalId, p.slug);
    else if (p.language === "en") enSlugByCanonical.set(canonicalId, p.slug);
  }

  for (const p of posts) {
    const prefix = p.language === "en" ? "/en/blog" : "/blog";
    const entry = {
      url: `${SITE_URL}${prefix}/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: p.language === "de" ? 0.7 : 0.6,
    };

    // Only emit hreflang when a real DE<->EN pair exists.
    const canonicalId = p.translation_of || p.id;
    const deSlug = deSlugByCanonical.get(canonicalId);
    const enSlug = enSlugByCanonical.get(canonicalId);
    if (deSlug && enSlug) {
      const deUrl = `${SITE_URL}/blog/${deSlug}`;
      const enUrl = `${SITE_URL}/en/blog/${enSlug}`;
      entry.alternates = {
        languages: { de: deUrl, en: enUrl, "x-default": deUrl },
      };
    }

    entries.push(entry);
  }

  return entries;
}
