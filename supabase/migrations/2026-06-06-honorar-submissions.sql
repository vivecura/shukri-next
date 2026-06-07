-- Honorarvereinbarung (fee-agreement) submissions from the practice iPad (/honorar).
-- Stored in the existing website/blog Supabase project (same one as the blog).
-- Run this once in that project's Supabase SQL Editor.

-- 1) table
CREATE TABLE IF NOT EXISTS honorar_submissions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             timestamptz NOT NULL DEFAULT now(),

  service_slug           text NOT NULL,   -- e.g. 'ketamin'
  service_title          text NOT NULL,   -- full <h1> at time of signing
  gesamt                 text NOT NULL,   -- total line, as displayed

  patient_name           text NOT NULL,
  patient_geburtsdatum   date NOT NULL,
  ort_datum              text,

  patient_signature      text NOT NULL,   -- PNG data URL
  arzt_signature         text NOT NULL    -- PNG data URL
);

CREATE INDEX IF NOT EXISTS idx_honorar_created ON honorar_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_honorar_service ON honorar_submissions (service_slug);

-- 2) RLS — anon (the iPad) may INSERT only; reading is restricted to authenticated admin.
ALTER TABLE honorar_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert" ON honorar_submissions;
CREATE POLICY "anon insert"
  ON honorar_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth read" ON honorar_submissions;
CREATE POLICY "auth read"
  ON honorar_submissions
  FOR SELECT
  TO authenticated
  USING (true);
