-- ============================================================================
-- ViveCura Companion — Community (Stufe 6, vorgezogen am 12.7. auf Shukris
-- Wunsch): Beitraege + Kommentare + Fotos/Videos + 1:1-Chat + Meldungen.
--
-- Grundsaetze:
--  * Pseudonym: In der Community erscheint NIE der Klarname — nur der
--    selbstgewaehlte Nickname (Spalte auf companion_access). Beitritt ist
--    Opt-in (community_joined_at), erst mit Regeln-Zustimmung + Nickname.
--  * Alle Patienten-Zugriffe laufen ueber Server-Routen (Service-Key),
--    RLS bleibt auth-only wie bei allen companion-Tabellen.
--  * Moderation: hidden-Flag (Shukri blendet aus), companion_reports fuer
--    den Melden-Button. ⚠️ Anwalts-Gate vor echtem Patienten-Rollout.
-- Idempotent: gefahrlos mehrfach ausfuehrbar.
-- ============================================================================

-- Community-Identitaet am bestehenden Zugang
ALTER TABLE companion_access
  ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE companion_access
  ADD COLUMN IF NOT EXISTS community_joined_at timestamptz;

-- Nickname eindeutig je Mandant (nur wenn gesetzt)
CREATE UNIQUE INDEX IF NOT EXISTS uq_companion_access_nickname
  ON companion_access (practice_id, lower(nickname))
  WHERE nickname IS NOT NULL;

-- ---- Beitraege --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companion_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  body          text NOT NULL DEFAULT '',
  media         jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{path,type:'image'|'video',size}]
  hidden        boolean NOT NULL DEFAULT false,       -- Moderation (Shukri)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companion_posts_feed
  ON companion_posts (practice_id, hidden, created_at DESC);

-- ---- Kommentare -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companion_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',
  post_id       uuid NOT NULL
    REFERENCES companion_posts(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  body          text NOT NULL,
  hidden        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companion_comments_post
  ON companion_comments (post_id, hidden, created_at);

-- ---- 1:1-Chat ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companion_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',
  sender_id     uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  body          text NOT NULL DEFAULT '',
  media         jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companion_messages_convo
  ON companion_messages (practice_id, sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_messages_unread
  ON companion_messages (recipient_id, read_at, created_at DESC);

-- ---- Meldungen (Melden-Button) ----------------------------------------------
CREATE TABLE IF NOT EXISTS companion_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   text NOT NULL DEFAULT 'vivecura',
  target_kind   text NOT NULL CHECK (target_kind IN ('post','comment','message','member')),
  target_id     uuid NOT NULL,
  reporter_id   uuid NOT NULL
    REFERENCES anamnese_submissions(id) ON DELETE CASCADE,
  reason        text NOT NULL DEFAULT '',
  resolved      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companion_reports_open
  ON companion_reports (practice_id, resolved, created_at DESC);

-- ---- Storage-Bucket fuer Fotos/Videos ----------------------------------------
-- Limits werden HIER am Bucket erzwungen (nicht nur in der App): signierte
-- Upload-URLs pruefen sonst weder Groesse noch MIME — der Client koennte
-- beliebige Bytes direkt zu Supabase PUTten. 62914560 = 60 MB (Video-Max).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community', 'community', false, 62914560,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  CREATE POLICY "auth all community" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'community')
    WITH CHECK (bucket_id = 'community');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- RLS + updated_at --------------------------------------------------------
ALTER TABLE companion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "auth all" ON companion_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "auth all" ON companion_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "auth all" ON companion_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "auth all" ON companion_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_companion_posts_updated_at ON companion_posts;
CREATE TRIGGER trg_companion_posts_updated_at
  BEFORE UPDATE ON companion_posts
  FOR EACH ROW EXECUTE FUNCTION set_companion_updated_at();
DROP TRIGGER IF EXISTS trg_companion_comments_updated_at ON companion_comments;
CREATE TRIGGER trg_companion_comments_updated_at
  BEFORE UPDATE ON companion_comments
  FOR EACH ROW EXECUTE FUNCTION set_companion_updated_at();
