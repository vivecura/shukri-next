# Supabase Webhook → On-Demand ISR

When a row in `blog_posts` is inserted, updated, or deleted, Supabase posts to
`/api/revalidate`, which calls `revalidatePath` for the blog list, the post
detail, the topic pages, and the sitemap. Routes refresh within seconds — no
rebuild required.

## 1. Generate a shared secret

Pick a random 32-byte string (e.g. `openssl rand -hex 32`). Treat it like a
password — do not commit it.

## 2. Configure the Vercel env var

In the Vercel project for `vivecura-next`:

- Settings → Environment Variables
- Name: `REVALIDATE_SECRET`
- Value: the secret from step 1
- Environments: Production (and Preview if you want to test on previews)
- Redeploy so the new env var is picked up.

There is no fallback value in code — if `REVALIDATE_SECRET` is unset, every
webhook returns `401 Unauthorized`. That is intentional.

## 3. Configure the Supabase Database Webhook

Supabase Dashboard → Database → Webhooks → **Create a new hook**:

- **Name:** `vivecura-revalidate`
- **Table:** `blog_posts` (schema `public`)
- **Events:** check `INSERT`, `UPDATE`, `DELETE`
- **Type:** HTTP Request
- **HTTP Method:** `POST`
- **URL:** `https://<deployed-domain>/api/revalidate`
  (e.g. `https://vivecura.com/api/revalidate` after promote, or the preview URL
  while testing.)
- **HTTP Headers:**
  - `Content-Type: application/json`
  - `x-revalidate-secret: <secret from step 1>`
- **HTTP Payload:** leave the default — Supabase sends
  `{ type, table, schema, record, old_record }`. On DELETE, `record` is null
  and `old_record` carries the row that was removed; the route handles both.

## 4. Test the wiring

Health-check (no secret needed):

```bash
curl https://<deployed-domain>/api/revalidate
# → {"ok":true,"endpoint":"revalidate"}
```

Simulate a webhook payload:

```bash
curl -X POST https://<deployed-domain>/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: <secret>" \
  -d '{"type":"UPDATE","record":{"slug":"<some-slug>","language":"de"}}'
# → {"ok":true,"type":"UPDATE","slug":"<some-slug>","language":"de","revalidated":[...]}
```

Then `curl -A Googlebot https://<deployed-domain>/blog/<some-slug>` should
reflect the latest DB state within a few seconds. End-to-end, edit the post in
admin (or via SQL) and the public page should update without a redeploy.
