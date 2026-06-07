"use client";

import { supabase } from "./supabaseClient";

// Paired-slug lookup for the LanguageSwitcher. Runs on click, not on render.
export async function findPairedBlogSlug(currentSlug, currentLang, targetLang) {
  if (currentLang === targetLang) return currentSlug;

  const { data: current } = await supabase
    .from("blog_posts")
    .select("id, translation_of, language")
    .eq("slug", currentSlug)
    .eq("language", currentLang)
    .maybeSingle();
  if (!current) return null;

  const canonicalId = current.translation_of || current.id;

  if (targetLang === "de") {
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", canonicalId)
      .eq("language", "de")
      .maybeSingle();
    return data?.slug || null;
  }

  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("translation_of", canonicalId)
    .eq("language", "en")
    .maybeSingle();
  return data?.slug || null;
}

// Admin: all posts grouped by canonical id, each entry { canonical_id, de, en }.
export async function fetchAllPostsGrouped() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, description, thumbnail_url, published, featured_on_home, pinned, language, translation_of, created_at, updated_at, topics")
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

// Client-side featured posts query for the home page ScrollingCards.
// Mirrors the server-side version in blogQueries.server.js but uses the
// anon supabase client. EN rows inherit pinned/featured_on_home/created_at
// from their DE pair so the listing matches the server-rendered ordering.
export async function fetchFeaturedPostsForLanguage(lang) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, description, thumbnail_url, language, translation_of, pinned, featured_on_home, created_at, topics"
    )
    .eq("published", true)
    .eq("language", lang)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const enWithDePair = data.filter((p) => p.language === "en" && p.translation_of);
  if (enWithDePair.length > 0) {
    const deIds = enWithDePair.map((p) => p.translation_of);
    const { data: dePosts } = await supabase
      .from("blog_posts")
      .select("id, pinned, featured_on_home, created_at, topics")
      .in("id", deIds);
    if (dePosts && dePosts.length > 0) {
      const deMap = new Map(dePosts.map((d) => [d.id, d]));
      for (const post of data) {
        if (post.language === "en" && post.translation_of && deMap.has(post.translation_of)) {
          const de = deMap.get(post.translation_of);
          post.pinned = de.pinned;
          post.featured_on_home = de.featured_on_home;
          post.created_at = de.created_at;
          post.topics = de.topics;
        }
      }
    }
  }

  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return data.filter((p) => p.featured_on_home);
}
