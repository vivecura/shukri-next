-- ============================================================================
-- companion-foundation — Stufe 1 "Datenfundament der Patienten-App"
-- (ViveCura Companion, Pflichtenheft v2 vom 9.7.2026).
--
-- Sechs Tabellen auf dem Recall-Fundament (Stufe 0: recall_tasks + recalls.js):
--   companion_access             App-Zugang je Patient: Einwilligung (Gate!),
--                                Patientennummer VC-####, PIN-Hash + QR-Token
--                                nur VORBEREITET (Login = Stufe 2)
--   companion_plan_items         strukturierte Plan-Bausteine (Supplemente,
--                                To-dos, Vorbereitungen, nächste Schritte,
--                                Infusions-Nachsorge) — EINE Datenbasis für
--                                Patienten-App UND Mahmouds Anrufliste
--   companion_plan_imports       Import-Warteschlange: Claudes Entwurf →
--                                Shukris 1-Klick-Übernahme = ärztliche
--                                Verordnung; erst DANN wird etwas live
--   companion_checkins           Patienten-Tagebuch (Befinden 1-10, Freitext,
--                                Hilfe-Flag) — Schreiber kommt erst in Stufe 2
--   companion_item_logs          Abhak-Historie je Baustein (Serien + Recall)
--   companion_push_subscriptions Push-Abos je Gerät (Versand = Stufe 3)
--
-- Einmal im Supabase SQL Editor ausführen (SQL zuerst, dann Code — sonst
-- PGRST204). Idempotent: gefahrlos erneut ausführbar.
--
-- Leitprinzipien, die dieses Schema festnagelt:
--   * practice_id in JEDER Tabelle ab Tag 1 (Leitprinzip 5, Verkaufsphase).
--   * KI-Exit (Leitprinzip 6): jede von Claude erzeugte Zeile trägt ihre
--     Herkunft (plan_items.source bzw. plan_imports.created_by = 'claude') —
--     nachweisbar und gezielt löschbar. Notausgang: KI-NOTAUS.md.
--   * Einwilligungs-Gate (Leitprinzip 2): ohne KI-Einwilligung kein Zugang,
--     kein Import, kein QR — durchgesetzt in Code (companion.js) + UI.
--   * Kein Medizinprodukt (Leitprinzip 3): hier liegen NUR Erinnerungs- und
--     Tagebuch-Daten; keinerlei Auswertungs-/Alarm-Logik im Schema.
-- ============================================================================

-- ---- companion_access — App-Zugang je Patient -------------------------------
-- Genau EIN Zugang pro Patient (submission_id UNIQUE). consent_app_at ist das
-- Einwilligungs-Gate: NULL = kein App-Zugang, kein Claude-Import, kein QR.
-- Anamnese-Patienten: Häkchen consent_ki_pseudonym aus dem Anamnese-Payload
-- wird übernommen (consent_source='anamnese'). Manuell angelegte Patienten
-- unterschreiben beim Termin, Shukri setzt das Häkchen in der Akte
-- (consent_source='manuell'). Einwilligungstext macht der Anwalt final.
-- pin_hash + qr_token bleiben in Stufe 1 leer — QR+PIN-Login ist Stufe 2.
CREATE TABLE IF NOT EXISTS companion_access (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id     text NOT NULL DEFAULT 'vivecura',      -- Mandant (Verkaufsphase)
  submission_id   uuid NOT NULL UNIQUE
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  patient_number  text NOT NULL,                         -- Pseudonym, Format VC-#### (z. B. VC-0042); statt Klarname in App/Push; eindeutig JE MANDANT (Index unten)
  pin_hash        text,                                  -- NULL in Stufe 1; PIN-Login (Stufe 2) füllt das serverseitig
  qr_token        text UNIQUE,                           -- NULL in Stufe 1; QR-Einstieg (Stufe 2)
  consent_app_at  timestamptz,                           -- Zeitpunkt der KI-/App-Einwilligung; NULL = Gate zu
  consent_source  text                                   -- anamnese | manuell (woher die Einwilligung stammt)
    CHECK (consent_source IN ('anamnese', 'manuell')),
  consent_revoked_at timestamptz,                        -- Widerruf (DSGVO Art. 7(3)); gesetzt = Gate zu, überstimmt AUCH das unveränderliche Anamnese-Häkchen im Payload
  active          boolean NOT NULL DEFAULT true,         -- Zugang sperrbar ohne Datenverlust (DSGVO-Löschung separat)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Nachrüstung für Datenbanken, auf denen die Tabelle schon VOR der
-- Widerrufs-Spalte angelegt wurde (idempotent, CREATE TABLE IF NOT EXISTS
-- ändert bestehende Tabellen nicht). Ohne diese Spalte wäre der im
-- Einwilligungstext versprochene Widerruf ("jederzeit mit Wirkung für die
-- Zukunft") für Anamnese-Patienten technisch unmöglich — das Häkchen im
-- Anamnese-Payload ist unveränderlich, der Widerruf braucht einen eigenen,
-- übergeordneten Anker (ausgewertet in src/lib/companion.js → hasKiConsent).
ALTER TABLE companion_access
  ADD COLUMN IF NOT EXISTS consent_revoked_at timestamptz;

-- Patientennummer eindeutig JE MANDANT statt global (Verkaufsphase: zwei
-- Praxen dürfen beide eine VC-0001 haben). Gleichzeitig das Sicherheitsnetz
-- gegen das Nummern-Rennen zweier Admins (nextPatientNumber in companion.js):
-- die zweite Kollision scheitert als Insert-Fehler.
CREATE UNIQUE INDEX IF NOT EXISTS idx_companion_access_practice_number
  ON companion_access (practice_id, patient_number);

-- ---- companion_plan_items — strukturierte Plan-Bausteine ---------------------
-- Ein Baustein = eine Zeile aus Shukris Behandlungsprotokoll, maschinenlesbar.
-- Die App ERINNERT nur an Verordnetes ("Empfehlung von Shukri") und zeigt
-- Verlauf — sie empfiehlt selbst NICHTS (kein Medizinprodukt).
-- Terminerinnerungen: KEINE Doctolib-Duplikate — nur was Doctolib nicht kennt
-- (Vorbereitung "morgen nüchtern", Sensor-Anlage, Schritte ohne Termin).
CREATE TABLE IF NOT EXISTS companion_plan_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id            text NOT NULL DEFAULT 'vivecura', -- Mandant (Verkaufsphase)
  submission_id          uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  kind                   text NOT NULL                   -- supplement | todo | vorbereitung | next_step | infusion_followup
    CHECK (kind IN ('supplement', 'todo', 'vorbereitung', 'next_step', 'infusion_followup')),
  name                   text NOT NULL,                  -- z. B. "Magnesium (FormMed)" / "Kalt duschen"
  dosis                  text NOT NULL DEFAULT '',       -- konkret mit Zahl/Uhrzeit ("2 Kapseln à 300 mg"), nie "nach Absprache"; Stufe 3 (Nachbestell-Hinweis) rechnet hieraus, ggf. Zusatzspalte Packungsgröße dann
  instructions           text NOT NULL DEFAULT '',       -- Einnahme-/Durchführungshinweis ("morgens nüchtern")
  times                  time[] NOT NULL DEFAULT '{}',   -- Erinnerungs-Uhrzeiten, z. B. {08:00,20:00}
  days_of_week           int[] NOT NULL DEFAULT '{}',    -- ISO-Wochentage 1=Mo … 7=So; leeres Array = täglich
  reminder_enabled       boolean NOT NULL DEFAULT true,  -- einzelne Erinnerung an/aus (Shukri kann schalten)
  start_date             date,                           -- NULL = ab sofort
  end_date               date,                           -- NULL = offen; Behandlungs-Erinnerungen enden hiermit, der Zugang bleibt (§9)
  event_date             timestamptz,                    -- nur vorbereitung/infusion_followup: der Termin selbst
  followup_offsets_hours int[] NOT NULL DEFAULT '{}',    -- nur infusion_followup: Check-in-Abstände nach Infusion, z. B. {24,72}
  source                 text NOT NULL DEFAULT 'manuell' -- claude | manuell — Herkunfts-Label (KI-Exit, Leitprinzip 6)
    CHECK (source IN ('claude', 'manuell')),
  active                 boolean NOT NULL DEFAULT true,  -- Baustein pausieren/beenden ohne Löschen
  sort                   int NOT NULL DEFAULT 0,         -- Anzeige-Reihenfolge im Plan
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ---- companion_plan_imports — Import-Warteschlange ---------------------------
-- Claude (Skript _tools/companion_import.py, EIN widerrufbarer Schlüssel)
-- schreibt hier ENTWÜRFE (status='wartet'). Shukris "Übernehmen"-Klick im
-- Admin = ärztliche Verordnung: erst der erzeugt companion_plan_items und
-- setzt status='uebernommen'. Vorher ist NICHTS in App oder Anrufliste live.
-- payload = { items:[{kind,name,dosis,instructions,times,days_of_week,
-- start_date,end_date,event_date,followup_offsets_hours}], lesetext? }.
CREATE TABLE IF NOT EXISTS companion_plan_imports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',        -- Mandant (Verkaufsphase)
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,      -- der Entwurf; NUR Vorschlag, noch nicht verordnet
  status        text NOT NULL DEFAULT 'wartet'           -- wartet | uebernommen | verworfen
    CHECK (status IN ('wartet', 'uebernommen', 'verworfen')),
  created_by    text NOT NULL DEFAULT 'claude'           -- claude | manuell — Herkunfts-Label (KI-Exit)
    CHECK (created_by IN ('claude', 'manuell')),
  note          text NOT NULL DEFAULT '',                -- z. B. Protokoll-Quelle oder Verwerfungs-Grund
  decided_at    timestamptz,                             -- Zeitpunkt von Übernehmen/Verwerfen (Shukris Klick)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ---- companion_checkins — Patienten-Tagebuch ---------------------------------
-- Reines Tagebuch: eigene Einträge des Patienten, dargestellt als Verlauf —
-- KEINE Bewertung, KEINE Diagnose, KEIN Alarm (kein Medizinprodukt). Der
-- Hilfe-Knopf setzt nur help_flag; Reaktion kommt vom Menschen ("Wir melden
-- uns bei dir", rote Liste + Praxis-Mail — §9). Befüllt ab Stufe 2 über
-- Server-Routen; die Tabelle steht ab Stufe 1, damit die Datenbasis EINE ist.
CREATE TABLE IF NOT EXISTS companion_checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id     text NOT NULL DEFAULT 'vivecura',      -- Mandant (Verkaufsphase)
  submission_id   uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  checkin_date    date NOT NULL DEFAULT current_date,
  feeling         smallint CHECK (feeling BETWEEN 1 AND 10), -- Befinden 1-10
  energy          smallint CHECK (energy  BETWEEN 1 AND 10), -- Energie 1-10
  sleep           smallint CHECK (sleep   BETWEEN 1 AND 10), -- Schlaf 1-10
  notes           text NOT NULL DEFAULT '',
  help_flag       boolean NOT NULL DEFAULT false,        -- Hilfe-Knopf gedrückt (KEIN Notfallkanal — App zeigt immer "Im Notfall 112")
  context_kind    text NOT NULL DEFAULT 'tag',           -- tag | infusion | praeparat (Bezug des Check-ins)
  context_item_id uuid
    REFERENCES companion_plan_items(id) ON DELETE SET NULL, -- optionaler Bezug auf einen Baustein
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Genau EIN Check-in pro Patient, Tag und Kontext. NULL-Baustein-Bezug wird
-- auf die Null-UUID normalisiert, damit das UNIQUE auch für den Tages-Check-in
-- ohne Baustein greift (sonst wäre NULL != NULL und Duplikate möglich).
CREATE UNIQUE INDEX IF NOT EXISTS uq_companion_checkins_day_context
  ON companion_checkins (submission_id, checkin_date, context_kind,
    COALESCE(context_item_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---- companion_item_logs — Abhak-Historie ------------------------------------
-- Ein Log = ein abgehakter Plan-Slot ("Magnesium 20:00 am 12.7. genommen").
-- Grundlage für Serien-Anzeige (Stufe 2/3) und Smart Recall (Stufe 5).
-- Append-only: kein updated_at, kein Trigger. Abhaken rückgängig = Zeile weg.
CREATE TABLE IF NOT EXISTS companion_item_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',        -- Mandant (Verkaufsphase)
  item_id       uuid NOT NULL
    REFERENCES companion_plan_items(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE, -- denormalisiert für schnelle Per-Patient-Auswertung
  due_date      date NOT NULL,                           -- der Plan-Tag, der abgehakt wurde
  due_time      time,                                    -- der Plan-Slot (NULL = tagesbezogen ohne Uhrzeit)
  done_at       timestamptz NOT NULL DEFAULT now(),      -- wann tatsächlich abgehakt
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Doppel-Abhaken desselben Slots verhindern (NULL-Uhrzeit → 00:00 normalisiert).
CREATE UNIQUE INDEX IF NOT EXISTS uq_companion_item_logs_slot
  ON companion_item_logs (item_id, due_date, COALESCE(due_time, '00:00'::time));

-- ---- companion_push_subscriptions — Push-Abos je Gerät -----------------------
-- Web-Push-Abo pro Gerät (ein Patient kann mehrere Geräte haben). Versand
-- kommt in Stufe 3. Pseudonymisierung (§5): Push-Texte enthalten NIE
-- Klarnamen — nur Patientennummer bzw. neutrale Formulierungen.
CREATE TABLE IF NOT EXISTS companion_push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',        -- Mandant (Verkaufsphase)
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  endpoint      text NOT NULL UNIQUE,                    -- Web-Push-Endpoint (identifiziert das Gerät)
  p256dh        text NOT NULL DEFAULT '',                -- Client-Public-Key (Web Push)
  auth          text NOT NULL DEFAULT '',                -- Auth-Secret (Web Push)
  user_agent    text NOT NULL DEFAULT '',                -- fürs Geräte-Management im Admin
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ---- RLS: gleiches Muster wie patient_records / recall_tasks ("auth all") ----
-- WICHTIG (Sicherheit): Das ist Data-Level KEINE Rollentrennung. JEDES
-- eingeloggte Konto (auch Mahmoud) kann per API alle companion_*-Zeilen
-- lesen/schreiben. Die Admin-Weichen sind reine UI. Patienten greifen in
-- Stufe 1 noch GAR NICHT zu — der Patienten-Zugriff kommt in Stufe 2
-- ausschließlich über Server-Routen (Service-Key nur auf dem Server, Patient
-- sieht nur sich selbst; Zielbild §7: strenger als intern). Deshalb gibt es
-- hier BEWUSST keine Patienten-Policies. Echte rollenbasierte RLS ist ein
-- bewusster späterer Schritt — siehe securityNote in src/lib/companion.js.
-- Anon hat KEINE SELECT-Policy, ist also gegen Unbeteiligte weiterhin dicht.

ALTER TABLE companion_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth all" ON companion_access;
CREATE POLICY "auth all"
  ON companion_access
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE companion_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth all" ON companion_plan_items;
CREATE POLICY "auth all"
  ON companion_plan_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE companion_plan_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth all" ON companion_plan_imports;
CREATE POLICY "auth all"
  ON companion_plan_imports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE companion_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth all" ON companion_checkins;
CREATE POLICY "auth all"
  ON companion_checkins
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE companion_item_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth all" ON companion_item_logs;
CREATE POLICY "auth all"
  ON companion_item_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE companion_push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth all" ON companion_push_subscriptions;
CREATE POLICY "auth all"
  ON companion_push_subscriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---- Indizes -----------------------------------------------------------------
-- Akte: Per-Patient-Ansichten in AdminCompanionSection.
CREATE INDEX IF NOT EXISTS idx_companion_plan_items_submission
  ON companion_plan_items (submission_id, active, sort);
CREATE INDEX IF NOT EXISTS idx_companion_plan_imports_submission
  ON companion_plan_imports (submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_checkins_submission
  ON companion_checkins (submission_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_companion_item_logs_submission
  ON companion_item_logs (submission_id, due_date DESC);

-- Warteschlangen-Badge + Übersicht über alle Patienten (countPendingImports)
-- filtert von Tag 1 nach practice_id (Verkaufsphase-Semantik + defense-in-depth).
CREATE INDEX IF NOT EXISTS idx_companion_plan_imports_practice_status
  ON companion_plan_imports (practice_id, status, created_at DESC);

-- Erinnerungs-Worklist (Stufe 3, Push-Versand): aktive Bausteine je Mandant.
CREATE INDEX IF NOT EXISTS idx_companion_plan_items_practice_active
  ON companion_plan_items (practice_id, active, kind);

-- Hilfe-Knopf-Liste "Für Shukri" (Stufe 2): offene Hilfe-Fälle je Mandant.
CREATE INDEX IF NOT EXISTS idx_companion_checkins_practice_help
  ON companion_checkins (practice_id, help_flag, checkin_date DESC);

-- ---- updated_at automatisch pflegen -------------------------------------------
-- EINE gemeinsame Trigger-Funktion für alle companion-Tabellen (statt fünf
-- identischer Kopien); die Trigger-Namen bleiben je Tabelle im Hausmuster
-- trg_<tabelle>_updated_at. companion_item_logs ist append-only und hat
-- bewusst weder updated_at noch Trigger.
CREATE OR REPLACE FUNCTION set_companion_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companion_access_updated_at ON companion_access;
CREATE TRIGGER trg_companion_access_updated_at
  BEFORE UPDATE ON companion_access
  FOR EACH ROW
  EXECUTE FUNCTION set_companion_updated_at();

DROP TRIGGER IF EXISTS trg_companion_plan_items_updated_at ON companion_plan_items;
CREATE TRIGGER trg_companion_plan_items_updated_at
  BEFORE UPDATE ON companion_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION set_companion_updated_at();

DROP TRIGGER IF EXISTS trg_companion_plan_imports_updated_at ON companion_plan_imports;
CREATE TRIGGER trg_companion_plan_imports_updated_at
  BEFORE UPDATE ON companion_plan_imports
  FOR EACH ROW
  EXECUTE FUNCTION set_companion_updated_at();

DROP TRIGGER IF EXISTS trg_companion_checkins_updated_at ON companion_checkins;
CREATE TRIGGER trg_companion_checkins_updated_at
  BEFORE UPDATE ON companion_checkins
  FOR EACH ROW
  EXECUTE FUNCTION set_companion_updated_at();

DROP TRIGGER IF EXISTS trg_companion_push_subscriptions_updated_at ON companion_push_subscriptions;
CREATE TRIGGER trg_companion_push_subscriptions_updated_at
  BEFORE UPDATE ON companion_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_companion_updated_at();
