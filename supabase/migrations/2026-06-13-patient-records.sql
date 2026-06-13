-- Doctor-entered record data per anamnese (patient) submission: next
-- appointment, invoices, and the other record tabs we add over time. Stored
-- as a single JSONB blob keyed to the submission so the shape can evolve
-- without further migrations. Run once in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS patient_records (
  submission_id uuid PRIMARY KEY
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;

-- Only the authenticated admin may read/write patient records.
DROP POLICY IF EXISTS "auth all" ON patient_records;
CREATE POLICY "auth all"
  ON patient_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admin (authenticated) full access to the "befunde" bucket so it can read
-- patient uploads via signed URLs and store invoice documents under
-- rechnungen/<submission_id>/...  (Patient uploads still arrive via anon.)
DROP POLICY IF EXISTS "auth all befunde" ON storage.objects;
CREATE POLICY "auth all befunde"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'befunde')
  WITH CHECK (bucket_id = 'befunde');
