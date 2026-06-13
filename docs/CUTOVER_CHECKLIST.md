# Cutover Checklist

Resume-from-anywhere list for migrating `vivecura.com` from the old CRA
Vercel deployment to the new Next.js deployment. Code work is done; what's
left is verification, multi-domain setup, the DNS swap itself, and cleanup.

When resuming a session, tell Claude what you've finished and we pick up
at the next unchecked item.

---

## A. Pixel-parity spot check (15-30 min)

Open the new Vercel preview side-by-side with live `vivecura.com`. Compare
at 1440x900 + mobile (390x844). Tell Claude about anything that looks off
and we fix in-session.

Pages worth checking:
- [ ] `/` home (animations, hero)
- [ ] `/psychotherapie` (longest page, heaviest accordion)
- [ ] `/diagnostik` (scroll video chapters)
- [ ] `/blog` (list)
- [ ] one blog post (verify article body looks right after the layout fix)
- [ ] `/ueber-mich`
- [ ] `/kontakt` form (4 steps)
- [ ] `/therapien/ketamin` (iframe was replaced by SSR inline)
- [ ] Mobile nav drawer + hamburger
- [ ] Language switcher (click DE/EN, verify both static + blog routing)

---

## B. Multi-domain redirects (Vercel UI)

Verified against the OLD project's Domains page on 2026-06-13. The actual
set is smaller than originally guessed: **1 primary + 3 redirects**. There
is NO `.org` and NO `lifestyledoctor.eu` attached to the Vercel project.

Each of these is currently attached to the OLD project, so it must be
removed there before it can be added to the new project. That makes B part
of the cutover (step D), not a thing to pre-stage. Folded into D below.

Redirects to recreate on the NEW project (type **Redirect to vivecura.com**,
status **308 Permanent**):
- [ ] `www.vivecura.com` -> `vivecura.com`
- [ ] `vivecura.de` -> `vivecura.com`
- [ ] `www.vivecura.de` -> `vivecura.com`

Primary on the NEW project:
- [ ] `vivecura.com` (Production)

Do NOT touch:
- `shukri-sigma.vercel.app` — the old project's auto-assigned Vercel
  subdomain. Stays with the old project; not migrated.

If `vivecura.org` / `lifestyledoctor.eu` are owned and should redirect too,
that's a registrar-level task, separate from this Vercel migration. Does
not block cutover.

---

## C. blog-mcp-server -> new Render account

DONE on 2026-06-07. Runbook: `docs/MCP_SERVER_MIGRATION.md`.

- [x] New Render service live at
      `https://vivecura-blog-mcp-w7q5.onrender.com`
- [x] `/health` returns `{"status":"ok"}`
- [x] MCP `/mcp` endpoint responds and advertises 4 tools
- [x] Claude connector URL updated to the new Render URL
- [x] Tools verified in Claude: list_blog_posts,
      list_posts_missing_translation, publish_blog_post, read_blog_post
- [ ] **Still to do**: suspend (don't delete) the old Render service
      after ~7 days of new service working. Final delete after ~30 days.

---

## D. The cutover itself (10 min)

Run **in this exact order** when A + B + C are green:

CUTOVER STARTED 2026-06-13. New project = `shukri-next` (DIFFERENT Vercel
account than old, so each domain needs a cross-account TXT verification at
`_vercel.<domain>` added in Hostinger DNS). DNS is at Hostinger
(nameservers dns-parking.com). Apex A record already `216.198.79.1` (Vercel)
and `www` CNAME already at a vercel-dns target -> no A/CNAME change needed,
only the ownership TXT.

1. [x] **Old project** -> removed `vivecura.com` + `www.vivecura.com`.
2. [x] **New project** -> added `vivecura.com` + `www.vivecura.com`.
       Added TXT `_vercel` = `vc-domain-verify=vivecura.com,5b778d0a070c4e9c887b`
       and `vc-domain-verify=www.vivecura.com,2c479931b76857bbc0b2` in
       Hostinger -> both verified -> Valid Configuration.
   - [x] Fixed redirect direction: `vivecura.com` = Production,
         `www.vivecura.com` = 308 -> `vivecura.com` (code canonical is the
         non-www apex: `SITE_URL` in layout/robots/sitemap).
   - [x] `.de` redirects done: `vivecura.de` + `www.vivecura.de` moved to
         new project as 308 -> `vivecura.com`. Verified instantly (DNS
         already pointed at Vercel, no TXT needed). curl-confirmed both
         308 -> https://vivecura.com/ -> 200.
   - [x] `.org` redirects done (2026-06-13): `vivecura.org` + `www.vivecura.org`
         added as 308 -> `vivecura.com`; repointed A `@` -> `216.198.79.1` and
         `www` CNAME to the Vercel target in Hostinger. curl-confirmed live
         (http + https -> apex).
   - [ ] NOT done (optional): `vivecura.eu` + `lifestyledoctor.eu` still point
         elsewhere; not redirected. Same recipe as `.org` if wanted later.
3. [x] Apex + www show Valid Configuration.
4. [x] Verified live: `https://vivecura.com` -> 200, new build;
       `www` -> 308 -> apex. (curl-confirmed 2026-06-13.)
5. [ ] **Supabase webhook URL update**: Database -> Webhooks ->
       `revalidate-blog-on-change` -> change URL from
       `https://shukri-next-git-main-shukri-s-projects.vercel.app/api/revalidate`
       to `https://vivecura.com/api/revalidate`. Same secret. Save.
6. [ ] Smoke-test webhook: edit a draft blog post in `/admin` -> reload
       the public blog page -> changes appear in ~3s.
7. [ ] **Google Search Console**: Property settings -> Sitemaps -> Add
       `https://vivecura.com/sitemap.xml`.
8. [ ] **Search Console URL Inspection** on `/`, `/blog`, one blog post.
       Click "Request indexing" on each. Confirms Google sees real HTML.

---

## E. Post-cutover cleanup (later, low urgency)

- [ ] **+72h stable**: delete local `_legacy/` folder (already gitignored,
      just frees ~1 GB disk).
- [ ] **+7 days stable**: archive (don't delete) old `sami23ibrahim`
      Vercel project. The old CRA deployment is your rollback escape
      hatch for the first week.
- [ ] **+7 days stable**: archive (don't delete) old
      `sami23ibrahim/shukri` GitHub repo.
- [ ] **+30 days stable**: deletable if you want.

Things that DON'T change at cutover:
- GA4 tracking tag `G-PVM2RGELWW` (same in code).
- Supabase project (same URL + keys; we never touched the DB).
- DNS for the `lifesummit-files` and `befunde` storage buckets (same).
- Email and phone numbers (hardcoded in components; no change).

---

## Already done (do not redo)

- All code: Phases 1, 2, 3, 4 (commits 1dd8a8d through 5723a44).
- Supabase webhook wired against preview URL + tested.
- Supabase Storage `befunde` policies for both anon and authenticated.
- Blog detail layout fix (no duplicate thumbnail/title).
- LanguageSwitcher mounted in root layout.
- Dynamic sitemap, robots, OG images, JSON-LD.
- H1 sr-only on home pages.
