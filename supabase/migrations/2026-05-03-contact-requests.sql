-- Contact request form submissions.
-- Run this once in the Supabase SQL editor.

-- 1) status enum
DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM ('new', 'in_progress', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) table
CREATE TABLE IF NOT EXISTS contact_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  language         text NOT NULL CHECK (language IN ('de', 'en')),
  anliegen         text[]  NOT NULL DEFAULT '{}',
  situation        text,
  dauer            text,
  vorname          text NOT NULL,
  nachname         text NOT NULL,
  email            text NOT NULL,
  telefon          text NOT NULL,
  versicherung     text NOT NULL CHECK (versicherung IN ('privat', 'selbstzahler')),
  preferred_days   text[]  NOT NULL DEFAULT '{}',
  preferred_times  text[]  NOT NULL DEFAULT '{}',
  dsgvo_consent_at timestamptz NOT NULL,
  status           contact_status NOT NULL DEFAULT 'new',
  notes            text
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);

-- 3) auto-update updated_at
CREATE OR REPLACE FUNCTION set_contact_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_requests_updated_at ON contact_requests;
CREATE TRIGGER trg_contact_requests_updated_at
  BEFORE UPDATE ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION set_contact_requests_updated_at();

-- 4) RLS — anonymous can INSERT only; authenticated admin can do everything
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert" ON contact_requests;
CREATE POLICY "anon insert"
  ON contact_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth select" ON contact_requests;
CREATE POLICY "auth select"
  ON contact_requests
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth update" ON contact_requests;
CREATE POLICY "auth update"
  ON contact_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth delete" ON contact_requests;
CREATE POLICY "auth delete"
  ON contact_requests
  FOR DELETE
  TO authenticated
  USING (true);
