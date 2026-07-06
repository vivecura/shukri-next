-- Recall-/Follow-up-Aufgaben pro Patient (anamnese submission). Ein Recall ist
-- ein vorgemerkter Anruf: Grund, Fälligkeit, Fragen-Checkliste. Nach dem Anruf
-- setzt der Anrufer (z. B. Mahmoud) Ampel + Notiz + Status. Rote Fälle laufen
-- zurück an Shukri (geklaert-Flag). Angelegt manuell im Admin, von Claude beim
-- Einsortieren eines Behandlungsplans, oder automatisch beim Speichern der
-- nächsten Schritte. Mandantenfähig über practice_id (spätere Verkaufsphase).
-- Einmal im Supabase SQL Editor ausführen.

CREATE TABLE IF NOT EXISTS recall_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  grund         text NOT NULL,
  fragen        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{id, text}], wie die Akten-Felder
  due_date      date NOT NULL DEFAULT current_date,
  status        text NOT NULL DEFAULT 'offen',        -- offen | erledigt | nicht_erreicht
  ampel         text,                                 -- NULL | gruen | gelb | rot (nach dem Anruf)
  notiz         text NOT NULL DEFAULT '',
  geklaert      boolean NOT NULL DEFAULT false,       -- rote/gelbe Fälle: von Shukri abgehakt
  created_by    text NOT NULL DEFAULT 'shukri',       -- shukri | claude | auto
  called_by     text,                                 -- wer angerufen hat (z. B. mahmoud)
  done_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recall_tasks ENABLE ROW LEVEL SECURITY;

-- Nur der/die eingeloggte(n) Admin(s) — gleiches Muster wie patient_records.
-- (Die UI-Einschränkung "Mahmoud sieht nur den Anrufe-Tab" kommt in Baustein 3;
--  eine echte rollenbasierte Policy rüsten wir dort bei Bedarf nach.)
DROP POLICY IF EXISTS "auth all" ON recall_tasks;
CREATE POLICY "auth all"
  ON recall_tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Häufigste Zugriffe: offene Anrufe über alle Patienten (Anrufliste),
-- und alle Recalls eines Patienten (in der Akte).
CREATE INDEX IF NOT EXISTS idx_recall_tasks_due
  ON recall_tasks (status, due_date);
CREATE INDEX IF NOT EXISTS idx_recall_tasks_submission
  ON recall_tasks (submission_id, created_at DESC);

-- updated_at automatisch pflegen
CREATE OR REPLACE FUNCTION set_recall_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recall_updated_at ON recall_tasks;
CREATE TRIGGER trg_recall_updated_at
  BEFORE UPDATE ON recall_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_recall_updated_at();
