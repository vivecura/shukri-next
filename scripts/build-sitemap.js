const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://zevrlfpyyndwjnlpidkx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldnJsZnB5eW5kd2pubHBpZGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODA2MTUsImV4cCI6MjA5MDg1NjYxNX0.upwfBBFCmlLp9Q-gXjgG89WCXkqqG3hutGiuisyV3CI";
const SITE = "https://vivecura.com";
const OUT = path.join(__dirname, "..", "public", "sitemap.xml");

// (de path, en path) pairs for static routes
const STATIC_ROUTES = [
  { de: "/",                      en: "/en",                      changefreq: "weekly",  priority: "1.0" },
  { de: "/ueber-mich",            en: "/en/about",                changefreq: "monthly", priority: "0.8" },
  { de: "/spezielle-therapien",   en: "/en/special-therapies",    changefreq: "monthly", priority: "0.8" },
  { de: "/therapien/ketamin",                 en: "/en/therapies/ketamine",          changefreq: "monthly", priority: "0.7" },
  { de: "/therapien/schwermetall-ausleitung", en: "/en/therapies/heavy-metal-detox", changefreq: "monthly", priority: "0.7" },
  { de: "/therapien/schimmel-therapie",       en: "/en/therapies/mold-therapy",      changefreq: "monthly", priority: "0.7" },
  { de: "/therapien/darm-reset",              en: "/en/therapies/gut-reset",         changefreq: "monthly", priority: "0.7" },
  { de: "/therapien/hormone",                 en: "/en/therapies/hormones",          changefreq: "monthly", priority: "0.7" },
  { de: "/therapien/burnout-fix",             en: "/en/therapies/burnout-fix",       changefreq: "monthly", priority: "0.7" },
  { de: "/diagnostik",            en: "/en/diagnostics",          changefreq: "monthly", priority: "0.8" },
  { de: "/praevention-longevity", en: "/en/prevention-longevity", changefreq: "monthly", priority: "0.8" },
  { de: "/psychotherapie",        en: "/en/psychotherapy",        changefreq: "monthly", priority: "0.8" },
  { de: "/koerperliche-symptome", en: "/en/physical-symptoms",    changefreq: "monthly", priority: "0.7" },
  { de: "/infusions",             en: "/en/infusions",            changefreq: "monthly", priority: "0.7" },
  { de: "/ketamin",               en: "/en/ketamine",             changefreq: "monthly", priority: "0.7" },
  { de: "/beratung",              en: "/en/consultations",        changefreq: "monthly", priority: "0.7" },
  { de: "/mentoring",             en: "/en/mentoring",            changefreq: "monthly", priority: "0.7" },
  { de: "/mein-buch",             en: "/en/my-book",              changefreq: "monthly", priority: "0.6" },
  { de: "/experience",            en: "/en/experience",           changefreq: "monthly", priority: "0.6" },
  { de: "/blog",                  en: "/en/blog",                 changefreq: "weekly",  priority: "0.8" },
  { de: "/rechtliches",           en: "/en/legal-notice",         changefreq: "yearly",  priority: "0.3" },
];

// Blog topic pages. Keep slugs in sync with src/lib/topics.js (CommonJS script
// can't import the ES module). When adding a topic in topics.js, add it here too.
const TOPIC_ROUTES = [
  { de_slug: "ketamin",                en_slug: "ketamine"          },
  { de_slug: "schwermetallentgiftung", en_slug: "heavy-metal-detox" },
  { de_slug: "schimmel",               en_slug: "mold"              },
  { de_slug: "darmsanierung",          en_slug: "gut-reset"         },
  { de_slug: "hormone",                en_slug: "hormones"          },
  { de_slug: "burnout",                en_slug: "burnout"           },
];

function urlEntry({ loc, changefreq, priority, lastmod, alternates }) {
  const lines = [
    "  <url>",
    `    <loc>${SITE}${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
  ];
  if (alternates) {
    for (const alt of alternates) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${SITE}${alt.href}" />`);
    }
  }
  lines.push("  </url>");
  return lines.filter(Boolean).join("\n");
}

(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, language, translation_of, updated_at, created_at")
      .eq("published", true);

    if (error) throw error;

    const byId = new Map((data || []).map((p) => [p.id, p]));

    const blogEntries = [];
    for (const p of data || []) {
      const lastmod = (p.updated_at || p.created_at || "").slice(0, 10);
      let dePath = null;
      let enPath = null;

      if (p.language === "de") {
        dePath = `/blog/${p.slug}`;
        const enPost = (data || []).find((q) => q.translation_of === p.id && q.language === "en");
        if (enPost) enPath = `/en/blog/${enPost.slug}`;
      } else if (p.language === "en") {
        enPath = `/en/blog/${p.slug}`;
        if (p.translation_of && byId.has(p.translation_of)) {
          const dePost = byId.get(p.translation_of);
          if (dePost?.language === "de") dePath = `/blog/${dePost.slug}`;
        }
      }

      const loc = p.language === "en" ? `/en/blog/${p.slug}` : `/blog/${p.slug}`;
      const alternates = [];
      if (dePath) alternates.push({ hreflang: "de", href: dePath });
      if (enPath) alternates.push({ hreflang: "en", href: enPath });
      if (dePath) alternates.push({ hreflang: "x-default", href: dePath });

      blogEntries.push({
        loc,
        changefreq: "monthly",
        priority: "0.7",
        lastmod,
        alternates: alternates.length ? alternates : undefined,
      });
    }

    const staticEntries = [];
    for (const r of STATIC_ROUTES) {
      const alternates = [
        { hreflang: "de", href: r.de },
        { hreflang: "en", href: r.en },
        { hreflang: "x-default", href: r.de },
      ];
      staticEntries.push({ loc: r.de, changefreq: r.changefreq, priority: r.priority, alternates });
      staticEntries.push({ loc: r.en, changefreq: r.changefreq, priority: r.priority, alternates });
    }

    // Topic pages (6 DE + 6 EN).
    for (const t of TOPIC_ROUTES) {
      const dePath = `/blog/thema/${t.de_slug}`;
      const enPath = `/en/blog/topic/${t.en_slug}`;
      const alternates = [
        { hreflang: "de", href: dePath },
        { hreflang: "en", href: enPath },
        { hreflang: "x-default", href: dePath },
      ];
      staticEntries.push({ loc: dePath, changefreq: "weekly", priority: "0.7", alternates });
      staticEntries.push({ loc: enPath, changefreq: "weekly", priority: "0.7", alternates });
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      [...staticEntries, ...blogEntries].map(urlEntry).join("\n") +
      `\n</urlset>\n`;

    fs.writeFileSync(OUT, xml, "utf8");
    console.log(`[sitemap] wrote ${staticEntries.length} static entries + ${blogEntries.length} blog entries`);
  } catch (err) {
    console.warn("[sitemap] generation failed, keeping existing public/sitemap.xml:", err.message);
    process.exit(0);
  }
})();
