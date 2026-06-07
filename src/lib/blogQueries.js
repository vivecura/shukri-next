// src/lib/blogQueries.js
//
// Single source of truth for bilingual blog data fetching.
// Data model:
//   - DE post: language='de', translation_of=NULL (canonical row)
//   - EN post: language='en', translation_of=<DE id> (linked translation)
//   - Pin / featured-on-home is set on the DE row only; EN inherits via translation_of.
//
// All blog-data queries should go through this module so the inheritance and
// pairing rules stay consistent.

import { supabase } from "../supabaseClient";

// The "canonical" id of a post is the DE original's id (or the post's own id if it is the DE).
export function getCanonicalId(post) {
  return post.translation_of || post.id;
}

// Sort: newest 2 first, then pinned (excluding newest 2), then the rest.
export function orderForListing(posts) {
  const newest = posts.slice(0, 2);
  const newestIds = new Set(newest.map((p) => p.id));
  const pinned = posts.filter((p) => p.pinned && !newestIds.has(p.id));
  const rest = posts.filter((p) => !p.pinned && !newestIds.has(p.id));
  return [...newest, ...pinned, ...rest];
}

// Hydrate EN posts from their DE pair: pinned, featured_on_home, and created_at.
// Mutates posts in place. No-op for DE posts (they already hold canonical values).
// created_at is overridden so EN list ordering and displayed publication date
// follow the article's authoring timeline, not the translation date.
async function inheritFromDePair(posts) {
  const deIdsToFetch = posts
    .filter((p) => p.language === "en" && p.translation_of)
    .map((p) => p.translation_of);
  if (deIdsToFetch.length === 0) return;

  const { data: dePosts, error } = await supabase
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

// Public: all published posts in a given language, with pin/featured/date inherited from DE pair.
export async function fetchPublishedPostsForLanguage(lang) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, description, thumbnail_url, language, translation_of, pinned, featured_on_home, created_at, topics"
    )
    .eq("published", true)
    .eq("language", lang)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  await inheritFromDePair(data);
  // Re-sort: EN created_at was just overwritten with the DE pair's date.
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return data;
}

// Public: published posts in a language that are tagged with a given topic (DE slug).
// Filters by the DE row's topics, then returns the requested language's rows
// (EN rows inherit topics from their DE pair).
export async function fetchPublishedPostsByTopicAndLanguage(topicSlug, lang) {
  // 1. Find DE rows tagged with this topic.
  const { data: deMatches, error: deErr } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("language", "de")
    .eq("published", true)
    .contains("topics", [topicSlug]);
  if (deErr || !deMatches || deMatches.length === 0) return [];

  const deIds = deMatches.map((r) => r.id);

  // 2. Return the requested language's rows for those articles.
  let query = supabase
    .from("blog_posts")
    .select(
      "id, title, slug, description, thumbnail_url, language, translation_of, pinned, featured_on_home, created_at, topics"
    )
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

// Public: only featured-on-home posts in a given language, with featured flag inherited from DE pair.
export async function fetchFeaturedPostsForLanguage(lang) {
  const all = await fetchPublishedPostsForLanguage(lang);
  return all.filter((p) => p.featured_on_home);
}

// Public: single post by (slug, language). Returns null if not found / not published.
export async function fetchPostBySlugAndLang(slug, lang) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("language", lang)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Public: for a given (slug, currentLang), find the slug of its paired translation in targetLang.
// Returns null if the post doesn't exist or has no translation.
export async function findPairedBlogSlug(currentSlug, currentLang, targetLang) {
  if (currentLang === targetLang) return currentSlug;

  // Find the current post (don't require published — switcher can run on draft preview too).
  const { data: current } = await supabase
    .from("blog_posts")
    .select("id, translation_of, language")
    .eq("slug", currentSlug)
    .eq("language", currentLang)
    .maybeSingle();
  if (!current) return null;

  const canonicalId = current.translation_of || current.id;

  if (targetLang === "de") {
    // Target is the canonical (DE original).
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", canonicalId)
      .eq("language", "de")
      .maybeSingle();
    return data?.slug || null;
  }

  // Target is EN: find the EN post that points at the canonical.
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("translation_of", canonicalId)
    .eq("language", "en")
    .maybeSingle();
  return data?.slug || null;
}

// Admin: fetch all posts (any language, published or draft) grouped by canonical id
// for paired display. Each group: { canonical_id, de: row|null, en: row|null }.
export async function fetchAllPostsGrouped() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, description, thumbnail_url, published, featured_on_home, pinned, language, translation_of, created_at, updated_at, topics"
    )
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const groups = new Map();
  for (const post of data) {
    const canonicalId = post.translation_of || post.id;
    if (!groups.has(canonicalId)) {
      groups.set(canonicalId, { canonical_id: canonicalId, de: null, en: null });
    }
    const group = groups.get(canonicalId);
    if (post.language === "de") group.de = post;
    else if (post.language === "en") group.en = post;
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aDate = a.de?.created_at || a.en?.created_at;
    const bDate = b.de?.created_at || b.en?.created_at;
    return new Date(bDate) - new Date(aDate);
  });
}
