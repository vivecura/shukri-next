-- =============================================================================
-- ViveCura Companion — Stufe 3: Versand-Log für Push-Erinnerungen
-- Datei: supabase/migrations/2026-07-11-push-log.sql
-- Zweck: "Claim-first"-Dedupe. Jede Erinnerungs-Instanz (Patient + ref_key +
--        Berlin-Tag) wird VOR dem Versand als Zeile beansprucht. Der UNIQUE-
--        Index macht Doppel-Versand bei parallelen oder überlappenden
--        Cron-Läufen strukturell unmöglich (Insert-Konflikt = schon erledigt).
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.
-- Hinweis: companion_push_subscriptions + companion_plan_items (inkl. Index
--          idx_companion_plan_items_practice_active) existieren bereits aus
--          2026-07-09-companion-foundation.sql — hier kommt NUR das Log dazu.
-- =============================================================================

create table if not exists companion_push_log (
  id            uuid primary key default gen_random_uuid(),
  practice_id   text not null default 'vivecura',
  submission_id uuid not null references anamnese_submissions(id) on delete cascade,
  ref_key       text not null,
  sent_on       date not null,
  created_at    timestamptz not null default now()
);

comment on table companion_push_log is
  'Companion Stufe 3: Claim-Log des Push-Versands. Eine Zeile = eine beanspruchte Erinnerungs-Instanz. Insert VOR dem Versand; Unique-Konflikt = anderer Lauf hat schon geclaimt. Kein Klarname, keine Push-Texte — nur Referenzen.';
comment on column companion_push_log.ref_key is
  'Instanz-Schlüssel: "<plan_item_id>|<HH:MM>" (Einnahme/Empfehlung), "<plan_item_id>|prep-evening" / "<plan_item_id>|prep-morning" (Vorbereitung), "<plan_item_id>|fu-<h>h" (Infusions-Nachfrage, h = Offset in Stunden), "sr-noresponse" (Smart Recall Stufe 4: Tages-Claim je Patient + Berlin-Tag, ohne Item-Bezug).';
comment on column companion_push_log.sent_on is
  'Berlin-Kalendertag der Erinnerungs-Instanz (Europe/Berlin) — NICHT das UTC-Datum und NICHT der Lauf-Zeitpunkt.';

-- Der eigentliche Dedupe-Schutz: eine Instanz pro Patient, ref_key und Berlin-Tag.
create unique index if not exists uq_companion_push_log_instance
  on companion_push_log (submission_id, ref_key, sent_on);

-- RLS wie bei den übrigen Companion-Tabellen: authenticated darf alles
-- (Admin-UI), anon bleibt dicht. Der Versand-Job schreibt über den
-- Service-Key (umgeht RLS ohnehin), Patienten schreiben hier NIE direkt.
alter table companion_push_log enable row level security;

do $$
begin
  create policy "companion_push_log auth all" on companion_push_log
    for all to authenticated using (true) with check (true);
exception
  when duplicate_object then null; -- Policy existiert schon: ok (idempotent)
end $$;
