-- ============================================================================
-- Check-in-Erweiterung (Shukri, 10.7.): drei neue feste Skalen (Verdauung,
-- Stressbelastung, Klarheit) + individuelle Patienten-Symptome mit 0-10-Skala.
--
-- Skalen-Semantik (fuer Statistik wichtig):
--   verdauung  1-10, hoeher = besser (1 sehr schlecht, 10 sehr gut)
--   stress     1-10, hoeher = MEHR Stress (1 entspannt, 10 Vollgas) — gleiche
--              Richtung wie Anamnese-Frage 5
--   klarheit   1-10, hoeher = besser (1 Brain Fog, 10 glasklar)
--   Symptome   0-10 STAERKE, hoeher = schlimmer (0 gar nicht, 10 sehr stark)
--
-- Einmal im Supabase SQL Editor ausfuehren. Idempotent.
-- ============================================================================

ALTER TABLE companion_checkins
  ADD COLUMN IF NOT EXISTS verdauung smallint CHECK (verdauung BETWEEN 1 AND 10);
ALTER TABLE companion_checkins
  ADD COLUMN IF NOT EXISTS stress smallint CHECK (stress BETWEEN 1 AND 10);
ALTER TABLE companion_checkins
  ADD COLUMN IF NOT EXISTS klarheit smallint CHECK (klarheit BETWEEN 1 AND 10);

-- Bewertungen der individuellen Symptome je Check-in: { "<symptom_id>": 0-10 }.
-- JSONB statt eigener Zeilen-Tabelle: ein Check-in = eine Zeile bleibt wahr,
-- die Verlaufs-Statistik liest ohnehin die letzten 30 Check-ins am Stueck.
ALTER TABLE companion_checkins
  ADD COLUMN IF NOT EXISTS symptom_scores jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Individuelle Symptome je Patient ("Hautirritation", "Kopfschmerzen" …).
-- Angelegt vom Patienten in der App (created_by='patient') oder spaeter von
-- Shukri im Admin (created_by='shukri'). Deaktivieren statt loeschen, damit
-- alte Verlaufsdaten lesbar bleiben.
CREATE TABLE IF NOT EXISTS companion_patient_symptoms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  name          text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_by    text NOT NULL DEFAULT 'patient'
    CHECK (created_by IN ('patient', 'shukri')),
  sort          int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Kein doppeltes aktives Symptom mit gleichem Namen je Patient.
CREATE UNIQUE INDEX IF NOT EXISTS uq_companion_symptoms_name
  ON companion_patient_symptoms (submission_id, lower(name))
  WHERE active;

CREATE INDEX IF NOT EXISTS idx_companion_symptoms_submission
  ON companion_patient_symptoms (submission_id, active, sort);

-- RLS: gleiches Muster wie alle companion-Tabellen (Patienten-Zugriff laeuft
-- ausschliesslich ueber Server-Routen mit Service-Key).
ALTER TABLE companion_patient_symptoms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth all" ON companion_patient_symptoms;
CREATE POLICY "auth all"
  ON companion_patient_symptoms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_companion_patient_symptoms_updated_at ON companion_patient_symptoms;
CREATE TRIGGER trg_companion_patient_symptoms_updated_at
  BEFORE UPDATE ON companion_patient_symptoms
  FOR EACH ROW
  EXECUTE FUNCTION set_companion_updated_at();
