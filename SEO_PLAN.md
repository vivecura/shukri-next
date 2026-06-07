# ViveCura SEO Plan

Living document describing the SEO strategy, goals, constraints, and step-by-step execution plan for the vivecura.com website.

---

## 1. Goals

| Priority | Goal | Success signal |
|---------|------|----------------|
| P0 | Blog articles rank in Google for German medical keywords (e.g. "Ketamin Therapie Berlin", "Funktionelle Medizin Berlin") | Impressions + clicks in Google Search Console for each post's target keyword within 4–8 weeks of publishing |
| P0 | Each blog post and static page has its own title + description in Google results | Site: search on Google shows distinct snippets per route |
| P1 | Social shares (WhatsApp, LinkedIn, Facebook) show correct thumbnail, title, description per URL | Manual test via opengraph.xyz and WhatsApp preview |
| P1 | Google indexes every public route (no "Discovered — currently not indexed" state) | GSC Coverage report clean |
| P2 | Core Web Vitals pass on all public routes | Lighthouse ≥ 90 performance + SEO |
| P2 | Sitemap dynamically reflects all published blog posts | `/sitemap.xml` includes every `published=true` row |

---

## 2. Non-goals / Do NOT break

- The admin dashboard at `/admin` and `/admin/edit/:id` — iframe-based WYSIWYG editor must keep working exactly as it does today.
- The blog-mcp-server publishing flow from Claude.ai → Supabase.
- The Supabase schema (`blog_posts` table), RLS policies, or the storage bucket `blog-thumbnails`.
- Any existing page style, layout, or behavior on non-blog routes.
- The `html_content` format emitted by Claude via MCP — posts stay as self-contained HTML pages with inline `<style>` blocks.

---

## 3. Current architecture (baseline)

```
Claude.ai
   │ (via MCP tool: publish_blog_post)
   ▼
blog-mcp-server/  ── service role key ──►  Supabase.blog_posts (published=false)
                                                │
                                                ▼
                                   Admin dashboard (/admin)
                                     - metadata edit, thumbnail, publish toggle
                                     - edit iframe (/admin/edit/:id)  ◄─── STAYS UNCHANGED
                                                │
                                                ▼
                                   published=true
                                                │
                                                ▼
                          Public blog (/blog, /blog/:slug)  ◄─── ONLY THIS CHANGES
                          Currently: client-fetch + <iframe srcDoc>
                          Problem: Google cannot index iframe content
```

**Stack:** Create React App (react-scripts 5.0.1), react-router-dom 6, Supabase JS client, hosted on Vercel with SPA rewrite.

---

## 4. The core SEO blocker

Blog post bodies are rendered inside `<iframe srcDoc={html_content}>` for style isolation. Googlebot treats iframe content as a separate document, so none of the article text, headings, or keywords count toward the `/blog/:slug` URL. Even if we add SSR or prerendering, iframe content stays unindexed.

**Fix:** Render the post body in a Shadow DOM root instead of an iframe. Shadow DOM gives the same CSS isolation (per-post `<style>` blocks stay scoped) but keeps the content inside the real document — so crawlers see it as part of `/blog/:slug`.

---

## 5. Target architecture

### Phase 1 — Stay on CRA, fix the iframe + add per-page metadata (low risk, fast)
```
Public blog (/blog/:slug)
   - Shadow DOM renderer for post body (replaces iframe)
   - react-helmet-async for per-page <title>, <meta>, OG, Twitter, canonical
   - JSON-LD Article schema injected per post
   - Dynamic /sitemap.xml generated at build time from Supabase
```

### Phase 2 (optional, later) — Migrate to Next.js for SSR/SSG
```
Next.js App Router
   - Blog posts: SSG + ISR (revalidate: 60) reading from Supabase
   - Static pages: SSG
   - /admin: 'use client' — unchanged behavior
   - MCP server: unchanged
```

Phase 2 is a separate decision — Phase 1 gets us most of the SEO benefit and is enough to start ranking.

---

## 6. Step-by-step execution plan — Phase 1

Each step is its own commit, reviewable in isolation.

### Step 0 — Branch + preview setup
- Create branch `seo-shadow-dom-and-meta`.
- Push to Vercel — every commit auto-deploys a preview URL.
- **Nothing production-visible.**

### Step 1 — Replace public iframe with Shadow DOM renderer ✅ unblocks SEO indexing
- Edit only `src/Pages/BlogPost.js`.
- Create a small `ShadowHtml` component that:
  - Attaches a shadow root to a `<div>`.
  - Parses the full HTML string and injects `<style>` blocks + `<body>` content into the shadow root.
  - Preserves script tags if any post uses them (re-execute inside shadow root).
- Remove the `<iframe>` and the postMessage height measurement — Shadow DOM expands naturally with content.
- Admin editor (`BlogEditor.js`) is **not touched**.

**Acceptance:** Open every existing blog post on the preview URL. Compare with production. Visuals identical. View-source shows article text inside the main document.

### Step 2 — Install react-helmet-async
- Add `react-helmet-async` to `package.json`.
- Wrap `<App />` in `<HelmetProvider>` in `src/index.js`.

### Step 3 — Per-page `<Helmet>` for blog post page
- In `BlogPost.js`, render `<Helmet>` with:
  - `<title>{post.title} — ViveCura Blog</title>`
  - `<meta name="description" content={post.description} />`
  - `<link rel="canonical" href={`https://vivecura.com/blog/${post.slug}`} />`
  - OG: `og:title`, `og:description`, `og:image` (= `thumbnail_url`), `og:url`, `og:type=article`
  - Twitter: `summary_large_image` card with same fields
- Add JSON-LD `Article` schema via `<script type="application/ld+json">` inside `<Helmet>`.

### Step 4 — Per-page `<Helmet>` for static pages
- Add targeted titles + descriptions for: `/`, `/ueber-mich`, `/spezielle-therapien`, `/diagnostik`, `/praevention-longevity`, `/psychotherapie`, `/koerperliche-symptome`, `/infusions`, `/ketamin`, `/beratung`, `/mentoring`, `/mein-buch`, `/experience`, `/blog`.
- Each title/description crafted for the keywords that page should rank for.

### Step 5 — Dynamic sitemap at build time
- Add a Node script `scripts/build-sitemap.js` that:
  - Fetches all `published=true` posts from Supabase (anon key, public data).
  - Writes `public/sitemap.xml` combining static routes + blog routes.
- Wire into build: `"build": "node scripts/build-sitemap.js && react-scripts build"`.
- Each Vercel deploy regenerates the sitemap with the latest posts.

### Step 6 — Supabase → Vercel deploy hook (optional but recommended)
- Create a Vercel Deploy Hook URL.
- Add a Supabase Database Webhook on `blog_posts` UPDATE where `published` changes → POST to the Vercel deploy hook.
- Result: publishing a post from the admin triggers a redeploy that refreshes the sitemap.

### Step 7 — robots.txt final
- Confirm `public/robots.txt` allows all, disallows `/admin`, and references `https://vivecura.com/sitemap.xml`.

### Step 8 — Submit to Google
- Verify `vivecura.com` in Google Search Console (if not already).
- Submit `/sitemap.xml`.
- Request indexing for the most important URLs.

---

## 7. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Shadow DOM breaks a post's layout | Low | Visible visual bug on one post | Preview URL review before merge; fix per-post if needed |
| Post uses `<script>` that depends on parent `window` | Very low | Interactive element doesn't work | Re-execute script inside shadow root; inspect current posts |
| react-helmet-async conflicts with existing static meta tags | Low | Duplicate tags | Remove hardcoded meta from `public/index.html` defaults — Helmet overrides win |
| Sitemap build script fails the Vercel build | Low | Deploy fails visibly | Wrap in try/catch, fall back to existing sitemap on error |
| Supabase webhook misconfigured | Low | New posts show up only on next manual deploy | Documented fallback: manual redeploy from Vercel |
| Admin editor regressed | Zero (file not touched) | N/A | N/A |
| MCP publishing regressed | Zero (codebase not touched) | N/A | N/A |

---

## 8. Rollback plan

- **Any step:** Vercel → Deployments → click previous working deploy → "Promote to Production". Rollback takes ~5 seconds.
- **Per-step revert:** each step is its own commit; `git revert <sha>` + push redeploys.

---

## 9. File touch list (Phase 1)

| File | Action |
|---|---|
| `src/Pages/BlogPost.js` | Rewrite: iframe → Shadow DOM + Helmet |
| `src/index.js` | Wrap app in `<HelmetProvider>` |
| `src/App.js` | Optional: add default `<Helmet>` for fallback title |
| `src/Pages/Home.js` + other page components | Add `<Helmet>` per page (Step 4) |
| `scripts/build-sitemap.js` | New file |
| `package.json` | Add `react-helmet-async`, update `build` script |
| `public/sitemap.xml` | Will be regenerated by script each build |
| `public/robots.txt` | Already updated (Phase 0) |
| `public/index.html` | Already updated (Phase 0) |

**Untouched (explicitly):**
- `src/Pages/Admin.js`
- `src/Pages/BlogEditor.js`
- `blog-mcp-server/**`
- `supabase-schema.sql`
- Any other page not listed above, except for the `<Helmet>` addition

---

## 10. Success measurement

- **Week 1:** GSC shows blog posts being crawled (Coverage → Indexed).
- **Week 2–4:** First impressions appear in GSC for blog post target keywords.
- **Week 4–8:** Clicks start arriving from organic search.
- **Ongoing:** Monitor Lighthouse SEO score (target ≥ 95 on all public routes).

---

## 11. Phase 2 preview (decide later)

If after 6–8 weeks Phase 1 ranking is good but we want faster indexing, better social previews, and top-tier Core Web Vitals → migrate to Next.js App Router. Estimated effort: 2–3 days. Admin + MCP + Supabase still unchanged.
