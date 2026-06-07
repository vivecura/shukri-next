import { supabaseServer } from "./supabaseServer";

// Bilingual blog data — server-side queries.
//
// Data model:
//   - DE post: language='de', translation_of=NULL (canonical row)
//   - EN post: language='en', translation_of=<DE id>
//   - pinned / featured_on_home / topics set on the DE row; EN inherits.
//   - created_at on EN is overridden with the DE pair's date so list ordering
//     and displayed publication date follow the original authoring timeline.

export function getCanonicalId(post) {
  return post.translation_of || post.id;
}

export function orderForListing(posts) {
  const newest = posts.slice(0, 2);
  const newestIds = new Set(newest.map((p) => p.id));
  const pinned = posts.filter((p) => p.pinned && !newestIds.has(p.id));
  const rest = posts.filter((p) => !p.pinned && !newestIds.has(p.id));
  return [...newest, ...pinned, ...rest];
}

async function inheritFromDePair(posts) {
  const deIdsToFetch = posts
    .filter((p) => p.language === "en" && p.translation_of)
    .map((p) => p.translation_of);
  if (deIdsToFetch.length === 0) return;

  const { data: dePosts, error } = await supabaseServer
    .from("blog_posts")
    .select("id, pinned, featured_on_home, created_at, topics")
    .in("id", deIdsToFetch);
  if (error || !dePosts) return;

  const deMap = new Map(dePosts.map((d) => [d.id, d]));
  for (const post of posts) {
    if (post.language === "en" && post.translation_of && deMap.has(post.translation_of)) {
      const de = deMap.get(post.translation_of);
      post.pinned = de.pinned;
      post.featured_on_home = de.featured_on_home;
      post.created_at = de.created_at;
      post.topics = de.topics;
    }
  }
}

export async function fetchPublishedPostsForLanguage(lang) {
  const { data, error } = await supabaseServer
    .from("blog_posts")
    .select("id, title, slug, description, thumbnail_url, language, translation_of, pinned, featured_on_home, created_at, topics")
    .eq("published", true)
    .eq("language", lang)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  await inheritFromDePair(data);
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return data;
}

export async function fetchPublishedPostsByTopicAndLanguage(topicSlug, lang) {
  const { data: deMatches, error: deErr } = await supabaseServer
    .from("blog_posts")
    .select("id")
    .eq("language", "de")
    .eq("published", true)
    .contains("topics", [topicSlug]);
  if (deErr || !deMatches || deMatches.length === 0) return [];

  const deIds = deMatches.map((r) => r.id);

  let query = supabaseServer
    .from("blog_posts")
    .select("id, title, slug, description, thumbnail_url, language, translation_of, pinned, featured_on_home, created_at, topics")
    .eq("published", true)
    .eq("language", lang);

  query = lang === "de"
    ? query.in("id", deIds)
    : query.in("translation_of", deIds);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];
  await inheritFromDePair(data);
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return data;
}

export async function fetchFeaturedPostsForLanguage(lang) {
  const all = await fetchPublishedPostsForLanguage(lang);
  return all.filter((p) => p.featured_on_home);
}

export async function fetchPostBySlugAndLang(slug, lang) {
  const { data, error } = await supabaseServer
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("language", lang)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Sitemap helper: every published post with slug, language, updated_at.
export async function fetchAllPublishedPostsForSitemap() {
  const { data, error } = await supabaseServer
    .from("blog_posts")
    .select("slug, language, updated_at")
    .eq("published", true);
  if (error || !data) return [];
  return data;
}
