-- Lifesummit form submissions.
-- Partial saves: row created on Step 1, merged on Step 3 and Step 4.
-- Run this once in the Supabase SQL Editor.

-- 1) table
CREATE TABLE IF NOT EXISTS lifesummit_submissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            text UNIQUE NOT NULL,
  update_token          text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  language              text NOT NULL CHECK (language IN ('de','en')),

  -- Step 1 (required to create the row)
  vorname               text NOT NULL,
  nachname              text NOT NULL,
  email                 text NOT NULL,
  handy                 text NOT NULL,
  konsultationsart      text NOT NULL,
  kontakt_einwilligung  boolean NOT NULL,

  -- Step 3 (anamnese — 15 questions + supplements as JSONB)
  anamnese              jsonb,
  anamnese_submitted_at timestamptz,

  -- Step 4 (final)
  befunde_files         jsonb,
  dsgvo_consent         boolean,
  final_submitted_at    timestamptz,

  status                text NOT NULL DEFAULT 'step1'
);

CREATE INDEX IF NOT EXISTS idx_lifesummit_session  ON lifesummit_submissions (session_id);
CREATE INDEX IF NOT EXISTS idx_lifesummit_created  ON lifesummit_submissions (created_at DESC);

-- 2) updated_at trigger
CREATE OR REPLACE FUNCTION set_lifesummit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lifesummit_updated_at ON lifesummit_submissions;
CREATE TRIGGER trg_lifesummit_updated_at
  BEFORE UPDATE ON lifesummit_submissions
  FOR EACH ROW EXECUTE FUNCTION set_lifesummit_updated_at();

-- 3) RLS — anon can INSERT, authenticated can do everything; updates via RPC only
ALTER TABLE lifesummit_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert" ON lifesummit_submissions;
CREATE POLICY "anon insert"
  ON lifesummit_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth all" ON lifesummit_submissions;
CREATE POLICY "auth all"
  ON lifesummit_submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4) SECURITY DEFINER function: only path for anon UPDATE.
-- Requires both session_id and update_token to match.
CREATE OR REPLACE FUNCTION update_lifesummit_submission(
  p_session_id   text,
  p_update_token text,
  p_patch        jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lifesummit_submissions SET
    anamnese              = COALESCE(p_patch->'anamnese',          anamnese),
    befunde_files         = COALESCE(p_patch->'befunde_files',     befunde_files),
    dsgvo_consent         = COALESCE((p_patch->>'dsgvo_consent')::boolean, dsgvo_consent),
    anamnese_submitted_at = CASE WHEN p_patch ? 'anamnese' THEN now() ELSE anamnese_submitted_at END,
    final_submitted_at    = CASE WHEN p_patch ? 'final'    THEN now() ELSE final_submitted_at    END,
    status                = COALESCE(p_patch->>'status', status)
  WHERE session_id = p_session_id
    AND update_token = p_update_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid session or token';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_lifesummit_submission(text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION update_lifesummit_submission(text, text, jsonb) TO anon, authenticated;

-- 5) Storage policies for bucket "lifesummit-files"
-- IMPORTANT: create the bucket "lifesummit-files" as PRIVATE in the Supabase dashboard
-- BEFORE running this section, otherwise policies have no effect.
DROP POLICY IF EXISTS "anon upload lifesummit" ON storage.objects;
CREATE POLICY "anon upload lifesummit"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'lifesummit-files');

DROP POLICY IF EXISTS "auth all lifesummit" ON storage.objects;
CREATE POLICY "auth all lifesummit"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'lifesummit-files')
  WITH CHECK (bucket_id = 'lifesummit-files');
