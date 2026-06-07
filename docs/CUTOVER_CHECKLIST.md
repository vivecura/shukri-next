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

## B. Multi-domain redirects (5 min Vercel UI)

In the new Vercel project: **Settings -> Domains -> Add Domain** for each.
Set type to **Redirect to vivecura.com** with status **308 Permanent**.

- [ ] `www.vivecura.com` -> `vivecura.com`
- [ ] `vivecura.de` -> `vivecura.com`
- [ ] `www.vivecura.de` -> `vivecura.com`
- [ ] `vivecura.org` -> `vivecura.com`
- [ ] `www.vivecura.org` -> `vivecura.com`
- [ ] `lifestyledoctor.eu` -> `vivecura.com`
- [ ] `www.lifestyledoctor.eu` -> `vivecura.com`

Configure now; they activate at the DNS swap.

---

## C. blog-mcp-server -> new Render account

DONE OUT-OF-BAND. See `docs/MCP_SERVER_MIGRATION.md` for the runbook.

After it's deployed:
- [ ] New Render service is live and responds on `/health`
- [ ] MCP URL updated in Claude desktop config / Anthropic connector
- [ ] Old Render service archived (not deleted yet)

---

## D. The cutover itself (10 min)

Run **in this exact order** when A + B + C are green:

1. [ ] **Old Vercel project** -> Settings -> Domains -> remove `vivecura.com`
       (and all `.de` / `.org` / `lifestyledoctor.eu` entries).
2. [ ] **New Vercel project** -> Settings -> Domains -> Add Domain ->
       enter `vivecura.com`. Follow Vercel's DNS instructions. If your DNS
       is managed by Vercel, it auto-updates; otherwise edit A/CNAME at
       your registrar.
3. [ ] Wait for "Valid Configuration" green check (1-5 min usually).
4. [ ] Open `https://vivecura.com` in browser -> confirm new site, valid
       cert, no warnings, links work.
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
