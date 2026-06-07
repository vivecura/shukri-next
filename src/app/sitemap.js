import { fetchAllPublishedPostsForSitemap } from "@/lib/blogQueries.server";
import { ROUTE_MAP } from "@/lib/routeMap";
import { TOPICS } from "@/lib/topics";

const SITE_URL = "https://vivecura.com";

export default async function sitemap() {
  const entries = [];

  // 1. Static routes from ROUTE_MAP (both DE + EN)
  for (const r of ROUTE_MAP) {
    entries.push({
      url: `${SITE_URL}${r.de}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: r.de === "/" ? 1.0 : 0.8,
    });
    entries.push({
      url: `${SITE_URL}${r.en}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: r.en === "/en" ? 0.9 : 0.7,
    });
  }

  // 2. Topic filter routes (DE + EN)
  for (const t of TOPICS) {
    entries.push({
      url: `${SITE_URL}/blog/thema/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    });
    entries.push({
      url: `${SITE_URL}/en/blog/topic/${t.slug_en}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  // 3. Blog posts from DB (DE + EN)
  const posts = await fetchAllPublishedPostsForSitemap();
  for (const p of posts) {
    const prefix = p.language === "en" ? "/en/blog" : "/blog";
    entries.push({
      url: `${SITE_URL}${prefix}/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: p.language === "de" ? 0.7 : 0.6,
    });
  }

  return entries;
}
