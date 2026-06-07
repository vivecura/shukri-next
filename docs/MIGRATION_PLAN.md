# ViveCura — CRA → Next.js 14 App Router Migration Plan

> **Revision note:** This plan was refined after a codebase-verified review pass. Three findings changed scope materially — see §1.4 (server-side HTML scoping for blog), §1.3 Batch C (therapy iframes + slug→file mapping table), and the prep section (no service-role key needed for Phase 1). The 18-day total estimate holds; Phase 1 gains an explicit buffer day for porting `ShadowHtml` to the server.

## Context

`vivecura.com` is a Create React App on Vercel, rendered fully client-side. Verified with `curl -A "Googlebot" https://vivecura.com/<any-path>`: every URL returns the same 1195-byte HTML shell with `<div id="root"></div>` and one generic title. Ahrefs audit reports DR 0.4, 0 organic keywords, 82/89 pages flagged. The cause is structural: Google sees empty HTML on every page.

`react-helmet-async` is wired (`src/Components/Seo.js`), but Helmet sets metadata client-side — Googlebot is not executing the bundle reliably, which is why the audit is brutal.

**Goal:** Serve full, unique HTML in the initial server response for every public page, including all blog posts. New blog posts must become server-rendered and crawlable on publish, without a developer rebuild.

**User decisions (already made):**
- **Phased delivery** — SEO fix lands first (Phase 1).
- **Vercel preview → promote** — zero-downtime cutover from preview URL.
- **Pixel-perfect parity** — animations, scroll behavior, hover states all match.
- **Port everything** — Admin + BlogEditor included.

---

## Architecture decisions

| Concern | Decision | Rationale |
|---|---|---|
| Framework | **Next.js 14 App Router** | App Router is the current Next.js standard. SSG + ISR + server components solve the SEO problem and match what the client's email recommended. |
| Hosting | **Vercel** (same project, new deployment) | Same DX, GA4 tag preserved, no migration work for hosting. |
| Repo strategy | **New `next/` folder in same repo**, gradually migrated | Keeps history, allows side-by-side comparison during port. After cutover, delete `src/` and `public/`. |
| Routing | **Mirror current URLs exactly** | No 301s needed for internal links. routeMap.js stays as data, used in Next.js too. |
| Blog rendering | **SSG + on-demand ISR** via Supabase webhook → `/api/revalidate`, with **server-side CSS scoping** of post HTML (port of `src/Components/ShadowHtml.js` to Node) | Auto-publish requirement met; pages pre-rendered at build, fresh ones revalidated within seconds of `INSERT`/`UPDATE` to `blog_posts`. CSS-scoping engine ports from client `DOMParser` to server `cheerio`/`node-html-parser` so the post body lands in the server-rendered light DOM for Googlebot without leaking styles into the site chrome. |
| Supabase access | **Anon key everywhere** (server queries + sitemap + ISR). Existing `Public can read published posts` RLS policy on `blog_posts` already exposes everything Phase 1 reads. Service-role key is **only** needed for Phase 3 admin draft previews (optional). | Removes the only environment-variable dependency from Phase 1 prep and keeps the query layer simpler — one key, one module. |
| i18n | **Native Next.js routing** (no `next-intl`) | Existing `detectLang(pathname)` + `routeMap` already model bilingual URLs correctly; porting them to a Next.js helper is a 30-line job. Avoid a library that would force restructuring. |
| Styling | **Tailwind config copied as-is** | `tailwind.config.js` works in Next.js unchanged. Custom keyframes preserved. |
| Animations | **GSAP stays client-side**, wrapped in `"use client"` components with same refs/effects | Identical visual behavior; no replacement library. |
| Forms | **Honorar + Kontakt** → React server-rendered shell + `"use client"` interactive island. **Anamnese** → continues to be `public/anamnese.html` served as a static file, embedded in an iframe at `/anamnese` (no changes to its internals, just the wrapper). |
| Admin / Editor | **Ported but client-side** (`"use client"` everywhere). Auth check happens in a layout `useEffect`. Same Supabase Auth, same iframe + postMessage editor. |
| Sitemap | **`app/sitemap.ts`** (Next.js native), powered by the same Supabase query that's in `scripts/build-sitemap.js` today, plus dynamic blog entries. Build script deleted. |
| Robots | **`app/robots.ts`** (Next.js native), preserves current rules. |
| Multi-domain redirects (.de, .org, .eu → .com) | **Vercel project domain config** (no code) — done in parallel as a quick win, independent of migration. |

---

## Pre-migration prep (Day 0)

1. **Capture baseline.** Save a `curl -A Googlebot` snapshot of homepage, 1 blog post, 1 marketing page. After cutover we compare to confirm we improved (and didn't accidentally regress GA4 or robots).
2. **Take a screenshot tour** of the current site (every public page, both DE and EN). These are the pixel-perfect reference. Tool: a 5-min loop with viewport-locked browser at 1440×900 and 390×844 (iPhone 14).
3. **Create the Vercel project** under a name like `vivecura-next`. Wire its preview deployments. The current `vivecura.com` deployment is untouched throughout.
4. **Branch from main**: `git switch -c next-migration`. All work happens here.
5. **(removed)** No service-role key required for Phase 1. Verified: `supabase-schema.sql` defines a public SELECT policy on `blog_posts WHERE published = true`, and the existing `scripts/build-sitemap.js` already proves the anon key reads every published post at build time. Phase 3 admin can optionally add a service-role key later for draft previews; not blocking.

---

## Phase 1 — Public site (marketing + blog). **SEO problem solved at end of phase.**

**Goal:** Every public URL (`/`, `/blog`, `/blog/:slug`, `/blog/thema/:slug`, all marketing pages, both DE + EN, all therapy detail pages) serves real HTML with unique title, H1, meta description, canonical, OG, and JSON-LD. Curl-as-Googlebot returns the page content, not an empty shell.

### 1.1 Scaffold (Day 1, half-day)

- `npx create-next-app@latest next/ --typescript=false --tailwind=false --app --src-dir --import-alias="@/*"` inside repo.
- Copy `tailwind.config.js`, `postcss.config.js` verbatim. Verify the content glob targets `next/src/**/*`.
- Copy `public/Assets/`, `public/therapien-html/`, `public/anamnese.html`, `public/lifesummit.html`, `public/manifest.json`, `public/Backgrounds/`, `public/Videos/` into `next/public/` unchanged.
- Copy `src/locales/de.json`, `src/locales/en.json` into `next/src/locales/`.
- Copy `src/lib/routeMap.js`, `src/lib/topics.js`, `src/lib/honorarForms.js` into `next/src/lib/` unchanged.
- Copy `src/supabaseClient.js` → keep it for client components. Add `next/src/lib/supabaseServer.js` that creates a separate **server-only** Supabase client with the **anon key** (same key — purely to keep query code out of client bundles; no RLS bypass needed since the published-posts SELECT policy already covers Phase 1 reads).
- Install the server HTML parser the blog rendering will need: `npm i node-html-parser` (or `cheerio` — node-html-parser is lighter; both work). Used by the server-side scoping util in §1.4.
- Create `next/src/app/layout.js` (root layout):
  - Includes GA4 tag (`<Script id="ga" strategy="afterInteractive">…G-PVM2RGELWW…</Script>`).
  - Includes Plus Jakarta Sans + Libre Baskerville via `next/font/google` (replaces the current `<link>` to Google Fonts; same fonts, hashed self-hosted, no FOUT).
  - Sets `<html lang>` via a small client component (similar to current `HtmlLang.js`) that reads pathname and toggles `de`/`en`.
  - Mounts `<Navbar />` + `<Footer />` conditionally (just like `ConditionalNavbar` today — hides on `/honorar`, `/anamnese`).
  - Default `<title>` and meta = current `index.html` values, overridden per-route by `generateMetadata`.
- `next/next.config.js`:
  ```js
  module.exports = {
    images: { remotePatterns: [{ protocol: 'https', hostname: 'zevrlfpyyndwjnlpidkx.supabase.co' }] },
    async rewrites() {
      return [{ source: '/lifesummit', destination: '/lifesummit.html' }];
    },
  };
  ```
  (Same rewrites as current `vercel.json`. The catch-all rewrite to `/` is no longer needed — Next.js handles routing.)

**Verification gate 1.1:** `cd next && npm run dev` shows a blank layout with Navbar/Footer rendering, no console errors.

### 1.2 Port shared infrastructure (Day 2)

- **`@/lib/lang.js`** (server-safe helper): pure functions `detectLang(pathname)`, `translatePath(pathname, target)`. Ported 1:1 from `src/lib/routeMap.js`.
- **`@/lib/blogQueries.server.js`** (server-only module, anon key): `fetchPublishedPostsForLanguage`, `fetchPublishedPostsByTopicAndLanguage`, `fetchPostBySlugAndLang`, `fetchAllPublishedPostsForSitemap`. Uses `supabaseServer`. Ported from `src/lib/blogQueries.js` with no logic changes (the inheritance + sort logic is correct as-is). The "server-only" framing is for bundle-size hygiene, not RLS — both keys would work; we just don't want this code in client bundles.
- **`@/lib/blogQueries.client.js`** (client, anon key): admin-only wrappers including `fetchAllPostsGrouped`. Used by Phase 3 admin.
- **`@/lib/scopeBlogHtml.js`** (server-only): port of the CSS-scoping engine in `src/Components/ShadowHtml.js`. The current `ShadowHtml` is a ~180-line **client-side** component that uses `DOMParser` to parse a post's full HTML document, rewrites every CSS selector to be scoped under `.blog-post-host` (so `body`/`html`/`:root` get remapped to the host), hoists `<link rel="stylesheet">` to `document.head`, and re-executes inline `<script>` tags. Server replacement:
  - Use `node-html-parser` to split incoming `html_content` into `<style>` blocks, `<link>` tags, body content, and inline `<script>` tags.
  - Reuse the existing pure-string functions from `ShadowHtml.js` (`scopeCss`, `rewriteBlock`, `rewriteSelectorList`) for the selector rewriting — they don't depend on `DOMParser`, only on string manipulation, so they port directly.
  - Return `{ styles: string[], body: string, scripts: string[] }` from a pure function — consumed by the blog detail Server Component (§1.4) which emits scoped `<style>` + scoped body inline in the server-rendered HTML.
  - Decide inline-script handling: a tiny `"use client"` `<BlogScripts scripts={...} />` island hydrates after mount and re-executes them, **or** strip them if a survey of current published posts confirms none depend on JS. Default to the hydration island for safety; revisit after auditing posts.
- **`@/components/Navbar.js`** (`"use client"`): copy 1:1, replace `react-router-dom` imports:
  - `useLocation()` → `usePathname()` from `next/navigation`
  - `<Link to=>` → `<Link href=>` from `next/link`
  - All other logic (scroll-hide, dropdowns, mobile hamburger, language detection) unchanged.
- **`@/components/Footer.js`** (`"use client"`): same Link/pathname swap.
- **`@/components/LanguageSwitcher.js`** (`"use client"`): same swap. The Supabase paired-slug lookup stays client-side (it's only needed when the user clicks the toggle, not at render).
- **`@/components/HtmlLang.js`** (`"use client"`): replace Helmet with a `useEffect` that sets `document.documentElement.lang` based on pathname. (Or simpler: do it server-side in the root layout via a Server Component reading `headers()`.)
- **`@/components/Seo.js`** — **deleted**. Per-page metadata moves to `generateMetadata()` exports on each route. No more `react-helmet-async`.
- **`@/hooks/useLanguage.js`** (`"use client"`): replace `useLocation()` with `usePathname()`. Drop the `i18n.changeLanguage` side effect (handled by Next.js routing now); keep the `localStorage.setItem` for the LanguageSwitcher's first-visit memory.
- **`@/hooks/useIsMobile.js`**: copy 1:1, mark `"use client"`.
- **i18n init**: instead of the current i18next init in `src/i18n.js`, create `@/lib/i18n.js` that exports a small `t(key, lang)` function that reads `de.json` / `en.json` at module load. Client components that need translation use a tiny `useT()` hook that reads `usePathname()` and returns the right map. (Avoids the full `react-i18next` provider chain in Next.js.)

**Verification gate 1.2:** dev server renders home page shell with Navbar + Footer + Language Switcher functional. Language toggle navigates correctly. Console clean.

### 1.3 Port marketing pages (Day 3–4, batched by complexity)

For each page, the pattern is:
- File: `next/src/app/<route>/page.js`
- Default export: a Server Component that returns the same JSX (with `"use client"` islands for interactive bits).
- Named export `generateMetadata`: returns `{ title, description, alternates: { canonical, languages }, openGraph, twitter }` for that route.
- For DE + EN versions: `next/src/app/<de-route>/page.js` and `next/src/app/en/<en-route>/page.js` — both can `export { default } from '../shared/<page>'` so the body is written once.

**Batch A — straightforward (Day 3 morning):**

| Page | Route(s) | Notes |
|---|---|---|
| `MeinBuch.js` | `/mein-buch`, `/en/my-book` | Simplest. 17 lines, pure text. |
| `Beratung.js` | `/beratung`, `/en/consultations` | 56 lines. FlipGrid as client island. |
| `Mentoring.js` | `/mentoring`, `/en/mentoring` | 63 lines. FanCards + ProcessTimeline as client islands. |
| `LegalNotice.js` | `/rechtliches`, `/en/legal-notice` | 335 lines, hash-scroll behavior — keep `useEffect` for scroll in a client wrapper. |

**Batch B — animation-heavy (Day 3 afternoon + Day 4):**

| Page | Route(s) | Notes |
|---|---|---|
| `Home.js` | `/`, `/en` | Hero, parallax, multiple GSAP/IntersectionObserver children. MedicalClinic JSON-LD stays. |
| `Infusions.js` | `/infusions`, `/en/infusions` | Card popups, scroll-triggered visibility. |
| `Psychotherapie.js` | `/psychotherapie`, `/en/psychotherapy` | 1506 lines, heavy accordion + parallax. |
| `PraeventionLongevity.js` | `/praevention-longevity`, `/en/prevention-longevity` | 757 lines. |
| `HealthCheck.js` | `/diagnostik`, `/en/diagnostics` | 702 lines. |
| `KoerperlicheSymptome.js` | `/koerperliche-symptome`, `/en/physical-symptoms` | 483 lines. |
| `SpezielleTherapien.js` | `/spezielle-therapien`, `/en/special-therapies` | 432 lines. |
| `Experience.js` | `/experience`, `/en/experience` | Scroll-linked video chapters. |
| `Extras.js` | `/ketamin`, `/en/ketamine` | Scroll video + responsive image. |
| `UeberMich.js` | `/ueber-mich`, `/en/about` | Staggered fade-ins. |

For all of these the **port pattern is identical**:
1. Move the file to `next/src/app/<route>/page.js` and rename default export.
2. Add `"use client"` at the top (most of these need it — they have scroll listeners or accordion state).
3. Replace `react-router-dom` imports with `next/navigation` + `next/link`.
4. Replace `<Helmet>` with `generateMetadata` (move to a non-`"use client"` wrapper page that imports the client body).
5. Replace `useTranslation()` with `useT()` (our small i18n shim).
6. Test side-by-side against current site at 1440×900 and 390×844.

**Batch C — therapy details (Day 4 afternoon):**

| Page | Route(s) | Notes |
|---|---|---|
| `TherapieDetail.js` | `/therapien/:slug`, `/en/therapies/:slug` | Today this page renders an **`<iframe>`** with a JS auto-resize loop, pointing at one of 12 standalone HTML files in `public/therapien-html/`. The filenames are **not** `<slug>.html` — there's an explicit lookup table in `TherapieDetail.js` (`slugDe`, `slugEn`, `htmlDe`, `htmlEn`), and EN files use a `-en` suffix with different slugs (e.g. `darm-reset` → `gut-reset-en.html`). **Port:** reuse that table verbatim as `THERAPY_FILES` in the Server Component. Read the HTML at build time via `fs.readFileSync`, then run it through the same `scopeBlogHtml` util from §1.2 so the post body lands inline in server-rendered light DOM (crawlable) without CSS leakage. Extract title + description by parsing the HTML's `<title>` and `<meta name="description">` once at module load, feed both to `generateMetadata`. **SEO duplicate-content fix:** once the HTML is inlined into `/therapien/:slug`, the raw `/therapien-html/*.html` static files become crawlable duplicates. Add `Disallow: /therapien-html/` to `app/robots.js`, OR set a canonical pointing at the real route. Keep the iframe option in reserve only if a specific page's content depends on the standalone document context. |

### 1.4 Port the blog (Day 5–6) — **the SEO-critical piece**

- **`next/src/app/blog/page.js`** + **`next/src/app/en/blog/page.js`** (list):
  - Server Component. Calls `fetchPublishedPostsForLanguage(lang)`.
  - Renders the same JSX as `Blog.js`. Per-card `<Link href={'/blog/' + post.slug}>` becomes server-rendered.
  - `generateMetadata` returns the localized title/description.
  - **No loading spinner needed** — server-rendered.

- **`next/src/app/blog/[slug]/page.js`** + **`next/src/app/en/blog/[slug]/page.js`** (detail):
  - Server Component. `params.slug` → `fetchPostBySlugAndLang(slug, lang)`. If null, `notFound()`.
  - **HTML rendering — the SEO-critical path.** Today `src/Pages/BlogPost.js` does NOT use `dangerouslySetInnerHTML` — it uses `<ShadowHtml html={post.html_content} />`, a client-only CSS-scoping engine. A naïve `dangerouslySetInnerHTML` swap would (1) inject a full HTML document into a div (invalid markup), (2) leak the post's `body{…}` / `h1{…}` CSS into the site chrome, breaking pixel-parity, and (3) silently drop in-content `<script>` tags. **The correct port:** call `scopeBlogHtml(post.html_content)` from §1.2 to get `{ styles, body, scripts }`. Render the styles as scoped `<style>` blocks inside `<head>` (or the body if simpler), the body inside `<article className="blog-post-host" dangerouslySetInnerHTML={{ __html: body }} />`, and the scripts via the `<BlogScripts />` client island. Result: full post HTML in the server response (Googlebot wins), zero style leakage, in-content JS still runs.
  - `generateMetadata` returns:
    - `title: post.title`
    - `description: post.description`
    - `alternates.canonical: '/blog/' + slug`
    - `alternates.languages`: paired slug for the other language (computed via the same `findPairedBlogSlug` logic, server-side now).
    - `openGraph.images: [post.thumbnail_url]`
    - JSON-LD `Article` schema embedded as a `<script type="application/ld+json">` in the body.
  - **`export async function generateStaticParams()`**: returns every published post's slug for both languages. Pre-renders at build time.
  - **`export const revalidate = 60`** (fallback safety net — pages revalidate every 60s even without webhook).
  - **On-demand ISR**: see 1.5 below.

- **`next/src/app/blog/thema/[slug]/page.js`** + **`next/src/app/en/blog/topic/[slug]/page.js`** (topic filter):
  - Server Component. Calls `fetchPublishedPostsByTopicAndLanguage(topicSlug, lang)`.
  - Same pattern as the list page.
  - `generateStaticParams` returns the 6 topics × 2 languages = 12 paths.

### 1.5 Auto-publish webhook (Day 6 afternoon)

- **`next/src/app/api/revalidate/route.js`**:
  ```js
  export async function POST(req) {
    const secret = req.headers.get('x-revalidate-secret');
    if (secret !== process.env.REVALIDATE_SECRET) return new Response('Unauthorized', { status: 401 });
    const { type, record, old_record } = await req.json();
    const post = record || old_record; // DELETE sends old_record
    if (!post?.slug || !post?.language) return Response.json({ ok: false }, { status: 400 });

    const blogList = post.language === 'en' ? '/en/blog' : '/blog';
    const detail   = (post.language === 'en' ? '/en/blog/' : '/blog/') + post.slug;
    // revalidatePath does NOT accept globs; use route-pattern form for dynamic segments.
    const topicPattern = post.language === 'en' ? '/en/blog/topic/[slug]' : '/blog/thema/[slug]';

    revalidatePath(blogList);
    revalidatePath(detail);
    revalidatePath(topicPattern, 'page'); // revalidates every materialized topic page in one shot
    return Response.json({ ok: true, type, slug: post.slug });
  }
  ```
  - **DELETE handling:** Supabase webhooks send `old_record` (not `record`) on DELETE. The code above handles both. After revalidation, the detail route will return 404 via `notFound()` because `fetchPostBySlugAndLang` returns null on missing/unpublished — that's correct.
  - **`dynamicParams`:** keep the default (`true`) on `app/blog/[slug]/page.js`. A post published *after* the last build (not in `generateStaticParams`) renders on demand and gets cached.
- **Supabase Database Webhook** (Supabase Dashboard → Database → Webhooks):
  - Trigger: `INSERT`, `UPDATE`, `DELETE` on `blog_posts`.
  - URL: `https://vivecura.com/api/revalidate`.
  - HTTP method: `POST`.
  - HTTP headers: `x-revalidate-secret: <random 32-byte string>`.
  - Payload: default (sends `record` JSON).
  - Vercel env: `REVALIDATE_SECRET` set to same value.

**Verification gate 1.5:** edit a blog post's title in admin (still old CRA at this point), save. Check the new Next.js preview deployment: `curl https://<preview>/blog/<slug>` returns the updated title within ~3 seconds. No manual rebuild.

### 1.6 Sitemap, robots, structured data (Day 7 morning)

- **`next/src/app/sitemap.js`**: returns the array of URLs. Built from:
  - Static routes (copied from `scripts/build-sitemap.js` STATIC_ROUTES).
  - Topic routes.
  - Blog posts (server-side Supabase query).
- **`next/src/app/robots.js`**: returns `{ rules: [{ userAgent: '*', allow: '/', disallow: '/admin' }], sitemap: 'https://vivecura.com/sitemap.xml' }`.
- **JSON-LD per route** added directly in `<head>` via `metadata.other` or an inline `<script type="application/ld+json">`:
  - Home: `MedicalClinic` (Shukri's MedicalClinic JSON-LD is already in `Home.js`; just move it to root layout or per-page metadata).
  - Blog list: `WebSite` + `BreadcrumbList`.
  - Blog post: `Article`.
  - Marketing pages: `MedicalProcedure` where appropriate.
  - `/ueber-mich`: `Physician`.

### 1.7 Phase 1 verification gates (Day 7 afternoon — **mandatory before deploying**)

Run these against `vivecura-next.vercel.app`:

```bash
# 1. Each page returns full HTML, not a shell
for url in / /blog /infusions /psychotherapie /diagnostik /ueber-mich /kontakt; do
  size=$(curl -sA "Googlebot" "https://vivecura-next.vercel.app$url" | wc -c)
  echo "$url → $size bytes"  # expect > 8000 each
done

# 2. Each page has unique title + canonical + meta description
for url in / /blog /infusions /psychotherapie; do
  curl -sA "Googlebot" "https://vivecura-next.vercel.app$url" \
    | grep -oE '<title>[^<]+</title>|<link rel="canonical"[^>]+>|<meta name="description"[^>]+>'
  echo "---"
done

# 3. A blog post returns its actual content
curl -sA "Googlebot" "https://vivecura-next.vercel.app/blog/<some-slug>" \
  | grep -c "$(EXPECTED_KEYWORD_FROM_POST)"  # expect > 0

# 4. The sitemap has every page
# Expected static count derived from scripts/build-sitemap.js (do NOT hardcode):
#   STATIC_ROUTES (21) × 2 langs + TOPIC_ROUTES (6) × 2 langs = 54 static URLs
# Plus blog posts: count published posts × 2 (DE + EN where translation exists)
curl -s "https://vivecura-next.vercel.app/sitemap.xml" | grep -c "<loc>"  # expect 54 + blog posts × 2

# 5. Pixel-parity: side-by-side screenshots at 1440×900 and 390×844 for every public page.
# Tool: any browser screenshot extension. Diff in Photoshop or a free pixel-diff tool. Acceptable
# delta: < 5% per page, with no layout shifts.

# 6. GA4 still fires: open preview in browser with DevTools Network, look for collect?v=2&tid=G-PVM2RGELWW
```

**Promotion to prod (end of Phase 1):** when all 6 gates pass, swap `vivecura.com` domain from the old Vercel project to `vivecura-next`. **Old project keeps the deployment** — instant rollback by re-pointing the domain. After 72 hours of stable prod, archive the old project.

---

## Phase 2 — Forms (Kontakt, Honorar). Anamnese stays as-is. (Day 8–11)

### 2.1 Kontakt (Day 8–9)

- `next/src/app/kontakt/page.js` + `next/src/app/en/contact/page.js`:
  - Server Component shell with `generateMetadata`.
  - Imports `<KontaktForm />` as the only `"use client"` island — the 4-step wizard with all its state.
- **`KontaktForm.js`**: copy `Kontakt.js` logic verbatim (state, validation, multi-step navigation). Replace Supabase insert call with a Server Action `submitContactRequest(formData)` — same insert but server-side. Anti-spam: add a honeypot field + IP-based rate limit via Vercel KV or Upstash (only if spam becomes an issue; ship without first).

### 2.2 Honorar (Day 9–10)

- **HonorarHub** → `next/src/app/honorar/page.js`. Pure client component (`"use client"`), since it's a dark-mode interactive picker. No SEO needed (no navbar/footer anyway, internal tool). `noindex` meta.
- **HonorarForm** → `next/src/app/honorar/[slug]/page.js`. Same client pattern. Signature pad refs and Supabase insert ported 1:1. The form's recent edits (split Vorname/Nachname, Ort/Datum prefill) stay.

### 2.3 Anamnese (Day 10, half-day)

- `next/src/app/anamnese/page.js`: identical to current `src/Pages/Anamnese.js` — a client component that renders an iframe at `/anamnese.html`.
- `public/anamnese.html` already lives in `next/public/anamnese.html` (copied during scaffold). Its existing Supabase wiring (insert into `anamnese_submissions`, upload to `befunde` bucket) keeps working unchanged — it's standalone HTML, not React.
- **No SEO** — internal tool, `noindex` meta on the wrapper page.

### 2.4 Phase 2 verification (Day 11)

- Submit a test row to each form on the preview deployment; confirm row appears in Supabase.
- Verify the form pages still aren't crawled (`noindex` for Honorar + Anamnese; Kontakt is public and gets metadata).

---

## Phase 3 — Admin + BlogEditor (Day 12–15)

### 3.1 Admin (`/admin`) (Day 12–13)

- `next/src/app/admin/page.js`: `"use client"`. Same 823-line component, ported with:
  - `useNavigate()` → `useRouter().push()` from `next/navigation`
  - `useLocation()` → `usePathname()`
  - `react-helmet-async` → drop (admin doesn't need SEO; just set `<title>` via `document.title` in `useEffect`).
- Auth gate: same Supabase `signInWithPassword` + `onAuthStateChange` pattern. Wrap in a layout `useEffect` that redirects unauthenticated users to a small login form.
- The 3 panels (`AdminContactsPanel`, `AdminLifesummitPanel`, `AdminBlogPanel`) port unchanged with `"use client"`.

### 3.2 BlogEditor (`/admin/edit/[id]`) (Day 13–14)

- `next/src/app/admin/edit/[id]/page.js`: `"use client"`. Iframe + postMessage logic is browser-only; ports 1:1.
- Confirm the editor's iframe target HTML (the contenteditable scaffold) still loads correctly — it's likely served from `public/`. Verify after copy.

### 3.3 Phase 3 verification (Day 15)

- Log in as admin. Edit a blog post, save. Confirm row updated in Supabase. Confirm public blog page revalidates within seconds (webhook chain works end-to-end).
- Toggle publish on a draft. Confirm it appears in the public blog list within seconds.
- Re-promote preview → prod (second promotion, same project, same domain).

---

## Phase 4 — Polish + multi-domain redirects (Day 16–18)

### 4.1 Multi-domain redirects (Day 16)

In Vercel project → Settings → Domains, add each of:

- `vivecura.de`, `www.vivecura.de`
- `vivecura.org`, `www.vivecura.org`
- `lifestyledoctor.eu`, `www.lifestyledoctor.eu`

For each, set **Redirect to `vivecura.com`**, status code `308 Permanent`. Verify with `curl -I https://vivecura.de/ueber-mich` returns `308` + `location: https://vivecura.com/ueber-mich`. `308` (not `301`) preserves the method; for plain GETs they're equivalent for SEO.

DNS-level: ensure all six hostnames have A/CNAME records pointing at Vercel (`76.76.21.21` / `cname.vercel-dns.com`). If they don't, that's a DNS task at your registrar — outside the code repo but needed for the redirects to work.

### 4.2 hreflang audit (Day 16)

For every page, the `<link rel="alternate" hreflang>` tags must point at the paired URL:
- `hreflang="de"` → DE URL
- `hreflang="en"` → EN URL
- `hreflang="x-default"` → DE URL

This is handled by `generateMetadata`'s `alternates.languages`. Verify with curl on a sample of 10 pages.

### 4.3 OG image generation (Day 17)

- `next/src/app/opengraph-image.js` (route-specific): generates an OG image per page via Next.js's `ImageResponse` API. Default OG image = ViveCura wordmark + page title. Blog posts use their `thumbnail_url`.

### 4.4 Final SEO audit (Day 17–18)

Re-run Ahrefs Site Audit on the preview URL. Target: health score > 80, zero "missing meta" / "missing H1" / "low word count" warnings on real content pages.

Submit updated sitemap to Google Search Console. Use URL Inspection on 5 pages (home, blog, 2 marketing, 1 blog post) — confirm "Page is on Google" + rendered HTML shows content, not the shell.

### 4.5 Cleanup (Day 18)

After 72 hours of stable prod on `vivecura-next`:
- Delete `src/`, `public/`, `scripts/build-sitemap.js`, root `package.json` (replaced by `next/package.json`), `vercel.json` (replaced by `next/next.config.js`).
- Move `next/` contents to repo root.
- Single commit: "Migrate to Next.js 14 App Router".

---

## Critical files & patterns (reference)

**Files that are reused as-is** (copied with no logic changes):
- `src/lib/routeMap.js`
- `src/lib/topics.js`
- `src/lib/honorarForms.js`
- `src/locales/de.json`, `src/locales/en.json`
- `tailwind.config.js`, `postcss.config.js`
- `public/Assets/`, `public/therapien-html/`, `public/anamnese.html`, `public/Backgrounds/`, `public/Videos/`, etc.

**Critical files for the implementing AI** (referenced during the port):
| Concern | File(s) |
|---|---|
| Routing / URL inventory | `src/App.js` |
| Blog data + pairing logic | `src/lib/blogQueries.js` |
| Blog HTML rendering (must port to server) | `src/Components/ShadowHtml.js`, `src/Pages/BlogPost.js` |
| Therapy detail (iframe + slug→file mapping table) | `src/Pages/TherapieDetail.js`, `public/therapien-html/` |
| RLS / DB schema (proves anon key suffices) | `supabase-schema.sql` |
| Current sitemap (anon-key proof) | `scripts/build-sitemap.js` |
| Current SEO/meta component | `src/Components/Seo.js` |
| GA4 + fonts + fallback meta | `public/index.html` |
| Static route ↔ DE/EN map | `src/lib/routeMap.js` |

**Logic ported with mechanical changes** (mostly router imports):
- 24 page components in `src/Pages/`
- 25+ shared components in `src/Components/`
- 2 hooks in `src/hooks/`

**Logic that needs real changes**:
- `src/Components/Seo.js` → deleted, replaced by `generateMetadata` exports
- `src/Components/HtmlLang.js` → moved to Server Component in root layout
- `src/lib/blogQueries.js` → split into `.server.js` (uses service-role key) and `.client.js` (uses anon key)
- `src/index.js` → deleted; Next.js root layout takes over
- `src/App.js` → deleted; Next.js file-based routing takes over
- `scripts/build-sitemap.js` → deleted; replaced by `app/sitemap.js`
- `vercel.json` → deleted; replaced by `next.config.js`

**Repeated patterns** (described once, applies broadly):
- Every public-facing route: `Server Component shell + generateMetadata + client island for interactivity`.
- Every component using `react-router-dom`: swap `Link from 'react-router-dom'` → `Link from 'next/link'`, `to=` → `href=`, `useLocation()` → `usePathname()`, `useNavigate()` → `useRouter().push()`.
- Every component using `useTranslation()`: swap for our `useT()` hook that reads from `de.json`/`en.json` based on URL language.
- Every component using `react-helmet-async`: lift its title/description/canonical to the wrapper Server Component's `generateMetadata`.

---

## Risk register & mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Animation regressions** (GSAP/IntersectionObserver behave differently) | Medium | Medium (visual parity is "pixel-perfect") | Pixel-diff every page during 1.3 batch. Reserve buffer time in 1.3 for fine-tuning. **Apply `@gsap/react`'s `useGSAP` hook proactively** on the Batch B animation-heavy pages (Home, Psychotherapie, PraeventionLongevity, HealthCheck, Experience, Extras), not as a fallback — React Strict Mode in Next.js dev double-invokes effects, which GSAP/IntersectionObserver without clean teardown will misregister. |
| **`scopeBlogHtml` port introduces visual drift** vs current `ShadowHtml` rendering | Medium | High (every blog post looks different = parity blown) | Side-by-side render a representative published post in both old and new on Day 5. The pure functions (`scopeCss`, `rewriteBlock`, `rewriteSelectorList`) are reused verbatim, so drift would come from the HTML-parser swap (`node-html-parser` vs `DOMParser`). Spot-check the 5 most-trafficked posts before promoting Phase 1. |
| **i18n bundle bloat** — `useT()` hook imports both `de.json` + `en.json` (~250 KB combined) into every client island | Medium | Low–Medium (slower TTI on slow connections) | Not a regression vs CRA (`react-i18next` does the same today). Mitigation: where a Server Component renders the page shell and the client island doesn't need translations, resolve strings server-side and pass as props. Apply to Batch A pages first; revisit Batch B if Lighthouse flags JS bundle size. |
| **GA4 inline-script port breaks tracking** | Low | High (analytics gap) | The current `public/index.html` uses two inline `gtag` scripts (loader + `config`), not Tag Manager. Both move to `next/script` with `strategy="afterInteractive"`. Verify `collect?v=2&tid=G-PVM2RGELWW` fires in DevTools Network on every Vercel preview before promote. |
| **Font swap (Google CDN → `next/font/google`)** shifts CLS or rendering metrics | Low | Low (visible only on first paint) | Self-hosted fonts via `next/font` have different timing than the current Google Fonts `<link>`. Verify pixel-parity on a fresh browser session against the screenshot baseline. |
| **Therapy duplicate-content** — raw `/therapien-html/*.html` indexed alongside `/therapien/:slug` | Low | Medium (duplicate signal hurts ranking) | `app/robots.js` adds `Disallow: /therapien-html/`. Verify with `curl -A Googlebot https://<preview>/therapien-html/ketamin.html` returns a file but the robots block keeps it out of the index. |
| **Hydration mismatches** on language-dependent pages | High | Medium (warnings, possibly flicker) | Detect language server-side from URL only (never from `localStorage` on first render). Initial render is always URL-driven. |
| **Blog ISR webhook doesn't fire / misses event** | Low | High (auto-publish broken) | `revalidate = 60` on detail pages as fallback. Monitor with a Vercel log query. Add a manual `/admin/revalidate-all` button as escape hatch. |
| **`fs.readFileSync` in therapy details fails on Vercel** | Low | Medium | Test in the first Vercel preview deployment. If issues, switch to `import.meta.url`-based path resolution or move HTML files to a Supabase Storage bucket. |
| **`react-i18next` translation key parity** when we replace it with `useT()` | Medium | Low | Smoke-test 5 high-traffic pages in both languages immediately after porting. Translation files (`de.json`/`en.json`) are unchanged; only the consumption API differs. |
| **Pre-existing bugs surface during the port** (lurking Helmet bug, etc.) | Medium | Low–Medium | Fix in-place; don't refactor adjacent code. Note in commit message. |
| **GA4 stops firing** | Low | High (analytics gap) | Verify on every Vercel preview deployment via DevTools Network tab. Pre-cutover gate. |
| **`vercel.json` rewrites missed → broken redirect** | Low | High (some URL returns 404) | The only rewrite that matters is `/lifesummit` → `/lifesummit.html`. Replicated in `next.config.js` rewrites. Verified in gate 1.7. |
| **Admin auth session not surviving Next.js routing** | Low | Medium (admin breaks) | Supabase Auth uses `localStorage` for the session; identical between CRA and Next.js client components. No code change needed. Verify in 3.3. |
| **Build time blows up** (every blog post pre-rendered) | Low | Low | Even 200 posts × 2 languages = 400 SSG pages, < 60s on Vercel. If it ever becomes a concern, switch from `generateStaticParams` to dynamic + `revalidate`. |
| **Cutover causes brief 404 on a missed URL** | Low | High (lost user) | Pre-cutover checklist (gate 1.7) curls every route from `public/sitemap.xml`. Any 404 fixed before promote. |
| **Old `vivecura.com` Vercel project keeps serving (DNS cache)** | Low | Low (stale cache, <1hr) | TTL on Vercel-managed domains is short. Document in the runbook. |

---

## Rollback plan

Phase 1 promote uses Vercel's domain-swap mechanism. Rollback = swap the domain back to the old project. **Instant**, no rebuild, no DNS propagation wait (Vercel re-routes at the edge in seconds).

The old CRA project is preserved as-is for 7 days minimum after each promotion. After 7 days of stable prod, it can be archived (but not deleted) in Vercel. After 30 days, deletable.

Database changes: **none.** No tables added, no schemas changed. All Supabase tables and storage buckets stay identical. This means rollback is purely a code/hosting concern — data is always safe.

---

## Timeline (realistic with chosen options: phased / pixel-perfect / full port)

| Phase | Days | Cumulative | What ships |
|---|---|---|---|
| 0 — Prep | 1 | 1 | Baseline captures, screenshot tour, Vercel project, branch. |
| 1 — Public site | 6 | 7 | **SEO problem fully solved.** Preview promoted to prod. Includes an explicit Day-5 buffer for the `ShadowHtml` → `scopeBlogHtml` server port (the highest-risk single piece of the migration). |
| 2 — Forms | 4 | 11 | Kontakt + Honorar + Anamnese on Next.js. |
| 3 — Admin + Editor | 4 | 15 | Full Next.js stack. Second prod promote. |
| 4 — Polish + redirects | 3 | 18 | Multi-domain redirects, OG images, GSC submitted, cleanup. |

**Total: 18 working days for full pixel-perfect migration with everything ported.** The SEO impact lands at **end of day 7** (Phase 1 promote).

This is the honest estimate. Pixel-perfect parity adds ~3 days vs "looks the same"; full admin port adds ~4 days vs "keep CRA admin". The user chose both, so they're priced in.

What's *not* in this estimate: time for the user to do their own visual review and request tweaks. Plan on 1–2 review cycles per phase, half a day each.

---

## What I need from the user before starting

1. **(removed)** No service-role Supabase key needed for Phase 1. The existing public SELECT policy on `blog_posts WHERE published = true` lets the anon key handle every server-side read for Phase 1. If you ever want server-rendered draft previews in admin later, *that* requires a service-role key — Phase 3 decision.
2. **Confirmation** that `vivecura.de`, `vivecura.org`, `lifestyledoctor.eu` all currently point their DNS at Vercel (or will be re-pointed before Phase 4). If not, I'll need either DNS access at the registrar or a contact who has it.
3. **Confirmation** that nothing currently links to deep URLs like `/static/js/main.fb2ef0e2.js` from external sources (it's a hashed bundle, so we don't worry about it — but worth confirming no third-party tracking pixel references our CRA bundle).
4. **Authorization to create the `next/` folder** in the repo and start scaffolding (Day 1, Phase 0). No production changes until Phase 1 promote.

---

## Verification (end-to-end test plan)

Before each promote-to-prod, the following must pass on the preview deployment:

```bash
# A. Every URL in the sitemap returns 200 with > 8 KB of unique HTML
curl -s "https://<preview>/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed 's/<\/?loc>//g' | while read url; do
  path="${url#https://vivecura.com}"
  size=$(curl -sA "Googlebot" -o /dev/null -w "%{size_download}" "https://<preview>$path")
  status=$(curl -sA "Googlebot" -o /dev/null -w "%{http_code}" "https://<preview>$path")
  echo "$status $size $path"
done | tee verification-A.log
# expected: all 200, all size > 8000

# B. Per-page unique title + canonical + description
curl -s "https://<preview>/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed 's/<\/?loc>//g' | head -30 | while read url; do
  path="${url#https://vivecura.com}"
  title=$(curl -sA "Googlebot" "https://<preview>$path" | grep -oE '<title>[^<]+</title>' | head -1)
  canonical=$(curl -sA "Googlebot" "https://<preview>$path" | grep -oE '<link rel="canonical"[^>]+>' | head -1)
  echo "$path | $title | $canonical"
done | tee verification-B.log
# expected: every title is unique; every canonical matches the path

# C. JSON-LD validates
curl -sA "Googlebot" "https://<preview>/" | grep -oE '<script type="application/ld\+json">[^<]+</script>' \
  | sed 's/<[^>]*>//g' | jq .  # must not error

# D. Pixel-diff baseline (manual; tool of choice — Percy, Chromatic, or just side-by-side screenshots).

# E. Forms write to Supabase: submit a test row to each form, verify in Supabase Table Editor.

# F. Admin auth + editor publish flow: edit a draft post, save, publish; verify it appears in public list within 5s.

# G. Blog auto-publish: SQL `update blog_posts set updated_at = now() where slug = '<test>';` → confirm `curl <preview>/blog/<test>` reflects the change within 5s (proves webhook + revalidate are wired).

# H. Lighthouse on home + a blog post: expect Performance > 90, SEO 100, Accessibility > 90, Best Practices 100.
```

---

## Out of scope for this plan

- Content edits (blog posts, page copy, translations) — none.
- Backend changes (Supabase schema, RLS policies, Auth setup) — none.
- Database migrations — none.
- New features or design changes beyond what currently exists.
- Performance optimization beyond what Next.js gives by default (no image compression, no third-party tag managers, no CDN beyond Vercel's default).

If any of these surface as "while we're at it", they get their own ticket after the migration is stable.
