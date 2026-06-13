# Changelog

Dated summary of notable shipped work. Newest first.

---

## 2026-06-13

All of the below is live on `vivecura.com` (pushed to `main`).

### Cutover to the new Next.js deployment
- Moved `vivecura.com` from the old CRA/Vercel project to the new Next.js
  project (`shukri-next`, a different Vercel account). Verified ownership via
  `_vercel` TXT records in Hostinger DNS; apex A record already pointed at
  Vercel.
- Domains (all 308 → `vivecura.com`, http→https): `www.vivecura.com`,
  `vivecura.de`, `www.vivecura.de`, `vivecura.org`, `www.vivecura.org`.
  Redirect direction fixed so the **apex is canonical** (www → apex).
  `vivecura.eu` + `lifestyledoctor.eu` left as-is (not redirected).
- Supabase blog-revalidation webhook re-pointed to
  `https://vivecura.com/api/revalidate`.
- Runbook + status: `docs/CUTOVER_CHECKLIST.md`.

### Anamnese intake form (`/anamnese`, `public/anamnese.html`)
- Replaced the form with the v2 redesign and wired it to Supabase: file upload
  to the `befunde` bucket + insert into `anamnese_submissions`.
- Forced an **anon** Supabase client (`persistSession:false`) so the public
  form never inherits an admin login session (which the anon-only RLS rejects).
- Disabled `localStorage` persistence — the form starts blank on every refresh.
- Removed the sticky "Visit ViveCura website" bottom bar.
- Added the missing anon-insert RLS policy on `anamnese_submissions`
  (`supabase/migrations/2026-06-13-anamnese-submissions-rls.sql`).

### Blog / SEO
- Blog post `<title>` de-duplicated (was "… | ViveCura – ViveCura").
- Default **OG image**: posts without a thumbnail now get a generated
  logo-on-white card (via the route `opengraph-image.js`); blog cards show the
  logo placeholder instead of a letter.
- **Sitemap hreflang**: `sitemap.js` now emits reciprocal `de`/`en`/`x-default`
  alternates for static, topic, and paired blog-post URLs (was a flat list).

### Patienten admin (new)
- New **Patienten** tab in `/admin` to review `/anamnese` submissions and keep
  a per-patient record (9 tabs: Diagnose, Medikation, Nächster Termin, Nächste
  Schritte, Anamnese, Doctolib Notizen, Behandlungsplan, Befund, Rechnungen).
- Doctor-entered data saves to a new `patient_records` table (JSONB blob per
  submission); documents upload to the `befunde` bucket. Migration:
  `supabase/migrations/2026-06-13-patient-records.sql`.
- Public navbar/footer hidden on `/admin` (`SiteChrome`).
- "Ask ShukrAi" assistant box — **UI scaffold only**, not wired to AI yet.
- Full details: `docs/PATIENTS_ADMIN.md`.

### Required manual step
- Run `supabase/migrations/2026-06-13-patient-records.sql` in the Supabase SQL
  Editor so the Patienten tab's **Speichern** works in production.
