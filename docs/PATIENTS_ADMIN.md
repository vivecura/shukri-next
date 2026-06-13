# Patienten Admin — Patient Records

The **Patienten** tab in `/admin` lets the practice review patient intake
submissions (from the public `/anamnese` form) and maintain a per-patient
record (diagnosis, medication, appointments, notes, treatment plan, invoices,
documents). Built 2026-06-13.

---

## Access & layout

- URL: `/admin` → log in with Supabase Auth → **Patienten** tab (leftmost,
  the default tab). Other tabs: Blog verwalten, Kontakte, Lifesummit.
- The public navbar/footer/language switcher are **hidden on `/admin`** via
  `src/components/SiteChrome.js` (a client gate keyed on the pathname) so the
  dashboard isn't pushed down by the tall public navbar. A "Home" link in the
  tab row returns to the public site.
- Panel (`src/components/AdminAnamnesePanel.js`):
  - **Left:** searchable patient list (name / email / phone), newest first.
    Names come from the submission's `vorname`/`nachname` (fallback: email).
  - **Right:** the selected patient's record as a row of **tabs**.

---

## Data sources

**`anamnese_submissions`** — the public intake form (read-only in admin).
Columns: `vorname, nachname, email, handy, geburtsdatum, lang, payload (jsonb,
all form answers), signature_dataurl, befunde_urls (text[] of storage paths),
created_at`. RLS: anon INSERT + authenticated SELECT.

**`patient_records`** — doctor-entered data (read/write by admin only).
Columns: `submission_id (uuid PK → anamnese_submissions.id), data (jsonb),
updated_at`. RLS: `auth all` (authenticated only). All the editable tabs save
into the single `data` blob.

Documents (invoice + manually-added befund files) live in the **`befunde`**
storage bucket:
- patient's own uploads: `<session_id>/...` (written by the anon form)
- manually-added befund docs: `befund/<submission_id>/...`
- invoice docs: `rechnungen/<submission_id>/...`

Opened via short-lived signed URLs. Requires the `auth all befunde` storage
policy so the admin can read/write the bucket.

---

## Record tabs

| Tab | Source / behaviour | Saved as (`data.*`) |
|---|---|---|
| Diagnose | editable list (+ Diagnose) | `diagnose[]` |
| Medikation | **Vorher** = patient's `medikamente` + `supplemente` (read-only); **Von mir** = editable list (+ Medikament) | `medikationVonMir[]` |
| Nächster Termin | one of: Geplant am (date) / Patient macht selbst / Ungeplant | `termin {mode,date}` |
| Nächste Schritte | editable list (+ Schritt) | `naechsteSchritte[]` |
| Anamnese | read-only: the 16 form answers + Termin/Herkunft + consents + signature | — (from submission) |
| Doctolib Notizen | editable list (+ Notiz, multiline) | `notizen[]` |
| Behandlungsplan | editable list (+ Punkt, multiline) | `behandlungsplan[]` |
| Befund | patient uploads (read-only Öffnen) + **manual** (+ Datei, with name) | `manualBefunde[]` |
| Rechnungen | + Rechnung: text, document upload, **Bezahlt** checkbox | `rechnungen[]` |

The **Anamnese** question labels mirror the `/anamnese` form's wording
verbatim (16 questions); the mapping lives in `ANAMNESE_QUESTIONS` in the
panel. (This is independent of the LifeSummit panel — same code pattern was
reused, but the data and questions are the patient form's.)

---

## Saving

A **Speichern** button (top-right of the record) upserts the patient's whole
`data` blob and uploads any newly-chosen documents first. The record loads
when a patient is selected. Edits clear the "Gespeichert ✓" indicator.

**Why a JSONB blob:** chosen for fast iteration while the tabs were being
designed — new fields need no migration. **Long-term plan:** migrate to a
relational schema (typed columns + a dedicated `rechnungen` table, one row
per invoice, for query-ability — unpaid lists, totals). The blob converts to
columns without data loss. See `~/.claude*/…/memory/patient-records-storage.md`.

---

## Migrations (run once in Supabase → SQL Editor)

- `supabase/migrations/2026-06-13-anamnese-submissions-rls.sql` — anon INSERT
  + auth SELECT on `anamnese_submissions` (without this the public form can't
  save).
- `supabase/migrations/2026-06-13-patient-records.sql` — the `patient_records`
  table + `auth all` RLS + the `auth all befunde` storage policy (without this
  **Speichern** errors and document uploads fail).

---

## Extending a placeholder/new tab

For a list-style tab (most of them):
1. add a `xByPatient` state map + a `listHandlers(...)` instance;
2. load it in the select-effect from `data.x`;
3. add it to `handleSave`'s `data` object;
4. render with `<TextListEditor .../>` in the tab-content conditional;
5. add the tab id/label to `RECORD_TABS`.

---

## "Ask ShukrAi" — planned AI assistant

Bottom-right floating box on the Patienten view. **Currently a UI scaffold
only** (quick actions: Plan erstellen / Nächster Schritt / Analysieren + a
free-text box) — it is **not wired to any AI**; sending shows a placeholder.

**Intended design when built:**
- **In-app, server-side Claude API call** (an `/api/patient-ai` route) — NOT
  via the MCP server. The button sends the patient's record + the doctor's
  question to the backend, which calls the Claude API and returns the answer.
- **Pseudonymize before sending:** strip name, email, phone, full birthdate
  (send age instead if useful), guardian, signature — send only the clinical
  content. This matches the form's `consent_ki_pseudonym` consent.
- Treat output as **decision support / drafts** the doctor reviews.
- Before going live with real patient data: an **Anthropic DPA** + consent
  wording covering AI processing, EU data handling.
- An MCP connector (like the blog server) is an alternative for chatting about
  patients in a Claude client, but it grants standing DB access and is harder
  to govern — prefer the scoped in-app path for clinical use.

---

## Key files

- `src/components/pages/Admin.js` — admin shell, tabs, login.
- `src/components/AdminAnamnesePanel.js` — the Patienten panel (list + record).
- `src/components/SiteChrome.js` — hides public chrome on `/admin`.
- `public/anamnese.html` — the public intake form (static, iframed at `/anamnese`).
- `supabase/migrations/2026-06-13-*.sql` — the RLS + table migrations.
