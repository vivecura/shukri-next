# Lifesummit form persistence — design

Date: 2026-05-28
Status: Approved, ready for implementation plan

## Goal

Persist Lifesummit landing-page form submissions (`public/lifesummit.html`) to Supabase so that:

1. Step 1 (contact info) is saved to the database the moment the user clicks "Continue to Step 2", even if they never return.
2. If the user continues, subsequent steps (anamnese, final + file uploads) merge into the **same** row, identified by the existing browser `vc_session_id`.
3. Uploaded Befunde files (PDFs and images — restricted by the existing `accept="image/*,application/pdf"` on the file input) are stored in Supabase Storage and linked to the row.

## Scope

**In scope**
- New Supabase table `lifesummit_submissions` with mostly-nullable columns to allow partial saves.
- New Supabase Storage bucket `lifesummit-files` (private) for Befunde uploads.
- RLS policies + a `SECURITY DEFINER` RPC for safe anon updates.
- Replace the placeholder `postToBackend` / `BACKEND_ENDPOINT` logic in `public/lifesummit.html` with direct Supabase JS calls.

**Out of scope (deferred)**
- Confirmation emails after Step 1.
- Reminder emails to users who do not finish.
- Reentry via `?continue=...` URL (existing handler stays in place but is dead since no email is sent).
- Admin UI for browsing submissions. Initial extraction is via the Supabase Table Editor / SQL Editor. A later task may add an `/admin` tab.
- Step 2 event tracking (`doctolib_opened`, `continued_to_anamnese`). The Step 2 click handlers that post these events will be removed.

## Architecture

```
public/lifesummit.html (plain HTML in /public)
   │
   │  supabase-js loaded via CDN, anon key inlined
   │  session_id + update_token generated client-side, stored in sessionStorage
   │  (so closing the browser produces a fresh form on next visit)
   │
   ├── Step 1 "Next" click ──▶ INSERT into lifesummit_submissions
   │                            (creates row, fields locked, next steps unlocked)
   │
   ├── Step 3 submit       ──▶ supabase.rpc('update_lifesummit_submission',
   │                              session_id, update_token, { anamnese, status:'step3' })
   │
   └── Step 4 submit       ──▶ 1) upload each file to Storage bucket lifesummit-files
                                  at path "{session_id}/{timestamp}-{filename}"
                                2) RPC update with befunde_files[], dsgvo_consent, status:'final'
                                3) show success state, clear sessionStorage
```

No new backend service. Browser talks directly to Supabase, same pattern as the existing `src/Pages/Kontakt.js` → `contact_requests`.

## Data model

### Table `lifesummit_submissions`

```sql
CREATE TABLE lifesummit_submissions (
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

  -- Step 3
  anamnese              jsonb,
  anamnese_submitted_at timestamptz,

  -- Step 4
  befunde_files         jsonb,                 -- [{ path, filename, size, type }]
  dsgvo_consent         boolean,
  final_submitted_at    timestamptz,

  status                text NOT NULL DEFAULT 'step1'  -- step1 | step3 | final
);

CREATE INDEX idx_lifesummit_session ON lifesummit_submissions (session_id);
CREATE INDEX idx_lifesummit_created ON lifesummit_submissions (created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION set_lifesummit_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lifesummit_updated_at
  BEFORE UPDATE ON lifesummit_submissions
  FOR EACH ROW EXECUTE FUNCTION set_lifesummit_updated_at();
```

Anamnese (JSONB) carries all 15 questions, the multi-select supplement list, and the per-supplement dosages. Storing as JSONB keeps the schema simple and lets the form evolve without migrations.

### Storage bucket `lifesummit-files`

- Private bucket (not public). Paths: `{session_id}/{timestamp}-{filename}`.
- Anon role: INSERT (upload) only. No list, no read.
- Authenticated role: full access. Admin views files via short-lived signed URLs.

## Security model

| Role | INSERT | UPDATE | SELECT | DELETE |
|---|---|---|---|---|
| anon (browser) | yes | no (use RPC) | no | no |
| authenticated (admin) | yes | yes | yes | yes |

```sql
ALTER TABLE lifesummit_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert" ON lifesummit_submissions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth all" ON lifesummit_submissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_lifesummit_submission(
  p_session_id   text,
  p_update_token text,
  p_patch        jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE lifesummit_submissions SET
    anamnese              = COALESCE(p_patch->'anamnese',          anamnese),
    befunde_files         = COALESCE(p_patch->'befunde_files',     befunde_files),
    dsgvo_consent         = COALESCE((p_patch->>'dsgvo_consent')::boolean, dsgvo_consent),
    anamnese_submitted_at = CASE WHEN p_patch ? 'anamnese' THEN now() ELSE anamnese_submitted_at END,
    final_submitted_at    = CASE WHEN p_patch ? 'final'    THEN now() ELSE final_submitted_at    END,
    status                = COALESCE(p_patch->>'status', status)
  WHERE session_id = p_session_id AND update_token = p_update_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid session or token';
  END IF;
END $$;

REVOKE ALL ON FUNCTION update_lifesummit_submission FROM public;
GRANT EXECUTE ON FUNCTION update_lifesummit_submission TO anon, authenticated;
```

`update_token` is a `crypto.randomUUID()` (36 chars) generated client-side on first page visit and stored in `sessionStorage.vc_update_token`. Without both a valid `session_id` and matching `update_token`, anon cannot modify any row. Using `sessionStorage` (not `localStorage`) means a closed browser yields a fresh form on next visit — intentional for an event landing page where users typically submit once.

Storage bucket RLS (set via Supabase dashboard or migration):

```sql
-- Anon: upload only
CREATE POLICY "anon upload lifesummit" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'lifesummit-files');

-- Authenticated: full access
CREATE POLICY "auth all lifesummit" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'lifesummit-files')
  WITH CHECK (bucket_id = 'lifesummit-files');
```

## Frontend changes (`public/lifesummit.html`)

1. **Load supabase-js** via CDN in `<head>` and create a client with the existing anon key.
2. **Add `getOrCreateUpdateToken()`** alongside the existing `getOrCreateSessionId()`. Same pattern, stores in `sessionStorage.vc_update_token`. (`getOrCreateSessionId` also moves from `localStorage` to `sessionStorage` so that closing the browser yields a fresh session.)
3. **Three new helpers** replace `postToBackend`:
   - `dbInsertStep1(payload)` — INSERT row with contact data + token.
   - `dbUpdate(patch)` — call the RPC with session_id, token, and the patch object.
   - `uploadBefunde(files)` — upload each file to Storage and return `[{path, filename, size, type}]`.
4. **Wire into existing handlers:**
   - Step 1 Next (~line 1657): after validation, await `dbInsertStep1(...)`. The handler becomes `async`. On error, show toast and do not lock/advance. On success, continue current lock/unlock/scroll behavior.
   - Step 3 submit (~line 1822): replace `postToBackend(3, ...)` with `dbUpdate({ anamnese, status: 'step3' })`. Toast and abort on error.
   - Step 4 submit (~line 1909): upload files first, abort on first error. Then `dbUpdate({ befunde_files, dsgvo_consent: true, final: true, status: 'final' })`. On success, show success state and clear sessionStorage (session_id, update_token, and the form-values key).
5. **Remove dead code:**
   - `BACKEND_ENDPOINT` constant.
   - `postToBackend` function.
   - Step 2 tracking calls on the Doctolib buttons. The buttons themselves (which open Doctolib in a new tab) are unchanged.
6. **Untouched:**
   - The `saveForm()` / `restoreForm()` logic (existing UX so a same-tab refresh keeps typed answers) — its storage backend is migrated from `localStorage` to `sessionStorage` as part of this change.
   - The `?continue=...` URL handler (dead but harmless without emails).
   - Favicon link.

## Error handling and edge cases

| Case | Behavior |
|---|---|
| Step 1 INSERT fails | Toast with localized message. Step 1 stays unlocked so user can retry. Next steps not unlocked. |
| Step 3/4 RPC fails (network) | Toast, do not advance. |
| Step 3/4 RPC fails with "invalid session or token" | Toast suggesting reload. Indicates browser state out of sync with DB. |
| File upload fails | Stop at first failure, name the file in the toast. Already-uploaded files in this batch stay in Storage (orphaned, harmless). |
| Double-click Step 1 Next | Disable the button immediately. `session_id UNIQUE` is a backstop. |
| User edits Step 1 fields after submit | Existing `lock(step1)` already makes inputs read-only. Unchanged. |
| User clears sessionStorage / closes browser mid-flow | Next visit generates a new session_id+token and creates a fresh row at Step 1. The earlier partial row remains in DB; user cannot reconnect. Accepted — duplicate "Step 1 only" rows can be deduped by email if needed. |
| Tab opened twice in same browser | Each tab has its own sessionStorage scope → two independent rows. Acceptable. |
| File size | Supabase default 50 MB per file. No client-side limit added. |

## Open items (non-blocking)

- **Consent copy**: the Step 1 `kontaktConsent` checkbox text covers "being contacted." Now that Step 1 also writes data to a DB, the wording may want a small extension (e.g., "Ihre Angaben werden gespeichert, um Sie zu kontaktieren"). This is a copy/legal decision, not a technical blocker. Flagged for the user to revise the text after implementation.
- **Cleanup of orphaned partial rows / orphaned files**: not handled in this iteration. If volume becomes meaningful, add a periodic job that removes rows with `status='step1'` older than N days.
- **Admin extraction UI**: not built. Extraction is via Supabase dashboard for now. Can add an `/admin` tab in a follow-up.

## Implementation outline (high level — full plan to be written next)

1. SQL migration file: create table, indexes, trigger, RLS policies, RPC, storage policies. Apply manually in the Supabase SQL Editor.
2. Create the Storage bucket `lifesummit-files` (private) via Supabase dashboard.
3. Edit `public/lifesummit.html`:
   - Add supabase-js script tag and client init.
   - Add `getOrCreateUpdateToken`.
   - Add `dbInsertStep1`, `dbUpdate`, `uploadBefunde`.
   - Rewire Step 1 / Step 3 / Step 4 submit handlers.
   - Remove `BACKEND_ENDPOINT`, `postToBackend`, Step 2 tracking calls.
4. Manual end-to-end test: submit Step 1 only (verify row exists), continue and submit Step 3 (verify row updated), submit Step 4 with a sample PDF (verify file in Storage and `befunde_files` populated).
5. Commit; deploy.
