-- ============================================================================
-- recall_tasks — Follow-up-/Recall-Aufgaben pro Patient (anamnese submission).
-- Ein Recall = ein vorgemerkter Anruf: Grund, Fälligkeit, Fragen-Checkliste.
-- Nach dem Anruf setzt der Anrufer (z. B. Mahmoud) Ampel + Notiz + Status.
-- Rote/gelbe Fälle laufen zurück an Shukri (geklaert-Flag).
-- Angelegt manuell im Admin (created_by=shukri), von Claude beim Einsortieren
-- eines Behandlungsplans (claude) oder automatisch beim Speichern der nächsten
-- Schritte (auto). Mandantenfähig vorbereitet über practice_id (Verkaufsphase).
--
-- Einmal im Supabase SQL Editor ausführen (SQL zuerst, dann Code — sonst
-- PGRST204). Idempotent: gefahrlos erneut ausführbar. Diese Datei ist die
-- kanonische, zusammengeführte Version der Basis-Migration (2026-07-06) PLUS
-- der beiden begründeten Zusatzspalten (checklist_state, postpone_count) und
-- des practice_id-Worklist-Index. Wer die Basis-Migration schon ausgeführt hat,
-- kann diese Datei einfach nochmal laufen lassen: CREATE TABLE IF NOT EXISTS
-- ändert nichts, die ADD COLUMN IF NOT EXISTS ergänzen nur die neuen Spalten.
-- ============================================================================

CREATE TABLE IF NOT EXISTS recall_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',        -- Mandant (Verkaufsphase)
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  grund         text NOT NULL,
  fragen        jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{id,text}], wie die Akten-Felder
  due_date      date NOT NULL DEFAULT current_date,
  status        text NOT NULL DEFAULT 'offen',            -- offen | erledigt | nicht_erreicht
  ampel         text,                                     -- NULL | gruen | gelb | rot (nach dem Anruf)
  notiz         text NOT NULL DEFAULT '',
  geklaert      boolean NOT NULL DEFAULT false,           -- rote/gelbe Fälle: von Shukri abgehakt
  created_by    text NOT NULL DEFAULT 'shukri',           -- shukri | claude | auto
  called_by     text,                                     -- wer angerufen hat (z. B. mahmoud)
  done_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ---- Zusatzspalten (idempotent, streng additiv; ändern NICHTS an Basis-Bausteinen) ----
-- checklist_state: [{id, done:bool}] — Mahmouds während des Anrufs abgehakte
-- Fragen bleiben über Reload/Tab-Wechsel erhalten (referenziert fragen[].id).
-- Ohne diese Spalte gehen die Haken beim Unmount verloren (Panel remountet je Tab).
ALTER TABLE recall_tasks
  ADD COLUMN IF NOT EXISTS checklist_state jsonb NOT NULL DEFAULT '[]'::jsonb;

-- postpone_count: zählt "Nicht erreicht"-Verschiebungen, damit ein hartnäckig
-- unerreichbarer Patient sichtbar wird (Karte kann ab z. B. 3x einen Hinweis
-- zeigen / Shukri-Rückruf vorschlagen). Reines Sichtbarkeits-Feature.
ALTER TABLE recall_tasks
  ADD COLUMN IF NOT EXISTS postpone_count int NOT NULL DEFAULT 0;

-- ---- RLS: gleiches Muster wie patient_records (auth all) ----
-- WICHTIG (Sicherheit): Das ist Data-Level KEINE Rollentrennung. JEDES
-- eingeloggte Konto (auch Mahmoud) kann per API alle recall_tasks lesen/
-- schreiben. Die "Mahmoud sieht nur Anrufe"-Weiche ist reine UI. Echte
-- rollenbasierte RLS (JWT-Claim / practice_members-Tabelle) ist ein bewusster
-- späterer Schritt — siehe securityNote. Anon hat KEINE SELECT-Policy, ist also
-- gegen Unbeteiligte weiterhin dicht.
ALTER TABLE recall_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth all" ON recall_tasks;
CREATE POLICY "auth all"
  ON recall_tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---- Indizes ----
-- Per-Patient-Historie in der Akte (AdminRecallSection).
CREATE INDEX IF NOT EXISTS idx_recall_tasks_submission
  ON recall_tasks (submission_id, created_at DESC);

-- Anrufliste über alle Patienten (Legacy-Index der Basis-Migration; bleibt).
CREATE INDEX IF NOT EXISTS idx_recall_tasks_due
  ON recall_tasks (status, due_date);

-- Worklist filtert von Tag 1 nach practice_id (Verkaufsphase-Semantik +
-- defense-in-depth): zusammengesetzter Index deckt listWorklist/listForShukri.
CREATE INDEX IF NOT EXISTS idx_recall_tasks_practice_due
  ON recall_tasks (practice_id, status, due_date);

-- ---- updated_at automatisch pflegen ----
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
