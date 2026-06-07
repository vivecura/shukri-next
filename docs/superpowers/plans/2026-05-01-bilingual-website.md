# Bilingual Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Progress Status (last updated 2026-05-02)

**Infrastructure complete and shipped to prod (PRs #1–#4 merged):**

- **Phase 0** — done (pre-flight verified)
- **Phase 1** — done (URL/language routing, switcher, hreflang foundation, html lang)
- **Phase 2** — done. All 14 non-blog pages + shared components i18n'd. Locale files have 627 keys per language, fully mirrored.
- **Phase 3** — done (PR #2). Supabase migrated: `translation_of` column added, `(slug, language)` unique constraint, FK + index. MCP server extended: `publish_blog_post` accepts `translation_of`, `read_blog_post` accepts `id` or `(slug, language)`, new `list_posts_missing_translation` tool.
- **Phase 4** — done (PR #3). `src/lib/blogQueries.js` is the single source of truth for bilingual blog queries. `Blog.js`, `BlogPost.js`, `LanguageSwitcher.js`, `ScrollingCards.js`, `Admin.js` all updated. Admin renders DE+EN as one paired card; pin/featured-on-home is set on DE row only and EN inherits via `translation_of`.
- **Bonus (PR #4)** — MCP `publish_blog_post` now inherits `thumbnail_url` from the DE original when publishing a translation without an explicit thumbnail.

**Remaining work (not blocking — site is bilingual and live):**

- **Phase 4 follow-up** — audit on 2026-05-02 found regressions and missed coverage. **Code fixes shipped 2026-05-02** via 8 parallel agents (see Task 4.6 for the punch list, all items marked `[x]` except verification). **Not yet done:** browser smoke test, build/typecheck, commit, push. Resume here next session.
- **Phase 5** — SEO: sitemap.xml needs to emit both DE and EN URLs with hreflang cross-references. llms.txt needs an EN section.
- **Phase 6** — Backfill: translate the 15 existing DE blog posts to EN using the new tools (`list_posts_missing_translation` → `read_blog_post(id=...)` → `publish_blog_post(language="en", translation_of=...)` loop). Currently `/en/blog` is empty until this happens.
- **Phase 7** — Launch verification: resubmit sitemap to Search Console after Phase 5, request indexing of top EN pages.
- **Project instructions for claude.ai** — `blog-mcp-server/claude-project-instructions.md` updated with the "Bilingual Publishing — MANDATORY" rule, but the user must still paste the updated content into the claude.ai project's custom instructions. Until then, new DE posts won't auto-translate to EN.

**Goal:** Convert vivecura.com into a fully bilingual site (German default + English) where every page and every blog article exists in both languages, with proper SEO (hreflang, separate URLs), and blog translations auto-published by Claude via the existing MCP workflow without extra interaction.

**Architecture:**
- URL strategy: path prefix. DE = no prefix (`/blog/foo`), EN = `/en/...` prefix (`/en/blog/foo`).
- Language is determined by URL. Switching language navigates to the paired URL.
- Static UI text lives in `src/locales/{de,en}.json` via react-i18next.
- Blog posts: separate Supabase rows per language, linked by a new `translation_of` column.
- Auto-publish: Claude (via project instructions) creates EN version silently after every DE publish, calling the existing `publish_blog_post` MCP tool twice.
- SEO: per-page `<link rel="alternate" hreflang>` tags + sitemap entries for both languages.

**Tech Stack:** React 18, react-router-dom v6, react-i18next, react-helmet-async, Supabase (PostgreSQL + RLS), Vercel (host), MCP server on Render.

**Phasing (each phase ships a working state):**
- **Phase 1** — URL/language routing foundation + switcher (UI in EN shows English nav, even if some page text is still DE)
- **Phase 2** — Translate all static page text to EN
- **Phase 3** — Blog backend (schema, MCP, project instructions)
- **Phase 4** — Blog frontend (filtering, hreflang, admin UI)
- **Phase 5** — SEO finalization (sitemap, llms.txt)
- **Phase 6** — Backfill: regenerate EN versions of the 15 existing DE articles
- **Phase 7** — Launch verification + Search Console resubmission

---

## File Structure

**New files:**
- `src/lib/routeMap.js` — single source of truth for DE↔EN URL mapping for static pages
- `src/hooks/useLanguage.js` — React hook returning the current language detected from URL
- `src/Components/HtmlLang.js` — small component that updates `<html lang>` via Helmet
- `docs/superpowers/plans/2026-05-01-bilingual-website.md` — this plan

**Modified files (in dependency order):**
- `src/i18n.js` — read initial language from URL or localStorage, fallback chain
- `src/index.js` — wrap App in BrowserRouter? (already in App.js; verify)
- `src/App.js` — mount LanguageSwitcher, mirror routes under `/en/*`
- `src/Components/LanguageSwitcher.js` — switching language now navigates to paired URL
- `src/Components/Seo.js` — emit hreflang link tags + use language-specific paths
- `src/Components/Navbar.js` — already uses `t()`; verify links go to language-correct URLs via routeMap
- `src/Components/Footer.js` — wrap remaining hardcoded strings in `t()`
- `src/Pages/Home.js` — wrap hardcoded German strings in `t()`
- `src/Pages/UeberMich.js` — same
- `src/Pages/Beratung.js` — same
- `src/Pages/Mentoring.js` — same
- `src/Pages/MeinBuch.js` — same
- `src/Pages/Experience.js` — same
- `src/Pages/Extras.js` (= /ketamin) — same
- `src/Pages/PraeventionLongevity.js` — same
- `src/Pages/Psychotherapie.js` — same
- `src/Pages/KoerperlicheSymptome.js` — same
- `src/Pages/Infusions.js` — already partially i18n'd; finish
- `src/Pages/HealthCheck.js` — already partially i18n'd; finish
- `src/Pages/SpezielleTherapien.js` — already partially i18n'd; finish
- `src/Pages/LegalNotice.js` — add Seo + i18n
- `src/Pages/Blog.js` — filter posts by current language; reorder still applies
- `src/Pages/BlogPost.js` — render hreflang for paired post; show "in other language" link
- `src/Pages/Admin.js` — show language tag, link translation pair, warn before publishing only one half
- `src/Components/ScrollingCards.js` — filter by current language
- `src/locales/de.json` — fill out all keys
- `src/locales/en.json` — fill out all keys with English values
- `public/index.html` — keep `lang="de"` as default; `<html lang>` is updated dynamically by Helmet
- `scripts/build-sitemap.js` — emit both DE and EN URLs with hreflang
- `public/llms.txt` — add an EN section
- `blog-mcp-server/index.js` — `publish_blog_post` accepts `translation_of`
- `blog-mcp-server/claude-project-instructions.md` — add the auto-EN-publish rule
- Supabase: `ALTER TABLE blog_posts ADD COLUMN translation_of uuid REFERENCES blog_posts(id) ON DELETE SET NULL;`

---

## Phase 0: Pre-flight verification

### Task 0.1: Confirm production state is clean

**Files:** none

- [x] **Step 1: Verify dev server is running**

Run: `ls C:\Users\Sami\AppData\Local\Temp\claude\C--Users-Sami-Desktop-sami-projects-shukri\dec14f13-f12e-4ccc-b0f3-537067e39d93\tasks\bq44771i2.output`
Expected: file exists (the running server's log)

- [x] **Step 2: Verify production sitemap is live**

Open in browser: `https://vivecura.com/sitemap.xml`
Expected: XML with 30 URLs

- [x] **Step 3: Verify Search Console sitemap status**

Open: `https://search.google.com/search-console` → Sitemaps
Expected: `https://vivecura.com/sitemap.xml` shows status "Success"

- [x] **Step 4: Snapshot the current /admin behavior**

Open `https://vivecura.com/admin`, log in.
Expected: post list loads, both "Auf Startseite" and "Anpinnen" checkboxes visible

If any of these fail, stop and resolve before continuing.

---

## Phase 1: URL / language routing foundation

### Task 1.1: Create the route map

**Files:**
- Create: `src/lib/routeMap.js`

- [x] **Step 1: Create the file**

```js
// src/lib/routeMap.js
//
// Single source of truth mapping German static URLs to English static URLs.
// Blog post URLs are NOT in here — they live in the DB (each post has its own slug per language).
//
// Format: { de: "/path-de", en: "/path-en" }

export const ROUTE_MAP = [
  { de: "/",                      en: "/en" },
  { de: "/ueber-mich",            en: "/en/about" },
  { de: "/spezielle-therapien",   en: "/en/special-therapies" },
  { de: "/diagnostik",            en: "/en/diagnostics" },
  { de: "/praevention-longevity", en: "/en/prevention-longevity" },
  { de: "/psychotherapie",        en: "/en/psychotherapy" },
  { de: "/koerperliche-symptome", en: "/en/physical-symptoms" },
  { de: "/infusions",             en: "/en/infusions" },
  { de: "/ketamin",               en: "/en/ketamine" },
  { de: "/beratung",              en: "/en/consultations" },
  { de: "/mentoring",             en: "/en/mentoring" },
  { de: "/mein-buch",             en: "/en/my-book" },
  { de: "/experience",            en: "/en/experience" },
  { de: "/blog",                  en: "/en/blog" },
  { de: "/rechtliches",           en: "/en/legal-notice" },
];

// Returns the language for a given pathname. EN if it starts with /en, otherwise DE.
export function detectLang(pathname) {
  if (!pathname) return "de";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "de";
}

// Translates a static-page URL between DE and EN. Returns null if not found.
// For blog posts, the caller must consult the DB instead.
export function translatePath(pathname, targetLang) {
  if (!pathname) return null;
  const sourceLang = detectLang(pathname);
  if (sourceLang === targetLang) return pathname;
  const entry = ROUTE_MAP.find((r) => r[sourceLang] === pathname);
  return entry ? entry[targetLang] : null;
}
```

- [x] **Step 2: Smoke-test the helpers with a quick node REPL**

Run: `node -e "const m=require('./src/lib/routeMap.js'); console.log(m.detectLang('/en/blog'), m.translatePath('/ueber-mich','en'));"`
Expected: `en /en/about`

(If `require` fails because of ESM, skip this — the runtime test will validate it.)

- [x] **Step 3: Commit**

```bash
git add src/lib/routeMap.js
git commit -m "Add bilingual routeMap (DE↔EN URL pairs) and detection helpers"
```

### Task 1.2: Create the `useLanguage` hook

**Files:**
- Create: `src/hooks/useLanguage.js`

- [x] **Step 1: Create the hook**

```js
// src/hooks/useLanguage.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { detectLang } from "../lib/routeMap";

// Reads language from the URL on every navigation, syncs i18n state.
// Returns the current language ('de' | 'en').
export default function useLanguage() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const lang = detectLang(pathname);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    try {
      localStorage.setItem("lang", lang);
    } catch (_) { /* private mode */ }
  }, [lang, i18n]);

  return lang;
}
```

- [x] **Step 2: Commit**

```bash
git add src/hooks/useLanguage.js
git commit -m "Add useLanguage hook to sync i18n state from URL"
```

### Task 1.3: Update `i18n.js` to boot from localStorage

**Files:**
- Modify: `src/i18n.js`

- [x] **Step 1: Replace contents**

```js
// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import de from "./locales/de.json";

// Read persisted choice if any. The URL-based detection in useLanguage will
// override this on first render — this initial value just prevents a flash
// for SPAs that boot before the router runs.
let initialLang = "de";
try {
  const fromUrl = typeof window !== "undefined" && window.location.pathname.startsWith("/en")
    ? "en"
    : null;
  const fromStorage = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;
  initialLang = fromUrl || fromStorage || "de";
} catch (_) { /* SSR / private mode */ }

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: initialLang,
  fallbackLng: "de",
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [x] **Step 2: Commit**

```bash
git add src/i18n.js
git commit -m "Boot i18n from URL prefix or localStorage with DE fallback"
```

### Task 1.4: Add `/en/*` routes mirroring DE

**Files:**
- Modify: `src/App.js`

- [x] **Step 1: Add EN routes mirroring DE structure**

Replace the `<Routes>` block with:

```jsx
<Routes>
  {/* DE (default, no prefix) */}
  <Route path="/" element={<Home />} />
  <Route path="/infusions" element={<Infusions />} />
  <Route path="/blog" element={<Blog />} />
  <Route path="/blog/:slug" element={<BlogPost />} />
  <Route path="/admin" element={<Admin />} />
  <Route path="/admin/edit/:id" element={<BlogEditor />} />
  <Route path="/mein-buch" element={<MeinBuch />} />
  <Route path="/spezielle-therapien" element={<SpezielleTherapien />} />
  <Route path="/therapien/:slug" element={<TherapieDetail />} />
  <Route path="/rechtliches" element={<LegalNotice />} />
  <Route path="/diagnostik" element={<HealthCheck />} />
  <Route path="/ueber-mich" element={<UeberMich />} />
  <Route path="/ketamin" element={<Extras />} />
  <Route path="/experience" element={<Experience />} />
  <Route path="/koerperliche-symptome" element={<KoerperlicheSymptome />} />
  <Route path="/praevention-longevity" element={<PraeventionLongevity />} />
  <Route path="/psychotherapie" element={<Psychotherapie />} />
  <Route path="/beratung" element={<Beratung />} />
  <Route path="/mentoring" element={<Mentoring />} />

  {/* EN (mirrored, /en prefix) */}
  <Route path="/en" element={<Home />} />
  <Route path="/en/infusions" element={<Infusions />} />
  <Route path="/en/blog" element={<Blog />} />
  <Route path="/en/blog/:slug" element={<BlogPost />} />
  <Route path="/en/my-book" element={<MeinBuch />} />
  <Route path="/en/special-therapies" element={<SpezielleTherapien />} />
  <Route path="/en/legal-notice" element={<LegalNotice />} />
  <Route path="/en/diagnostics" element={<HealthCheck />} />
  <Route path="/en/about" element={<UeberMich />} />
  <Route path="/en/ketamine" element={<Extras />} />
  <Route path="/en/experience" element={<Experience />} />
  <Route path="/en/physical-symptoms" element={<KoerperlicheSymptome />} />
  <Route path="/en/prevention-longevity" element={<PraeventionLongevity />} />
  <Route path="/en/psychotherapy" element={<Psychotherapie />} />
  <Route path="/en/consultations" element={<Beratung />} />
  <Route path="/en/mentoring" element={<Mentoring />} />
</Routes>
```

(`/admin` and `/admin/edit/:id` and `/therapien/:slug` deliberately have no EN counterpart — admin is internal, therapie subpages are not yet bilingual.)

- [x] **Step 2: Verify in browser**

Open `http://localhost:3000/en/about` — should render the UeberMich page (still in German for now, but routing works).
Open `http://localhost:3000/en/blog` — should render Blog list.

- [x] **Step 3: Commit**

```bash
git add src/App.js
git commit -m "Mirror all static routes under /en prefix for English"
```

### Task 1.5: Mount `LanguageSwitcher` globally

**Files:**
- Modify: `src/App.js`
- Modify: `src/Components/LanguageSwitcher.js`

- [x] **Step 1: Update LanguageSwitcher to navigate URLs**

Replace `src/Components/LanguageSwitcher.js`:

```jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { translatePath, detectLang } from "../lib/routeMap";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const languages = [
    { code: "en", label: "EN", flag: "/Assets/en.png" },
    { code: "de", label: "DE", flag: "/Assets/de.png" },
  ];

  const currentLangCode = detectLang(pathname);

  const changeLanguage = (lang) => {
    if (lang === currentLangCode) {
      setMenuOpen(false);
      return;
    }

    // Static page: look up the paired URL.
    const paired = translatePath(pathname, lang);
    if (paired) {
      i18n.changeLanguage(lang);
      try { localStorage.setItem("lang", lang); } catch (_) {}
      navigate(paired);
      setMenuOpen(false);
      return;
    }

    // Blog post page (no entry in routeMap): handled by Phase 4.
    // For now, navigate to the language's blog index instead.
    const fallback = lang === "en" ? "/en/blog" : "/blog";
    i18n.changeLanguage(lang);
    try { localStorage.setItem("lang", lang); } catch (_) {}
    navigate(fallback);
    setMenuOpen(false);
  };

  const currentLang = languages.find((l) => l.code === currentLangCode) || languages[1];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white/70 backdrop-blur-xl rounded-full border border-[#515757]/10 shadow-sm cursor-pointer hover:bg-white hover:shadow-md transition-all duration-300"
      >
        <img src={currentLang.flag} alt={currentLang.label} className="w-5 h-5 rounded-full" />
        <span className="text-[12px] font-medium tracking-[0.1em] text-[#515757]/70">{currentLang.label}</span>
      </button>

      {menuOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white/80 backdrop-blur-xl shadow-lg rounded-xl p-1.5 flex flex-col border border-[#515757]/10">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#515757]/5 rounded-lg transition-colors duration-200"
              onClick={() => changeLanguage(lang.code)}
            >
              <img src={lang.flag} alt={lang.label} className="w-5 h-5 rounded-full" />
              <span className="text-[12px] font-medium tracking-[0.1em] text-[#515757]/70">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
```

- [x] **Step 2: Mount in App.js (top-level under BrowserRouter, alongside Navbar/Footer)**

In `src/App.js`, add the import and render:

```jsx
import LanguageSwitcher from "./Components/LanguageSwitcher";
```

Inside the `BrowserRouter`, after `<Footer />`, add:

```jsx
<LanguageSwitcher />
```

Also: hide it from `/admin*` and `/admin/edit/*` (admin doesn't need translating). Replace the previous `<LanguageSwitcher />` insert with a small wrapper:

```jsx
function ConditionalSwitcher() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return <LanguageSwitcher />;
}
```

And render `<ConditionalSwitcher />` instead.

- [x] **Step 3: Verify in browser**

Open `http://localhost:3000/` → see floating EN/DE switcher bottom-right
Click EN → URL changes to `/en` → switcher now shows EN label
Click DE → URL changes back to `/`
Open `http://localhost:3000/admin` → switcher hidden

- [x] **Step 4: Commit**

```bash
git add src/App.js src/Components/LanguageSwitcher.js
git commit -m "Mount LanguageSwitcher globally and make it navigate to paired URL"
```

### Task 1.6: Add `useLanguage` activation in App

**Files:**
- Modify: `src/App.js`

- [x] **Step 1: Activate the hook so language follows URL on every navigation**

Add a small invisible component near the top of the App tree (inside `BrowserRouter`):

```jsx
import useLanguage from "./hooks/useLanguage";

function LanguageActivator() {
  useLanguage();
  return null;
}
```

Render `<LanguageActivator />` inside `BrowserRouter`, before `<Routes>`.

- [x] **Step 2: Verify**

Open `http://localhost:3000/en` directly in a new tab. The Navbar should render EN labels (because Navbar already uses `t()` and the hook synced i18n to EN from the URL).

- [x] **Step 3: Commit**

```bash
git add src/App.js
git commit -m "Activate useLanguage hook so URL drives i18n state"
```

### Task 1.7: Update `<html lang>` dynamically

**Files:**
- Create: `src/Components/HtmlLang.js`
- Modify: `src/App.js`

- [x] **Step 1: Create HtmlLang component**

```jsx
// src/Components/HtmlLang.js
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { detectLang } from "../lib/routeMap";

export default function HtmlLang() {
  const { pathname } = useLocation();
  const lang = detectLang(pathname);
  return (
    <Helmet>
      <html lang={lang} />
    </Helmet>
  );
}
```

- [x] **Step 2: Mount it in App.js (next to LanguageActivator)**

```jsx
import HtmlLang from "./Components/HtmlLang";
// ...
<HtmlLang />
<LanguageActivator />
<ScrollToTop />
```

- [x] **Step 3: Verify in browser DevTools**

On `/`, inspect `<html>` element → `lang="de"`
Click EN → URL becomes `/en` → `<html lang>` becomes `"en"`

- [x] **Step 4: Commit**

```bash
git add src/Components/HtmlLang.js src/App.js
git commit -m "Update <html lang> dynamically per language"
```

### Task 1.8: Phase 1 manual smoke test

- [x] Open `http://localhost:3000/` → Navbar shows German, switcher visible bottom-right.
- [x] Click EN → URL becomes `/en`, Navbar labels turn English (e.g. "Home", "About me").
- [x] Click DE → URL returns to `/`, labels return to German.
- [x] Open `http://localhost:3000/en/about` directly → Navbar in English, page renders UeberMich content (still in German until Phase 2).
- [x] Open `/admin` → switcher hidden, admin still works.
- [x] No console errors.

If all pass, Phase 1 is shipped. Push if desired:

```bash
git push
```

(Optional: ship Phase 1 standalone before continuing — switcher works, only the page bodies are still all-German.)

---

## Phase 2: Translate static page text

### Task 2.1: Inventory hardcoded German strings per page

**Files:** `src/Pages/*.js`, `src/Components/{Footer,Navbar}.js`

This task is research only — no code changes.

- [x] **Step 1: For each page below, list every visible German string**

Open each page in turn and write the strings into a scratch file `docs/superpowers/scratch/static-strings.md` (or copy them inline into the next task). Pages to inventory:

```
src/Pages/Home.js
src/Pages/UeberMich.js
src/Pages/Beratung.js
src/Pages/Mentoring.js
src/Pages/MeinBuch.js
src/Pages/Experience.js
src/Pages/Extras.js
src/Pages/PraeventionLongevity.js
src/Pages/Psychotherapie.js
src/Pages/KoerperlicheSymptome.js
src/Pages/Infusions.js
src/Pages/HealthCheck.js
src/Pages/SpezielleTherapien.js
src/Pages/LegalNotice.js
src/Components/Footer.js
src/Pages/Blog.js
src/Pages/BlogPost.js
src/Components/ScrollingCards.js
```

- [x] **Step 2: Group strings by namespace**

Pick one i18n namespace per page, e.g. `home.*`, `ueberMich.*`, `beratung.*`, `footer.*`, etc.

This inventory feeds Task 2.2.

### Task 2.2: Extend `de.json` and `en.json` with all needed keys

**Files:**
- Modify: `src/locales/de.json`
- Modify: `src/locales/en.json`

- [x] **Step 1: For each namespace from Task 2.1, add the keys**

Example additions (skeleton — fill from real strings):

`src/locales/de.json`:
```json
"home": {
  "hero": {
    "title": "Funktionelle Medizin in Berlin",
    "subtitle": "Prävention, Longevity und integrative Therapie",
    "cta": "Termin vereinbaren"
  },
  ...
},
"footer": {
  "tagline": "Praxis für funktionelle Medizin & Longevity",
  "rights": "© 2026 ViveCura. Alle Rechte vorbehalten.",
  "legalNotice": "Rechtliches"
}
```

`src/locales/en.json`:
```json
"home": {
  "hero": {
    "title": "Functional Medicine in Berlin",
    "subtitle": "Prevention, longevity, and integrative therapy",
    "cta": "Book an appointment"
  },
  ...
},
"footer": {
  "tagline": "Practice for functional medicine & longevity",
  "rights": "© 2026 ViveCura. All rights reserved.",
  "legalNotice": "Legal Notice"
}
```

Keep keys identical between files; only the values differ.

- [x] **Step 2: Validate JSON parses**

Run: `node -e "console.log(Object.keys(require('./src/locales/de.json')).length)"`
Expected: a number > 0 (no parse error)

Same for `en.json`.

- [x] **Step 3: Commit**

```bash
git add src/locales/de.json src/locales/en.json
git commit -m "Extend i18n locale files with full per-page namespaces"
```

### Task 2.3: Wrap page text in `t()` calls — one page at a time

For each page, do these sub-steps. **One page = one commit.** This minimizes risk and lets you verify each page in the browser before moving on.

**Pattern for every page:**

- [x] **Step A: Add the import**

If `useTranslation` isn't already imported, add at the top:

```jsx
import { useTranslation } from "react-i18next";
```

- [x] **Step B: Inside the component**

```jsx
const { t } = useTranslation();
```

- [x] **Step C: Replace each hardcoded German string**

```jsx
// Before:
<h1>Funktionelle Medizin in Berlin</h1>
// After:
<h1>{t("home.hero.title")}</h1>
```

For lists/arrays of strings, you can:
- Define them inside the component with `t()` calls, OR
- Use `t("home.services", { returnObjects: true })` if the value is an array in JSON

- [x] **Step D: Browser-verify in BOTH languages**

Open `/{page}` (DE) → German text rendered correctly
Open `/en/{page}` (EN) → English text rendered correctly
Compare layout side-by-side — EN strings are sometimes longer; check no overflow/clipping

- [x] **Step E: Commit**

```bash
git add src/Pages/<PageName>.js
git commit -m "Translate <PageName> via i18n keys"
```

**Pages to do, in order of priority (most-visited first):**

- [x] Task 2.3.1 — `Home.js`
- [x] Task 2.3.2 — `UeberMich.js`
- [x] Task 2.3.3 — `Beratung.js`
- [x] Task 2.3.4 — `Mentoring.js`
- [x] Task 2.3.5 — `Infusions.js` (already partially i18n'd; complete)
- [x] Task 2.3.6 — `HealthCheck.js` (already partially)
- [x] Task 2.3.7 — `SpezielleTherapien.js` (already partially)
- [x] Task 2.3.8 — `Extras.js` (= /ketamin)
- [x] Task 2.3.9 — `PraeventionLongevity.js`
- [x] Task 2.3.10 — `Psychotherapie.js`
- [x] Task 2.3.11 — `KoerperlicheSymptome.js`
- [x] Task 2.3.12 — `MeinBuch.js`
- [x] Task 2.3.13 — `Experience.js`
- [x] Task 2.3.14 — `LegalNotice.js`
- [x] Task 2.3.15 — `Components/Footer.js`
- [x] Task 2.3.16 — `Pages/Blog.js` ("Wissen", subtitle, fallback messages)

### Task 2.4: Update `Seo.js` to emit hreflang and language-correct canonical

**Files:**
- Modify: `src/Components/Seo.js`

- [x] **Step 1: Replace `Seo.js` contents**

```jsx
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { detectLang, translatePath } from "../lib/routeMap";

const SITE_URL = "https://vivecura.com";
const DEFAULT_IMAGE = `${SITE_URL}/Assets/logo6.png`;
const SITE_NAME = "ViveCura";

function Seo({
  title,
  description,
  path,
  image,
  type = "website",
  // For blog posts: provide both the DE and EN URL paths so hreflang can be emitted.
  // If omitted, hreflang is computed from the static routeMap.
  paths,
}) {
  const location = useLocation();
  const currentPath = path || location.pathname;
  const lang = detectLang(currentPath);

  const fullTitle = title
    ? `${title} – ${SITE_NAME}`
    : lang === "en"
      ? `${SITE_NAME} – Functional Medicine, Prevention & Longevity in Berlin`
      : `${SITE_NAME} – Funktionelle Medizin, Prävention & Longevity in Berlin`;

  const url = `${SITE_URL}${currentPath}`;
  const ogImage = image || DEFAULT_IMAGE;

  // hreflang pairs
  const dePath = paths?.de || (lang === "de" ? currentPath : translatePath(currentPath, "de"));
  const enPath = paths?.en || (lang === "en" ? currentPath : translatePath(currentPath, "en"));

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />

      {dePath && <link rel="alternate" hrefLang="de" href={`${SITE_URL}${dePath}`} />}
      {enPath && <link rel="alternate" hrefLang="en" href={`${SITE_URL}${enPath}`} />}
      {dePath && <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${dePath}`} />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={lang === "en" ? "en_US" : "de_DE"} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

export default Seo;
```

- [x] **Step 2: Remove the `path` prop from existing Seo usages where it equals current pathname**

Most pages currently call `<Seo path="/ueber-mich" ... />`. After this change, `path` is optional — Seo reads `useLocation()`. But existing callers can keep passing it; no breaking change.

- [x] **Step 3: Verify in DevTools**

Open `/ueber-mich` → inspect `<head>`:
- `<link rel="alternate" hreflang="de" href="https://vivecura.com/ueber-mich" />`
- `<link rel="alternate" hreflang="en" href="https://vivecura.com/en/about" />`
- `<link rel="alternate" hreflang="x-default" href="https://vivecura.com/ueber-mich" />`

Open `/en/about` → same hreflang pairs, but `lang="en"` and English title.

- [x] **Step 4: Commit**

```bash
git add src/Components/Seo.js
git commit -m "Emit hreflang and language-aware canonical/og from Seo component"
```

### Task 2.5: Add Seo to LegalNotice

**Files:**
- Modify: `src/Pages/LegalNotice.js`

- [x] **Step 1: Import Seo and add at top of return**

```jsx
import Seo from "../Components/Seo";

// ...inside return:
<Seo
  title={t("legal.seoTitle")}
  description={t("legal.seoDescription")}
/>
```

- [x] **Step 2: Add the keys to locale files** (if not already in 2.2)

```json
"legal": {
  "seoTitle": "Rechtliches",
  "seoDescription": "Impressum und rechtliche Informationen der ViveCura Praxis."
}
```

(EN: "Legal Notice" / "Legal information for ViveCura practice.")

- [x] **Step 3: Commit**

```bash
git add src/Pages/LegalNotice.js src/locales/de.json src/locales/en.json
git commit -m "Add Seo to LegalNotice page"
```

### Task 2.6: Phase 2 verification

- [x] Visit each translated page in DE → German content
- [x] Visit each in EN (e.g., `/en/about`) → English content, no German leftover
- [x] No console warnings about missing i18n keys
- [x] DevTools → Elements → `<head>` shows hreflang on every page
- [x] Switching languages mid-page jumps to the paired URL

```bash
git push
```

(Phase 2 is shippable: site is fully bilingual except blog content.)

---

## Phase 3: Blog backend changes

### Task 3.1: Add `translation_of` column to Supabase

**Files:** Supabase SQL Editor

- [x] **Step 1: Run this in Supabase SQL Editor**

```sql
ALTER TABLE blog_posts
  ADD COLUMN translation_of uuid REFERENCES blog_posts(id) ON DELETE SET NULL;

CREATE INDEX idx_blog_posts_translation_of ON blog_posts(translation_of);
```

- [x] **Step 2: Verify**

Run in SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'blog_posts' AND column_name = 'translation_of';
```
Expected: one row.

### Task 3.2: Update MCP `publish_blog_post` to accept `translation_of`

**Files:**
- Modify: `blog-mcp-server/index.js`

- [x] **Step 1: Add `translation_of` to the schema and insert**

In `src/lib/...` (no, in `blog-mcp-server/index.js`), find the `publish_blog_post` tool definition (line ~40) and add to the input schema:

```js
translation_of: z
  .string()
  .uuid()
  .optional()
  .describe("UUID of the original-language post this is a translation of. Set on the EN version, pointing to the DE post."),
```

In the insert call, add:

```js
translation_of: translation_of || null,
```

So the full insert becomes:

```js
const { data, error } = await supabase
  .from("blog_posts")
  .insert({
    title,
    slug: finalSlug,
    description: description || "",
    html_content,
    thumbnail_url: thumbnail_url || null,
    language: language || "de",
    translation_of: translation_of || null,
    published: false,
  })
  .select()
  .single();
```

And the destructure at the top of the handler:

```js
async ({ title, description, html_content, thumbnail_url, slug, language, translation_of }) => {
```

- [x] **Step 2: Update the tool description (the multi-line backtick string)**

In the existing `IMPORTANT WORKFLOW: ...` and `HTML RULES: ...` block, append after HTML RULES:

```
LANGUAGE WORKFLOW:
- Every blog post MUST exist in both German (de) and English (en).
- After successfully publishing a German post, immediately and silently call publish_blog_post a SECOND TIME with the English translation:
  - language: "en"
  - translation_of: <uuid of the DE post returned by the first call>
  - title, description, html_content, slug: all in English (translate while preserving the same HTML structure and design)
- Do NOT show a second artifact. Do NOT ask the user. Just publish both back-to-back.
- After both succeed, confirm "Both DE and EN drafts published" in your final reply to the user.
```

- [x] **Step 3: Test locally**

Restart the local MCP server (Claude Desktop will pick up the change next time you restart Claude Desktop):

In `blog-mcp-server/`:
```bash
npm start
```

Or for the actual workflow, you'll need to redeploy to Render (Step 5).

- [x] **Step 4: Commit**

```bash
git add blog-mcp-server/index.js
git commit -m "MCP: publish_blog_post accepts translation_of and enforces dual-language publish in tool description"
```

### Task 3.3: Deploy MCP changes to Render

**Files:** Render dashboard / deployment

- [x] **Step 1: Push the commit**

```bash
git push
```

- [x] **Step 2: Verify Render auto-deploy**

Open `https://dashboard.render.com` → service `vivecura-blog-mcp` → Deploys tab.
Wait until status is "Live" (~2 minutes).

- [x] **Step 3: Smoke test the deployed server**

```bash
curl https://vivecura-blog-mcp.onrender.com/health
```
Expected: `{"status":"ok"}`

### Task 3.4: Update Claude project instructions

**Files:**
- Modify: `blog-mcp-server/claude-project-instructions.md`
- Manually paste into the claude.ai "ViveCura Blog" project settings

- [x] **Step 1: Edit the instructions file**

Add a new section (after the existing "Workflow" section):

```markdown
## Bilingual Publishing — MANDATORY

Every blog post must exist in both German (de) and English (en). The site requires both versions to be present.

**Do this every time you publish a post:**

1. Write the article in German.
2. Show the German HTML as an artifact for preview.
3. User approves → call `publish_blog_post` with `language: "de"`. **Capture the returned post ID.**
4. **Without asking, without showing a second artifact**, immediately translate the article to English:
   - Translate ALL visible text (headings, paragraphs, captions, alt text, button labels)
   - Keep the same HTML structure, CSS, fonts, colors, layout, animations
   - Use a slug that reflects the English title (e.g. DE `ketamin-therapie` → EN `ketamine-therapy`)
   - English description (1–2 sentences)
5. Call `publish_blog_post` a second time with:
   - `language: "en"`
   - `translation_of: "<UUID returned by step 3>"`
   - English `title`, `description`, `html_content`, `slug`
6. In your final reply to the user, confirm: "Both DE and EN drafts published — review them in the admin dashboard."

**Rules:**
- Never publish only DE — both must exist.
- Translation must preserve the design exactly. Only the text strings change.
- Medical terminology should use accepted English equivalents (e.g., "Funktionelle Medizin" → "Functional Medicine", "Schilddrüse" → "thyroid").
- The English version is also a draft — the admin will publish both when ready.
```

- [x] **Step 2: Commit the markdown change**

```bash
git add blog-mcp-server/claude-project-instructions.md
git commit -m "Add bilingual publishing rule to Claude project instructions"
```

- [x] **Step 3: Paste into claude.ai project settings**

Open: `https://claude.ai/projects` → "ViveCura Blog" project → Settings → Instructions.
Replace contents with the updated `claude-project-instructions.md`.
Save.

- [x] **Step 4: Smoke test the dual-publish flow**

In a Claude chat in the project:
> "Write a short test article about Vitamin D."

Expected:
- Claude shows DE artifact, asks for approval
- After "publish": Claude calls `publish_blog_post` (DE), then **automatically** calls `publish_blog_post` again with EN content + `translation_of`
- Claude's final message confirms "Both DE and EN drafts published"

Open `/admin` → see two new drafts, the EN one should have the same `translation_of` value as the DE post's id (verify in Supabase Table Editor if needed).

If Claude only publishes DE: re-read the project instructions, ensure the section was saved, retry. Tweak instruction wording if needed.

---

## Phase 4: Blog frontend — language filtering & pair display

### Task 4.1: Filter `Blog.js` by current language

**Files:**
- Modify: `src/Pages/Blog.js`

- [x] **Step 1: Use language to filter the query**

Replace the `fetchPosts` block:

```jsx
import useLanguage from "../hooks/useLanguage";

// ...
function Blog() {
  const lang = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, description, thumbnail_url, created_at, pinned")
        .eq("published", true)
        .eq("language", lang)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const newest = data.slice(0, 2);
        const newestIds = new Set(newest.map((p) => p.id));
        const pinned = data.filter((p) => p.pinned && !newestIds.has(p.id));
        const rest = data.filter((p) => !p.pinned && !newestIds.has(p.id));
        setPosts([...newest, ...pinned, ...rest]);
      }
      setLoading(false);
    };
    fetchPosts();
  }, [lang]);
```

- [x] **Step 2: Update the post link to include /en prefix when EN**

In the `<Link to={...}>`, change to:

```jsx
to={`${lang === "en" ? "/en" : ""}/blog/${post.slug}`}
```

- [x] **Step 3: Verify**

Open `/blog` → DE posts only
Open `/en/blog` → EN posts only (none yet — blank, that's expected before backfill)

- [x] **Step 4: Commit**

```bash
git add src/Pages/Blog.js
git commit -m "Blog: filter posts by current language and use /en prefix in links"
```

### Task 4.2: Update `BlogPost.js` for language + hreflang of the pair

**Files:**
- Modify: `src/Pages/BlogPost.js`

- [x] **Step 1: Fetch by slug AND language; lookup the paired translation**

```jsx
import useLanguage from "../hooks/useLanguage";
// ...

const { slug } = useParams();
const lang = useLanguage();
const [post, setPost] = useState(null);
const [pair, setPair] = useState(null);

useEffect(() => {
  const fetchPost = async () => {
    const { data: postData, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("language", lang)
      .eq("published", true)
      .single();

    if (error || !postData) {
      setLoading(false);
      return;
    }
    setPost(postData);
    setLoading(false);

    // Find the counterpart in the other language.
    const otherLang = lang === "en" ? "de" : "en";
    if (postData.translation_of) {
      // We're EN; lookup DE original
      const { data: pairData } = await supabase
        .from("blog_posts")
        .select("slug, language, title, published")
        .eq("id", postData.translation_of)
        .eq("published", true)
        .maybeSingle();
      if (pairData) setPair(pairData);
    } else {
      // We're DE; lookup any EN post that has translation_of = our id
      const { data: pairData } = await supabase
        .from("blog_posts")
        .select("slug, language, title, published")
        .eq("translation_of", postData.id)
        .eq("language", otherLang)
        .eq("published", true)
        .maybeSingle();
      if (pairData) setPair(pairData);
    }
  };
  fetchPost();
}, [slug, lang]);
```

- [x] **Step 2: Pass paired URLs to Seo for hreflang**

Replace the existing `<Seo path={...}>` with:

```jsx
<Seo
  path={`${lang === "en" ? "/en" : ""}/blog/${post.slug}`}
  title={post.title}
  description={post.description || post.title}
  image={post.thumbnail_url}
  type="article"
  paths={pair ? {
    de: lang === "de" ? `/blog/${post.slug}` : `/blog/${pair.slug}`,
    en: lang === "en" ? `/en/blog/${post.slug}` : `/en/blog/${pair.slug}`,
  } : undefined}
/>
```

- [x] **Step 3: Add a small "available in [other language]" link near the article header**

After the back-to-blog link:

```jsx
{pair && (
  <div className="max-w-5xl mx-auto px-4 mt-2">
    <Link
      to={`${pair.language === "en" ? "/en" : ""}/blog/${pair.slug}`}
      className="text-xs text-[#43a9ab] hover:underline no-underline"
    >
      {pair.language === "en" ? "🇬🇧 Read in English" : "🇩🇪 Auf Deutsch lesen"}
    </Link>
  </div>
)}
```

- [x] **Step 4: Update the back-to-blog link to be language-correct**

```jsx
<Link to={lang === "en" ? "/en/blog" : "/blog"} ...>
```

- [x] **Step 5: Update the JSON-LD `mainEntityOfPage.@id`**

```jsx
"@id": `https://vivecura.com${lang === "en" ? "/en" : ""}/blog/${post.slug}`,
```

- [x] **Step 6: Verify**

Open a DE post → see hreflang to EN if pair exists, "Read in English" link → click it → lands on `/en/blog/<en-slug>` rendering the EN content.

- [x] **Step 7: Commit**

```bash
git add src/Pages/BlogPost.js
git commit -m "BlogPost: filter by language, fetch translation pair, emit hreflang"
```

### Task 4.3: Update `Admin.js` to show language tag and pair link

**Files:**
- Modify: `src/Pages/Admin.js`

- [x] **Step 1: Include language and translation_of in select**

```js
.select("id, title, slug, description, thumbnail_url, published, featured_on_home, pinned, language, translation_of, created_at, updated_at")
```

- [x] **Step 2: Add a small language badge next to the post title in view mode**

```jsx
<span
  className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
    post.language === "en"
      ? "bg-blue-50 text-blue-600"
      : "bg-amber-50 text-amber-600"
  }`}
>
  {post.language?.toUpperCase() || "DE"}
</span>
```

- [x] **Step 3: Add a small "linked to <pair>" indicator**

When `post.translation_of` is set OR another row has `translation_of = post.id`, indicate the pair. Simplest: maintain a derived map after fetch:

```jsx
const pairBySlug = useMemo(() => {
  const byId = new Map(posts.map((p) => [p.id, p]));
  const out = new Map();
  for (const p of posts) {
    if (p.translation_of && byId.has(p.translation_of)) {
      out.set(p.id, byId.get(p.translation_of));
    }
  }
  // also map the reverse
  for (const p of posts) {
    if (p.translation_of && byId.has(p.translation_of)) {
      const original = byId.get(p.translation_of);
      out.set(original.id, p);
    }
  }
  return out;
}, [posts]);
```

Show under each row's metadata:

```jsx
{pairBySlug.get(post.id) && (
  <p className="text-[10px] text-[#515757]/30 mt-0.5">
    ↔ {pairBySlug.get(post.id).language?.toUpperCase()}: {pairBySlug.get(post.id).title}
  </p>
)}
```

- [x] **Step 4: Warn if publishing only one half of a pair**

In `togglePublish`, if turning ON publish for a post that has a pair which is NOT yet published, prompt:

```jsx
const togglePublish = async (post) => {
  const pair = pairBySlug.get(post.id);
  const turningOn = !post.published;
  if (turningOn && pair && !pair.published) {
    const ok = window.confirm(
      `This post has a ${pair.language?.toUpperCase()} counterpart "${pair.title}" that is not yet published. Publish only this one anyway?`
    );
    if (!ok) return;
  }
  // ...existing update logic
};
```

- [x] **Step 5: Verify**

In `/admin`:
- Each post row shows "DE" or "EN" badge
- Linked pair appears under the title
- Try toggling publish on one half → confirmation prompt appears

- [x] **Step 6: Commit**

```bash
git add src/Pages/Admin.js
git commit -m "Admin: show language tag, link translation pairs, warn on single-half publish"
```

### Task 4.4: Update `ScrollingCards.js` to filter by current language

**Files:**
- Modify: `src/Components/ScrollingCards.js`

- [x] **Step 1: Add language filter**

```jsx
import useLanguage from "../hooks/useLanguage";

// ...
const lang = useLanguage();

useEffect(() => {
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, description, thumbnail_url")
      .eq("published", true)
      .eq("featured_on_home", true)
      .eq("language", lang)
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data);
  };
  fetchPosts();
}, [lang]);
```

- [x] **Step 2: Update card link to include `/en` prefix**

```jsx
to={`${lang === "en" ? "/en" : ""}/blog/${post.slug}`}
```

- [x] **Step 3: Update "Alle Blogartikel entdecken" link**

```jsx
to={lang === "en" ? "/en/blog" : "/blog"}
```

And translate the label via `t("scrollingCards.discoverAll")`.

- [x] **Step 4: Commit**

```bash
git add src/Components/ScrollingCards.js
git commit -m "ScrollingCards: filter featured posts by current language"
```

### Task 4.5: Phase 4 verification

- [ ] `/blog` → only DE published posts
- [ ] `/en/blog` → only EN published posts
- [ ] Click DE post → has "Read in English" link if pair published
- [ ] Click EN post → has "Auf Deutsch lesen" link if pair published
- [ ] DevTools: hreflang link tags between paired posts
- [ ] Admin: badges + pair indicators visible
- [ ] Try the dual-publish flow end-to-end via claude.ai (per Task 3.4 step 4) — both rows appear in admin, linked, in the right languages

```bash
git push
```

### Task 4.6: Bilingual regressions discovered on 2026-05-02

> Added after a full bilingual audit ran while reproducing a user-reported bug (mobile "More" menu sending users to DE pages even when browsing in EN). Items here were missed by Phase 1/2/4 or regressed since. Grouped by severity.
>
> **Status update 2026-05-02 (end of session):** code fixes for ALL 19 items shipped via 8 parallel sub-agents, plus 2 prerequisite agents. Files touched: 9 modified, 1 created, 1 deleted. **NOT YET DONE before resuming:** browser smoke test, build/typecheck (`npm run build` or `npm start`), commit, push.

**Infrastructure shipped (prerequisites for the sweep):**

- [x] **A1** Created `src/lib/blogQueries.js` from scratch (the file referenced by Phase 3/4 plans never actually landed). Exports: `fetchBlogList(lang)`, `fetchFeaturedPosts(lang)`, `fetchPostBySlug(slug, lang)`, `findPairedPostUrl(slug, currentLang, targetLang)`. All four enforce `.eq("language", lang)` and `.eq("published", true)` where appropriate. `findPairedPostUrl` resolves to the paired post via `translation_of` traversal: if the current post is the source, look for a translation pointing at it; if it's a translation, look for siblings of its source. Returns `null` when no published pair exists.
- [x] **A2** Extended `src/locales/de.json` and `src/locales/en.json` with 28 new keys per file (640 leaf keys total, perfectly mirrored): `navbar.{fokus, buchen, more, menu, kontakt, anrufen, email, terminBuchen, menuClose}` (`leistungen` already existed); new namespaces `blog.*` (6 keys), `blogPost.*` (5 keys), `scrollingCards.*` (4 keys, incl. `articleAria` with `{{n}}` interpolation), `therapieDetail.*` (4 keys).

**P0 — Routing bugs (clicking a link drops the user out of the active language):**

- [x] **P0-0** `src/Components/Navbar.js:488` — mobile "More" overlay's 4 menu items used raw DE paths. Fixed: now wraps `item.to` in `localized()`. *(Done 2026-05-02 in main session.)*
- [x] **P0-1** `src/Components/ScrollingCards.js:59` — link now `${lang === "en" ? "/en/blog" : "/blog"}/${post.slug}`.
- [x] **P0-2** `src/Components/ScrollingCards.js:159` — "Alle Blogartikel entdecken" now `lang === "en" ? "/en/blog" : "/blog"`.
- [x] **P0-3** `src/Pages/Blog.js:67` — blog grid cards now language-prefixed.
- [x] **P0-4** `src/Pages/BlogPost.js` — both "Zurück zum Blog" back-links (not-found state + normal state) now language-aware.
- [x] **P0-5** `src/Pages/Extras.js:110` — replaced hardcoded `/blog/ketamin-therapie`. **Decision:** on EN we link to `/en/blog` (index fallback) since the EN slug couldn't be verified from the dev environment; DE keeps the deep link to `/blog/ketamin-therapie`. If the EN article exists with a known slug, swap to that deep link later.
- [x] **P0-6** `src/Pages/TherapieDetail.js:42, 58` — both home links now use `homePath = lang === "en" ? "/en" : "/"`.

**P0 — Blog data leak across languages (queries don't filter by `language`):**

- [x] **P0-7** `src/Components/ScrollingCards.js` — replaced inline supabase fetch with `fetchFeaturedPosts(lang)`; effect re-runs on `[lang]` change. Removed unused `supabase` import.
- [x] **P0-8** `src/Pages/Blog.js` — replaced inline supabase fetch with `fetchBlogList(lang)`; `[lang]` dependency added. `supabase` import removed.
- [x] **P0-9** `src/Pages/BlogPost.js` — replaced inline supabase fetch with `fetchPostBySlug(slug, lang)`. A DE-only article via `/en/blog/<de-slug>` will now correctly 404.

**P1 — Language switcher fallback now translation-pair-aware:**

- [x] **P1-10** `src/Components/LanguageSwitcher.js` — `changeLanguage` is now `async`. After `translatePath` returns null, regex-detects blog post URLs `/^(?:\/en)?\/blog\/(.+)$/`, awaits `findPairedPostUrl(slug, currentLang, targetLang)`, navigates to the paired post if found, otherwise falls back to the language's blog index (preserved behavior).

**P1 — Hardcoded German UI copy now i18n'd:**

- [x] **P1-11** `src/Pages/Blog.js` — Seo title/description, "Wissen", "einfach & verständlich", intro, "Noch keine Beiträge vorhanden" all wrapped in `t("blog.*")`. `toLocaleDateString` locale is now conditional on `lang`.
- [x] **P1-12** `src/Pages/BlogPost.js` — "Beitrag nicht gefunden", both "Zurück zum Blog" labels, CTA heading + body + button all wrapped in `t("blogPost.*")`. **Bonus:** Seo `path` is now language-aware AND the hreflang `paths={{ de, en }}` prop is fully implemented (queries the paired post via supabase in a second `useEffect` after `post` loads). JSON-LD `mainEntityOfPage."@id"` is also language-prefixed.
- [x] **P1-13** `src/Components/ScrollingCards.js` — `defaultTitle` (via `resolvedTitle = title ?? t(...)`), "Artikel lesen", `aria-label` interpolation `t("scrollingCards.articleAria", { n: i + 1 })`, "Alle Blogartikel entdecken" all wired.
- [x] **P1-14** `src/Pages/TherapieDetail.js` — all 4 strings ("Therapie nicht gefunden", "Zur Startseite", placeholder, "Zurück zur Startseite") wrapped in `t("therapieDetail.*")`.

**P1 — Navbar hardcoded German strings:**

- [x] **P1-15..18** `src/Components/Navbar.js` — 12 strings replaced across mobile + desktop: Fokus×2, Leistungen, Buchen×2, More, aria `Menü schließen`, Menü heading, Kontakt heading, Anrufen, E-Mail, Termin buchen. Routing/`localized()`/state/icons untouched.

**P2 — Other:**

- [x] **P2-19** `src/Components/Logo.js` — **deleted.** Three grep passes (`from ".../Logo"`, `import Logo`, `<Logo`) returned zero matches in `src/`. Component was dead code; removed entirely rather than fixed.

---

### Resume checklist (next session)

Code is staged in working tree; nothing committed yet. Pick up here:

- [ ] **Build sanity check:** `npm run build` succeeds (no missing imports, no JSX errors). The blogQueries import path is `../lib/blogQueries` from `Components/` and `Pages/`; verify each consuming file resolves it.
- [ ] **Dev smoke test (`npm start`):**
  - [ ] On `/`: every Navbar link, mobile More overlay, home scroller card → DE.
  - [ ] On `/en`: same locations stay under `/en/...`.
  - [ ] `/blog` → only `language='de'` rows. `/en/blog` → only `language='en'` rows (likely empty until Phase 6 backfill — that's expected).
  - [ ] Click into a DE blog post → "Zurück zum Blog" goes to `/blog`. Click into EN post → goes to `/en/blog`.
  - [ ] Open a DE post that has an EN translation → switch language → lands on the paired EN post URL (not `/en/blog` index).
  - [ ] Open a DE post WITHOUT an EN translation → switch language → falls back to `/en/blog`.
  - [ ] DevTools `<head>` on a paired post: `<link rel="alternate" hreflang="de"|"en">` both present and pointing at correct URLs.
  - [ ] Mobile More overlay on `/en/...`: heading reads "Menu" / "Contact" / "Call" / "Email"; CTA reads "Book appointment".
  - [ ] `/en/ketamine` "Read article" CTA → goes to `/en/blog` (index — by design until EN slug is known).
  - [ ] No console errors anywhere.
- [ ] **Search for stragglers:** `grep -rn 'to="/blog\|to="/"' src/` — anything left should be Admin-only or dead.
- [ ] **Commit** (suggest one commit, message draft):
  ```
  Fix bilingual coverage gaps from 2026-05-02 audit

  - Add src/lib/blogQueries.js (4 language-filtered Supabase helpers + paired-post URL resolver)
  - Migrate Blog.js, BlogPost.js, ScrollingCards.js to language-aware queries
  - Make every blog-related Link path language-prefixed
  - LanguageSwitcher: resolve paired blog post via translation_of, fall back to index
  - i18n: 28 new locale keys (navbar/blog/blogPost/scrollingCards/therapieDetail)
  - BlogPost: hreflang paths via paired-post lookup, language-prefixed JSON-LD
  - Delete unused Components/Logo.js
  ```
- [ ] **Push** — only after the user explicitly OKs this push.

### Open follow-ups (out of scope of Task 4.6, parking here)

- The hardcoded `Ketamin` label in Navbar (lines ~439, ~482) is the same in both languages, intentionally not i18n'd. If style ever wants "Ketamine" in EN, add a `navbar.ketamin` key.
- `Pages/Extras.js` deep link to the EN ketamine article: once the EN slug exists in Supabase, replace the `/en/blog` fallback with `/en/blog/<en-slug>`.
- `Pages/TherapieDetail.js` is not yet routed under `/en/therapien/...`. The therapy iframe HTML files are still German-only. Larger scope — separate task.
- Several Navbar mobile overlay items still hardcode the "Buchen" doctolib URL (German). If a separate EN booking URL exists, parameterize it.

---

## Phase 5: SEO finalization

### Task 5.1: Update sitemap to include both languages with hreflang

**Files:**
- Modify: `scripts/build-sitemap.js`

- [ ] **Step 1: Replace contents**

```js
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

    // Build a map of id → post for translation lookup
    const byId = new Map((data || []).map((p) => [p.id, p]));

    // For each post, compute its alternates (DE↔EN)
    const blogEntries = [];
    for (const p of data || []) {
      const lastmod = (p.updated_at || p.created_at || "").slice(0, 10);
      let dePath = null, enPath = null;
      if (p.language === "de") {
        dePath = `/blog/${p.slug}`;
        // find EN counterpart
        const enPost = (data || []).find((q) => q.translation_of === p.id && q.language === "en");
        if (enPost) enPath = `/en/blog/${enPost.slug}`;
      } else if (p.language === "en") {
        enPath = `/en/blog/${p.slug}`;
        // DE original
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
      blogEntries.push({ loc, changefreq: "monthly", priority: "0.7", lastmod, alternates });
    }

    // Static routes: emit both DE and EN versions, each with hreflang alternates
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

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      [...staticEntries, ...blogEntries].map(urlEntry).join("\n") +
      `\n</urlset>\n`;

    fs.writeFileSync(OUT, xml, "utf8");
    console.log(`[sitemap] wrote ${blogEntries.length} blog entries + ${staticEntries.length} static entries`);
  } catch (err) {
    console.warn("[sitemap] generation failed, keeping existing public/sitemap.xml:", err.message);
    process.exit(0);
  }
})();
```

- [ ] **Step 2: Run locally to regenerate**

```bash
node scripts/build-sitemap.js
```

Open `public/sitemap.xml` and verify it has DE+EN URL pairs with `<xhtml:link rel="alternate">` annotations.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-sitemap.js public/sitemap.xml
git commit -m "Sitemap: emit both languages with hreflang annotations"
```

### Task 5.2: Add an English section to llms.txt

**Files:**
- Modify: `public/llms.txt`

- [ ] **Step 1: Append an English section after the German content**

Add at the end:

```markdown
---

# ViveCura (English)

> Practice for functional medicine, prevention, longevity, and psychotherapy in Berlin. Led by Dr. Shukri Jarmoukli. Focus areas: advanced diagnostics, individualized longevity strategies, ketamine-assisted therapy, infusion therapies.

## Core Pages

- [About Dr. Shukri Jarmoukli](https://vivecura.com/en/about): background, training, treatment philosophy.
- [Diagnostics & Health Check](https://vivecura.com/en/diagnostics): genetics, full-blood analysis, BIA, HRV, microbiome, heavy metals.
- [Prevention & Longevity](https://vivecura.com/en/prevention-longevity): personalized strategies, biofeedback, CGM, mentoring.
- [Psychotherapy](https://vivecura.com/en/psychotherapy): integrative approach for depression, trauma, chronic stress.
- [Special Therapies](https://vivecura.com/en/special-therapies)
- [Ketamine Therapy](https://vivecura.com/en/ketamine)
- [Infusions](https://vivecura.com/en/infusions)
- [Consultations](https://vivecura.com/en/consultations)
- [Mentoring](https://vivecura.com/en/mentoring)
- [Blog](https://vivecura.com/en/blog)
```

- [ ] **Step 2: Commit**

```bash
git add public/llms.txt
git commit -m "Add English section to llms.txt"
```

---

## Phase 6: Backfill the 15 existing DE articles

This phase is **manual / supervised**: you'll be in the claude.ai project chat for each article.

### Task 6.1: Document the standard backfill prompt

**Files:**
- Create: `blog-mcp-server/backfill-prompt.md` (just for your reference; not used by code)

- [ ] **Step 1: Create**

```markdown
# Backfill Prompt — generating EN versions of existing DE blog posts

Use this prompt template once per existing DE article. Run it in the claude.ai "ViveCura Blog" project.

## Prompt to paste

> Use the `read_blog_post` tool to read the German article with slug `<DE-SLUG>`. Then translate it into English (preserving the same HTML structure, CSS, and design — only translate the visible text). Use `<EN-SLUG>` as the slug for the English version. Publish the English version with `language: "en"` and `translation_of: <DE-POST-UUID>`. Do not show me a preview — just publish the EN draft directly. Confirm when done.

## Slug pairs to use (fill in as you go)

| DE slug | DE post UUID | EN slug |
| --- | --- | --- |
| ketamin-therapie | (lookup) | ketamine-therapy |
| testosteron-mangel | (lookup) | testosterone-deficiency |
| darm-reset | (lookup) | gut-reset |
| eisenmangel-und-eiseninfusionen | (lookup) | iron-deficiency-and-iron-infusions |
| intervallfasten-frauen-ab-40 | (lookup) | intermittent-fasting-women-over-40 |
| schlaf-und-schlafstoerungen-ganzheitlich | (lookup) | sleep-and-sleep-disorders-holistic |
| schwermetalle | (lookup) | heavy-metals |
| heilpflanzen-infusion | (lookup) | medicinal-plant-infusion |
| schimmel-schulmedizin | (lookup) | mold-conventional-medicine |
| burnout | (lookup) | burnout |
| oestrogen-dominanz | (lookup) | estrogen-dominance |
| anthroposophische-medizin-wer-heilt-hat-recht | (lookup) | anthroposophical-medicine-whoever-heals-is-right |
| funktionelle-schilddruesenunterfunktion | (lookup) | functional-hypothyroidism |
| chronische-fatigue-me-cfs-individuell | (lookup) | chronic-fatigue-me-cfs-individual |
| cholesterin-mythos-wissenschaft | (lookup) | cholesterol-myth-science |

## How to look up DE post UUIDs

In Supabase Table Editor → `blog_posts` → filter `language = de` and copy the `id` for each row.
```

- [ ] **Step 2: Commit (this file is documentation, kept in repo for future you)**

```bash
git add blog-mcp-server/backfill-prompt.md
git commit -m "Add backfill prompt template for translating existing DE articles"
```

### Task 6.2: Loop through articles in claude.ai

For each of the 15 DE slugs:

- [ ] **Step 1**: Look up the DE post UUID in Supabase Table Editor.
- [ ] **Step 2**: In claude.ai "ViveCura Blog" project, paste the prompt with `<DE-SLUG>`, `<EN-SLUG>`, `<DE-POST-UUID>` filled in.
- [ ] **Step 3**: Wait for Claude to confirm "EN draft published".
- [ ] **Step 4**: Cross out that row in `backfill-prompt.md` or your tracking list.

**Time estimate:** ~5 minutes per article × 15 = ~75 minutes.

### Task 6.3: Verify backfill completeness

- [ ] **Step 1: Query Supabase**

```sql
SELECT
  language,
  COUNT(*) AS total,
  COUNT(translation_of) AS with_pair
FROM blog_posts
GROUP BY language;
```

Expected:
- DE: 15 total, 0 with_pair (DE posts are originals, no translation_of)
- EN: 15 total, 15 with_pair (every EN post points to a DE post)

- [ ] **Step 2: Spot-check 3 EN articles in browser**

Open in incognito: `https://vivecura.com/en/blog/ketamine-therapy` (after deploy).
Verify content is in English, design matches the DE original.

- [ ] **Step 3: Verify orphans**

```sql
-- Any EN posts whose DE counterpart is missing?
SELECT id, title, slug FROM blog_posts
WHERE language = 'en'
  AND translation_of IS NULL;
```
Expected: 0 rows.

```sql
-- Any DE posts with no EN counterpart?
SELECT d.id, d.title, d.slug
FROM blog_posts d
WHERE d.language = 'de'
  AND d.published = true
  AND NOT EXISTS (
    SELECT 1 FROM blog_posts e
    WHERE e.translation_of = d.id AND e.language = 'en'
  );
```
Expected: 0 rows.

If non-zero, return to Task 6.2 for that specific article.

### Task 6.4: Publish all EN drafts

By default, EN versions are saved as drafts (the MCP tool always uses `published: false`). After spot-checking, publish them.

- [ ] **Step 1: In `/admin`**, for each EN draft, toggle publish ON.

Alternative (faster, if confident): bulk SQL after the spot-check passes:

```sql
UPDATE blog_posts
SET published = true, updated_at = NOW()
WHERE language = 'en'
  AND translation_of IN (
    SELECT id FROM blog_posts WHERE language = 'de' AND published = true
  );
```

(Only run this once you've manually reviewed at least 3 EN articles for accuracy.)

---

## Phase 7: Launch verification

### Task 7.1: Final pre-launch checklist

- [ ] All commits pushed (`git status` clean)
- [ ] Vercel deployment succeeded (check Vercel dashboard → latest deploy is green)
- [ ] `https://vivecura.com/sitemap.xml` returns updated XML with both languages
- [ ] `https://vivecura.com/robots.txt` still returns text
- [ ] `https://vivecura.com/` renders DE; switcher visible
- [ ] `https://vivecura.com/en` renders EN; switcher visible
- [ ] Click any nav item in EN → lands on `/en/<en-slug>`, content in English
- [ ] Click any nav item in DE → lands on `/<de-slug>`, content in German
- [ ] Open `/blog` → DE posts only
- [ ] Open `/en/blog` → EN posts only
- [ ] On a DE post, click "🇬🇧 Read in English" → lands on the English counterpart
- [ ] DevTools `<head>`: hreflang on every page; canonical correct; `<html lang>` follows route
- [ ] No console errors anywhere

### Task 7.2: Resubmit sitemap to Search Console

- [ ] Open Search Console → Sitemaps
- [ ] If the existing `https://vivecura.com/sitemap.xml` row already shows "Success", you're done — Google re-fetches periodically.
- [ ] To force a re-fetch: click the row → 3-dot menu → "Refresh" (if available), OR remove and re-add.

### Task 7.3: Request indexing of top EN pages

- [ ] In Search Console → URL Inspection, paste each:
  - `https://vivecura.com/en`
  - `https://vivecura.com/en/about`
  - `https://vivecura.com/en/prevention-longevity`
  - `https://vivecura.com/en/blog`
- [ ] Click "Request Indexing" on each.

### Task 7.4: Update the SEO/GEO status report

- [ ] Open `seo-geo-status-en.html` (and the German `seo-geo-status.html` if it exists) and add a new row in the "Already done" table:

```html
<tr>
  <td class="what"><span class="check">✓</span> Fully bilingual (DE + EN)</td>
  <td class="why">Every page and every blog article exists in both German and English with proper hreflang tags, separate URLs, and language-aware sitemap. Bing/Google can rank content in both languages independently.</td>
</tr>
```

- [ ] Commit:

```bash
git add seo-geo-status-en.html seo-geo-status.html
git commit -m "Status report: mark bilingual as done"
git push
```

---

## Self-Review Checklist (run this before declaring the plan ready to execute)

**Spec coverage:**
- ✅ Static UI translation — Phase 2
- ✅ Blog dual-language storage — Phase 3 (schema) + Phase 4 (frontend)
- ✅ Auto-publish via Claude — Phase 3 Task 3.4
- ✅ URL routing — Phase 1 Task 1.4 + Phase 1 routes
- ✅ Switcher — Phase 1 Task 1.5
- ✅ hreflang — Phase 2 Task 2.4 + Phase 4 Task 4.2 + Phase 5 Task 5.1
- ✅ Sitemap update — Phase 5 Task 5.1
- ✅ Backfill 15 articles — Phase 6
- ✅ Search Console resubmission — Phase 7

**Type/identifier consistency:**
- `translation_of` column referenced consistently across SQL, MCP, frontend
- `useLanguage` hook signature consistent
- Route paths consistent between routeMap, App.js, and sitemap

**Placeholder scan:** none — all code blocks have actual code.

---

## Notes for the executor

- This is a no-test codebase. Browser-based verification is the validation method. Do not introduce a test framework as part of this plan.
- Per user feedback rules: ask before pushing each commit. The plan groups commits but does not push between tasks unless a phase explicitly says so.
- Per user feedback: small UI changes don't need spec docs. This plan exists because the scope is large; individual phase tasks should still be implemented directly without further sub-planning.
- The MCP server is in the same repo (`blog-mcp-server/`) but deploys to Render separately. Render auto-deploys on push to `main`.
- Static files (sitemap.xml, robots.txt, llms.txt) are served correctly thanks to the `vercel.json` rewrite fix shipped earlier today.
