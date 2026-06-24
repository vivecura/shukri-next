-- Anamnese (patient intake): add postal address to the public form at /anamnese.
-- The form now collects Straße, Hausnummer, Postleitzahl and Stadt in Step 1.
-- These are stored in the `payload` jsonb automatically (like every form field),
-- but — matching the existing identity columns (vorname, nachname, email, handy,
-- geburtsdatum) — we also give them their own clean, queryable columns.
--
-- Run this once in that project's Supabase SQL Editor BEFORE deploying the new
-- form code. The updated insert writes these columns directly; without them the
-- insert would fail with PostgREST error PGRST204 ("column not found").
--
-- Idempotent: ADD COLUMN IF NOT EXISTS — safe to run more than once.
-- Existing rows get NULL for the new columns; new submissions fill them.
--
-- No RLS change needed: the existing "anon insert" policy (WITH CHECK true)
-- already covers the new columns.

ALTER TABLE anamnese_submissions
  ADD COLUMN IF NOT EXISTS strasse    text,
  ADD COLUMN IF NOT EXISTS hausnummer text,
  ADD COLUMN IF NOT EXISTS plz        text,
  ADD COLUMN IF NOT EXISTS stadt      text;
