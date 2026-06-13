-- Anamnese (patient intake) submissions from the public form at /anamnese.
-- The `anamnese_submissions` table already exists in the website/blog Supabase
-- project, but it was missing the anon INSERT policy, so the public form could
-- never save (Postgres error 42501: "new row violates row-level security
-- policy"). This adds the same anon-insert / auth-read pattern used by
-- contact_requests, lifesummit_submissions and honorar_submissions.
--
-- Run this once in that project's Supabase SQL Editor.
--
-- Expected columns (created earlier, not recreated here): id, created_at,
-- lang, email, vorname, nachname, handy, geburtsdatum, payload (jsonb),
-- signature_dataurl (text), befunde_urls (jsonb/text[]).

ALTER TABLE anamnese_submissions ENABLE ROW LEVEL SECURITY;

-- anon (the public form, using the public anon key) may INSERT only.
DROP POLICY IF EXISTS "anon insert" ON anamnese_submissions;
CREATE POLICY "anon insert"
  ON anamnese_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- reading is restricted to the authenticated admin.
DROP POLICY IF EXISTS "auth read" ON anamnese_submissions;
CREATE POLICY "auth read"
  ON anamnese_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- NOTE: the "befunde" storage bucket already allows anon upload (verified
-- 2026-06-13), so no storage policy change is needed for the file uploads.
