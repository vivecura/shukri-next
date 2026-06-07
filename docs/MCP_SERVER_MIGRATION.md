# blog-mcp-server -> New Render Runbook

Migrate the MCP server from the old Render account to a new one tied to
the vivecura org. The MCP server is what lets Claude publish blog posts
into Supabase. Same Supabase project, same code, new host.

## What it is

- Node.js Express + MCP Streamable HTTP server.
- Lives in `blog-mcp-server/` in this repo.
- Connects to Supabase using the **service role key** (NOT anon) so it
  can INSERT into `blog_posts` regardless of RLS.
- Exposes:
  - `GET /health` -> `{ status: "ok" }`
  - `POST /mcp`, `GET /mcp`, `DELETE /mcp` -> MCP protocol
  - Plus legacy `/sse` endpoint for backward compat

## Steps

### 1. Create / sign in to new Render account
Goal: a Render account scoped to vivecura, separate from the personal
account hosting the old MCP service.

### 2. Create the web service
In new Render dashboard -> **New + -> Web Service** -> **Connect GitHub**.
- Authorize Render to access `vivecura/shukri-next`.
- Pick the `shukri-next` repo.
- Branch: `main`

### 3. Service configuration
| Field | Value |
|---|---|
| Name | `vivecura-blog-mcp` (or any name) |
| Region | Frankfurt or wherever the old one was |
| Branch | `main` |
| **Root Directory** | `blog-mcp-server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free or Starter (whichever the old one used) |

### 4. Environment variables
Render -> Service -> **Environment**. Add:

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://zevrlfpyyndwjnlpidkx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (paste from `blog-mcp-server/.env`) |
| `NODE_ENV` | `production` |

`PORT` is provided automatically by Render -- do NOT set it manually.
The service code checks `if (process.env.PORT)` to decide HTTP vs stdio.

### 5. Deploy + verify
- Click **Deploy** or save settings to trigger first build.
- Wait ~2-3 minutes.
- Once live, Render shows a URL like
  `https://vivecura-blog-mcp-xyz.onrender.com`.
- Test the health endpoint:
  ```
  curl https://<your-new-render-url>/health
  ```
  Expected: `{"status":"ok"}`

### 6. Update Claude connector
Wherever the MCP URL is currently configured to point at the OLD Render
URL, swap it for the NEW Render URL. Two likely places:

- **Claude Desktop config** (`claude_desktop_config.json` or similar):
  edit the `vivecura-blog` MCP server entry to use the new URL.
- **Anthropic API connector entry**: replace URL there.

The MCP path stays the same (`/mcp`); only the hostname changes.

### 7. Smoke test through Claude
- Open a Claude conversation.
- Verify the MCP server appears as connected.
- Ask Claude to list available tools -- should show `publish_blog_post`,
  `list_posts_missing_translation`, etc.
- Do NOT publish a real post; just listing tools is enough to confirm
  the connector works.

### 8. Decommission old Render
- Old Render service: **Settings -> Suspend** (don't delete yet).
- Keep suspended for at least 7 days as a rollback safety net.
- After 7 days of new service working: delete the old service.

## Notes

- `SUPABASE_SERVICE_ROLE_KEY` is a high-trust credential. Never paste it
  into a Git commit, README, or Slack message. Render env vars are
  encrypted at rest -- safe to put there.
- The MCP server has no persistent state -- sessions are in-memory and
  cleared on redeploy. Clients reconnect automatically on stale-session
  errors (handled in code).
- Render free tier sleeps after inactivity. If publishing posts feels
  slow on first call after a quiet period, upgrade to Starter ($7/mo).
