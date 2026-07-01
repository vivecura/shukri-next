-- Kontaktformular (/kontakt): Geburtsdatum + Postadresse ergänzen.
-- Das Formular erfasst in Schritt 4 jetzt zusätzlich:
--   • geburtsdatum (PFLICHT)
--   • Straße, Hausnummer, PLZ, Stadt (OPTIONAL)
-- Analog zu den identitäts-/adressspalten von anamnese_submissions bekommen
-- diese Felder eigene, sauber abfragbare Spalten in contact_requests.
--
-- WICHTIG: Einmalig im Supabase SQL Editor ausführen BEVOR der neue
-- Formular-Code deployed wird. Das aktualisierte insert schreibt diese
-- Spalten direkt; ohne sie schlägt der Insert mit PostgREST-Fehler PGRST204
-- ("column not found") fehl und das Formular speichert nichts mehr.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS — mehrfaches Ausführen ist sicher.
-- Bestehende Zeilen bekommen NULL; neue Anfragen füllen die Spalten.
--
-- Geburtsdatum ist im DB-Schema bewusst NULLABLE (die Pflicht wird im
-- Formular erzwungen). So schlägt ein Insert nie an dieser Spalte fehl.
--
-- Keine RLS-Änderung nötig: die bestehende "anon insert"-Policy
-- (WITH CHECK true) deckt die neuen Spalten bereits ab.

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS geburtsdatum date,
  ADD COLUMN IF NOT EXISTS strasse      text,
  ADD COLUMN IF NOT EXISTS hausnummer   text,
  ADD COLUMN IF NOT EXISTS plz          text,
  ADD COLUMN IF NOT EXISTS stadt        text;
