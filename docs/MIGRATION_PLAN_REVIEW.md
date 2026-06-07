# Migration Plan — Review & Refinements (verified against the codebase)

This document refines the **ViveCura CRA → Next.js 14 App Router migration plan**.
Every correction below was checked against the actual source in this repo. File
references are real — open them to confirm. Apply these to the plan before starting.

**How to use this:** Items are ordered by impact. 🔴 = changes scope or removes a
blocker, 🟠 = behavior change the plan got wrong, 🟡 = smaller fixes. The
"Refinement" line in each is the concrete change to make.

---

## 🔴 1. The Supabase service-role key is NOT required for Phase 1

**Plan claim:** Prep step 5, the `supabaseServer.js` "RLS-bypass" module, and
"What I need from the user #1" all treat `SUPABASE_SERVICE_ROLE_KEY` as a hard
prerequisite for SSG / sitemap / ISR.

**Reality:** `supabase-schema.sql` defines exactly one SELECT policy:

```sql
CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT USING (published = true);
```

The **anon key already reads every published post**. Proof: `scripts/build-sitemap.js`
generates the production sitemap today using the anon key (hardcoded literal in that
script). So in Next.js, Server Components, `generateStaticParams`, `app/sitemap.js`,
and the on-demand ISR path all work with the anon key. The service-role key is only
needed to read *drafts*, which happens in the admin — and the admin stays client-side
(Phase 3).

**Refinement:**
- Remove the service-role key as a Phase 1 prerequisite. Start scaffolding immediately.
- Do **not** split `blogQueries` into `.server.js` (service-role) / `.client.js` (anon).
  Both use the anon key. Keep a single server-only query module purely to keep query
  code out of client bundles — same key, no RLS bypass.
- Drop "What I need from the user #1." The service-role key only becomes relevant in
  Phase 3 if you ever want server-side draft previews (optional).

---

## 🔴 2. Blog rendering is the most underestimated task — and it's the SEO-critical path

**Plan claim (§1.4):** render `<article dangerouslySetInnerHTML={{ __html: post.html_content }} />`
"inside the same chrome `BlogPost.js` uses today."

**Reality:** `src/Pages/BlogPost.js` does **not** use `dangerouslySetInnerHTML`. It uses
`<ShadowHtml html={post.html_content} />`. `src/Components/ShadowHtml.js` is a ~180-line
**client-side CSS-scoping engine** that:

- parses `html_content` — a **full HTML document** (`<head>` with `<style>`/`<link>`,
  `<body>`, in-content `<script>`s) — via `DOMParser`;
- rewrites **every** CSS selector to be scoped under `.blog-post-host`
  (`body`/`html`/`:root` are remapped to the host element), so the post's CSS does not
  clobber the site chrome;
- hoists and de-dupes stylesheet `<link>`s into `document.head`;
- re-creates and re-executes inline `<script>`s.

The proposed one-liner would:
1. inject a whole HTML document into a `<div>` (invalid markup);
2. **lose all CSS scoping** — the post's `body{…}` / `h1{…}` rules leak out and break
   the site (and the site's CSS leaks into the post). Directly violates "pixel-perfect."
3. silently **drop in-content `<script>`s** — `dangerouslySetInnerHTML` never executes them.

This is the SEO-critical path: the post body **must** be in the server-rendered light
DOM for Googlebot. But `ShadowHtml` runs only inside `useEffect` (client-only) and
depends on `DOMParser`, which does **not** exist in a Node Server Component.

**Refinement — add an explicit task to §1.4 (budget a dedicated buffer day):**
- Port the scoping logic to a **server-side util**, e.g. `scopeBlogHtml(html) → { styles, body }`.
  The `scopeCss` / `rewriteBlock` / `rewriteSelectorList` functions in `ShadowHtml.js`
  are already (mostly) pure string manipulation — reuse them. Replace `DOMParser` with
  `cheerio` or `node-html-parser` to split `<style>` / `<body>` / `<script>` on the server.
- Server Component output: emit the scoped `<style>` block + the scoped body HTML
  (light DOM, crawlable).
- Decide on in-content `<script>`s: either a small `"use client"` hydration island that
  re-executes them after mount, or strip them if the blog content doesn't rely on JS.
- This is NOT a mechanical copy. It is the riskiest single piece for both SEO and parity.

---

## 🔴 3. TherapieDetail is iframe-based, with a slug→file mapping table

**Plan claim (§1.3 Batch C):** "Fetches `/therapien-html/<slug>.html` ... convert to a
Server Component that reads the HTML file ... injects via `dangerouslySetInnerHTML` ...
extract title/description from `<title>` / `<meta>`."

**Reality (`src/Pages/TherapieDetail.js`):**
- It renders an **`<iframe>`** (style-isolated, with a JS auto-resize loop) — not inline.
  Switching to inline injection inherits the **same CSS-scoping problem as #2** (these
  files are full standalone HTML documents with their own `<style>`).
- Files are **not** named `<slug>.html`. There is an explicit lookup table; EN files use
  a `-en` suffix and the EN slug differs from the DE slug. Example:
  `darm-reset` (DE) → `gut-reset-en.html` (EN). All 12 files confirmed present in
  `public/therapien-html/`. The `fs.readFileSync` port must use the mapping table, not
  string interpolation.

**Refinement:**
- Reuse the `therapies` array from `TherapieDetail.js` (slugDe/slugEn/htmlDe/htmlEn) as
  the source of truth for file resolution.
- Apply the same server-side scoping approach as #2 (or keep an iframe for these pages
  if their content doesn't need to be inlined for SEO — decide per page).
- **SEO duplicate-content risk:** once therapy HTML is inlined into `/therapien/:slug`,
  the raw `/therapien-html/*.html` static files become crawlable duplicates. Add them to
  `robots` `disallow`, or set a canonical pointing at the real route.

---

## 🟡 4. `/api/revalidate` wildcard is a silent no-op bug (§1.5)

```js
revalidatePath((record.language === 'en' ? '/en/blog/topic/' : '/blog/thema/') + '*');
```

`revalidatePath` does **not** support glob (`*`). For dynamic topic routes, use the
route-pattern form:

```js
revalidatePath('/blog/thema/[slug]', 'page');       // DE topics
revalidatePath('/en/blog/topic/[slug]', 'page');    // EN topics
```

Also:
- Handle `DELETE` / unpublish: revalidate the blog list so the card disappears; the
  detail route should `notFound()`. Keep `dynamicParams` at its default (`true`) so a
  slug that's published after build (not in `generateStaticParams`) still renders.
- The topic route names are confirmed: DE = `/blog/thema/:slug`, EN = `/en/blog/topic/:slug`
  (see `src/App.js`). The plan's prefixes are consistent with this.

---

## 🟡 5. Sitemap expected-count magic number is wrong (§1.7)

Gate expects "56 + blog × 2." Actual static count from `scripts/build-sitemap.js`:
21 `STATIC_ROUTES` × 2 + 6 `TOPIC_ROUTES` × 2 = **54** static URLs. Derive the count
from the route tables instead of hardcoding.

---

## 🟡 6. i18n bundle size (§1.2)

`src/locales/de.json` and `en.json` are ~125 KB **each** (~250 KB combined). A `useT()`
shim that imports both at module load pulls all of it into every client island. This is
**not a regression** (react-i18next already bundles both today), but it's not a win
either. Where a page has no interactivity, resolve copy in the Server Component and pass
strings as props to shrink client JS.

---

## 🟡 7. Fonts & GA4 parity checks

- GA4 tag is `G-PVM2RGELWW`, loaded via **two inline gtag scripts** in
  `public/index.html` (gtag.js loader + `gtag('config', …)`) — not GTM. Both must move to
  `next/script` (`afterInteractive`). Verify `collect?v=2&tid=G-PVM2RGELWW` still fires.
- Current fonts (Plus Jakarta Sans, Libre Baskerville) load via a Google Fonts `<link>`.
  Moving to `next/font/google` self-hosts them, which changes font-load timing and
  fallback metrics slightly — verify against the screenshot baseline before claiming
  pixel-parity.

---

## 🟡 8. React Strict Mode double-invoke (animations)

Both CRA (`src/index.js`) and Next dev use React Strict Mode, which double-mounts effects
in development. GSAP / IntersectionObserver effects without clean teardown will
double-register. Apply the `@gsap/react` `useGSAP` mitigation **proactively** to the
animation-heavy Batch B pages (Home, Psychotherapie, PraeventionLongevity, HealthCheck,
Experience, Extras), not just as a fallback.

---

## ✅ What the plan got right (do not change)

- URL inventory and DE/EN mirroring — matches `src/App.js` exactly (DE default, `/en`
  prefix; standalone `/honorar` + `/anamnese` without site chrome; `/admin` unindexed).
- Phased, SEO-first delivery and the Vercel domain-swap rollback.
- "No database changes" — confirmed; all RLS/insert policies stay as-is.
- Reuse of `src/lib/blogQueries.js` inheritance/pairing logic (`translation_of`,
  `findPairedBlogSlug`, `inheritFromDePair`) — ports cleanly to the server.
- `next.config.js` rewrite for `/lifesummit` → `/lifesummit.html` (matches `vercel.json`;
  the catch-all rewrite is correctly dropped).

---

## Net effect on scope & timeline

- #1 makes the **start easier** — no key dependency, simpler query layer.
- #2 and #3 mean "blog + therapy HTML rendering" is a **real engineering task**
  (server-side CSS scoping), not a copy-paste. Carve out an explicit buffer day in
  Phase 1 for porting `ShadowHtml` to the server instead of absorbing it into the blog
  batch. Everything else in the 18-day estimate holds.

---

## Key files referenced (for the implementing AI)

| Concern | File(s) |
|---|---|
| Routing / URL inventory | `src/App.js` |
| Blog data + pairing logic | `src/lib/blogQueries.js` |
| Blog HTML rendering (must port to server) | `src/Components/ShadowHtml.js`, `src/Pages/BlogPost.js` |
| Therapy detail (iframe + file map) | `src/Pages/TherapieDetail.js`, `public/therapien-html/` |
| RLS / DB schema | `supabase-schema.sql` |
| Current sitemap (anon key, proves #1) | `scripts/build-sitemap.js` |
| Current SEO/meta component | `src/Components/Seo.js` |
| GA4 + fonts + fallback meta | `public/index.html` |
| Static route ↔ DE/EN map | `src/lib/routeMap.js` |
