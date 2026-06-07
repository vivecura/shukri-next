import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import crypto from "crypto";

// ── Supabase client (uses service role key to bypass RLS) ──
// Strip any whitespace/newlines that may have been introduced when pasting
// the key into the host's env-var UI (e.g. Render wraps long values).
const supabase = createClient(
  (process.env.SUPABASE_URL || "").replace(/\s+/g, ""),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/\s+/g, "")
);

// ── Helper: generate URL-friendly slug from title ──
function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Create a new MCP server instance with all tools registered ──
function createBlogServer() {
  const server = new McpServer({
    name: "vivecura-blog",
    version: "1.0.0",
  });

  // ══════════════════════════════════════════════
  //  TOOL: publish_blog_post
  // ══════════════════════════════════════════════
  server.tool(
    "publish_blog_post",
    `Publish a new blog post to the ViveCura website.

IMPORTANT WORKFLOW: ALWAYS show the user a preview of the HTML as an artifact FIRST. Only call this tool AFTER the user has approved the design.

HTML RULES:
- Must be a COMPLETE, self-contained HTML page. All styles in a <style> block in the <head> — no external CSS, no inline styles in the body.
- Each blog post should have its own unique design, layout, colors, fonts, and animations.
- Include <!DOCTYPE html>, <html lang="de">, <head>, and <body> tags.
- Make the design responsive (mobile-friendly).
- Use Google Fonts via @import in the style block if needed.
- Do NOT include any CTA (call-to-action) buttons, appointment/Termin links, or footer sections in the HTML. The website adds these automatically.`,
    {
      title: z.string().describe("The blog post title"),
      description: z
        .string()
        .optional()
        .describe("Short description for the blog card preview (1-2 sentences)"),
      html_content: z
        .string()
        .describe(
          "Complete, self-contained HTML page with inline styles. Must include <!DOCTYPE html> and be fully responsive."
        ),
      thumbnail_url: z
        .string()
        .optional()
        .describe("URL for the thumbnail image shown on the blog listing page"),
      slug: z
        .string()
        .optional()
        .describe("URL-friendly slug (e.g. 'teeth-whitening'). Auto-generated from title if omitted."),
      language: z
        .enum(["de", "en"])
        .optional()
        .describe("Language of the post. Defaults to 'de' (German)."),
      translation_of: z
        .string()
        .optional()
        .describe(
          "UUID of the original-language post this is a translation of. Required when publishing an EN translation of an existing DE post — pass the DE post's id (returned by publish_blog_post or list_posts_missing_translation)."
        ),
    },
    async ({ title, description, html_content, thumbnail_url, slug, language, translation_of }) => {
      const finalSlug = slug || toSlug(title);
      const finalLang = language || "de";

      // Guardrail: EN posts should normally have a translation_of pointer.
      // We don't hard-block (allows EN-original posts), just warn.
      const warning =
        finalLang === "en" && !translation_of
          ? "\n\n⚠️ Warning: EN post published without translation_of. If this is meant to be a translation of a DE post, re-publish with translation_of set."
          : "";

      // If this is a translation and no thumbnail was provided, inherit the
      // original post's thumbnail. Same image works for both languages and
      // saves Claude from having to re-upload.
      let finalThumbnail = thumbnail_url || null;
      if (!finalThumbnail && translation_of) {
        const { data: original } = await supabase
          .from("blog_posts")
          .select("thumbnail_url")
          .eq("id", translation_of)
          .maybeSingle();
        if (original?.thumbnail_url) {
          finalThumbnail = original.thumbnail_url;
        }
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          title,
          slug: finalSlug,
          description: description || "",
          html_content,
          thumbnail_url: finalThumbnail,
          language: finalLang,
          translation_of: translation_of || null,
          published: false,
        })
        .select()
        .single();

      if (error) {
        return {
          content: [{ type: "text", text: `Error publishing post: ${error.message}` }],
        };
      }

      const urlPrefix = finalLang === "en" ? "/en/blog" : "/blog";

      return {
        content: [
          {
            type: "text",
            text: `Blog post saved as draft!\n\nID: ${data.id}\nTitle: ${data.title}\nSlug: ${data.slug}\nLanguage: ${data.language}\nURL: ${urlPrefix}/${data.slug}\nStatus: Draft (unpublished)${data.translation_of ? `\nTranslation of: ${data.translation_of}` : ""}\n\nThe admin can preview, edit, and publish it from the admin dashboard.${warning}`,
          },
        ],
      };
    }
  );

  // ══════════════════════════════════════════════
  //  TOOL: list_blog_posts
  // ══════════════════════════════════════════════
  server.tool(
    "list_blog_posts",
    "List all blog posts on the ViveCura website (both published and drafts).",
    {},
    async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, description, published, language, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) {
        return {
          content: [{ type: "text", text: `Error listing posts: ${error.message}` }],
        };
      }

      if (!data || data.length === 0) {
        return { content: [{ type: "text", text: "No blog posts found." }] };
      }

      const list = data
        .map(
          (p, i) =>
            `${i + 1}. "${p.title}" (/blog/${p.slug}) — ${p.published ? "Published" : "Draft"} — ${new Date(p.created_at).toLocaleDateString("de-DE")}`
        )
        .join("\n");

      return {
        content: [{ type: "text", text: `Found ${data.length} blog post(s):\n\n${list}` }],
      };
    }
  );

  // ══════════════════════════════════════════════
  //  TOOL: read_blog_post
  // ══════════════════════════════════════════════
  server.tool(
    "read_blog_post",
    "Read the full content of a specific blog post by its id or by (slug, language). Use this to read a DE post you're about to translate, or to check what was already published.",
    {
      id: z
        .string()
        .optional()
        .describe("UUID of the post to read. Either id OR slug must be provided."),
      slug: z
        .string()
        .optional()
        .describe("Slug of the post to read. Combine with language since slugs are shared across DE/EN."),
      language: z
        .enum(["de", "en"])
        .optional()
        .describe("Language to filter by when reading by slug. Defaults to 'de'."),
    },
    async ({ id, slug, language }) => {
      if (!id && !slug) {
        return {
          content: [{ type: "text", text: "Error: provide either id or slug." }],
        };
      }

      let query = supabase.from("blog_posts").select("*");
      if (id) {
        query = query.eq("id", id);
      } else {
        query = query.eq("slug", slug).eq("language", language || "de");
      }

      const { data, error } = await query.single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: `ID: ${data.id}\nTitle: ${data.title}\nSlug: ${data.slug}\nStatus: ${data.published ? "Published" : "Draft"}\nLanguage: ${data.language}${data.translation_of ? `\nTranslation of: ${data.translation_of}` : ""}\nDescription: ${data.description || "(none)"}\nCreated: ${new Date(data.created_at).toLocaleDateString("de-DE")}\n\nHTML Content:\n${data.html_content}`,
          },
        ],
      };
    }
  );

  // ══════════════════════════════════════════════
  //  TOOL: list_posts_missing_translation
  // ══════════════════════════════════════════════
  server.tool(
    "list_posts_missing_translation",
    "List blog posts in one language that don't yet have a translation in the other language. Use this for backfill: find DE posts without an EN translation, then for each one read it, translate it, and call publish_blog_post(language='en', translation_of=<id>).",
    {
      target_language: z
        .enum(["en", "de"])
        .optional()
        .describe(
          "The language whose translations are missing. Defaults to 'en' (find DE posts that have no EN translation yet)."
        ),
    },
    async ({ target_language }) => {
      const target = target_language || "en";
      const source = target === "en" ? "de" : "en";

      const { data: sourcePosts, error: sourceErr } = await supabase
        .from("blog_posts")
        .select("id, title, slug, published, created_at")
        .eq("language", source)
        .order("created_at", { ascending: true });

      if (sourceErr) {
        return {
          content: [{ type: "text", text: `Error fetching ${source} posts: ${sourceErr.message}` }],
        };
      }

      const { data: targetPosts, error: targetErr } = await supabase
        .from("blog_posts")
        .select("translation_of")
        .eq("language", target);

      if (targetErr) {
        return {
          content: [{ type: "text", text: `Error fetching ${target} posts: ${targetErr.message}` }],
        };
      }

      const translatedIds = new Set(
        (targetPosts || []).map((p) => p.translation_of).filter(Boolean)
      );
      const missing = (sourcePosts || []).filter((p) => !translatedIds.has(p.id));

      if (missing.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `All ${source.toUpperCase()} posts already have a ${target.toUpperCase()} translation. Nothing to backfill.`,
            },
          ],
        };
      }

      const list = missing
        .map(
          (p, i) =>
            `${i + 1}. "${p.title}"\n   id: ${p.id}\n   slug: ${p.slug}\n   ${p.published ? "Published" : "Draft"} · ${new Date(p.created_at).toLocaleDateString("de-DE")}`
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${missing.length} ${source.toUpperCase()} post(s) without a ${target.toUpperCase()} translation:\n\n${list}\n\nTo translate one: call read_blog_post(id=<id>) to read it, translate the title/description/HTML to ${target.toUpperCase()}, then call publish_blog_post(language="${target}", translation_of=<id>, slug=<same slug>, title=<translated>, html_content=<translated>, description=<translated>).`,
          },
        ],
      };
    }
  );

  return server;
}

// ══════════════════════════════════════════════
//  START: Remote (Streamable HTTP + SSE) or Local (stdio)
// ══════════════════════════════════════════════
if (process.env.PORT) {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );

  const app = express();
  app.use(express.json({ limit: "50mb" }));

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Streamable HTTP endpoint
  const mcpSessions = new Map();

  app.post("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"];
      if (sessionId && mcpSessions.has(sessionId)) {
        const transport = mcpSessions.get(sessionId);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // If client sent a stale session ID (e.g. after redeploy), tell it to re-initialize
      if (sessionId) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session expired. Please reconnect." },
          id: req.body?.id || null,
        });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) mcpSessions.delete(sid);
      };
      const server = createBlogServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      if (transport.sessionId) {
        mcpSessions.set(transport.sessionId, transport);
      }
    } catch (err) {
      console.error("MCP POST error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: err.message || "Internal error" },
          id: req.body?.id || null,
        });
      }
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (sessionId && mcpSessions.has(sessionId)) {
      const transport = mcpSessions.get(sessionId);
      await transport.handleRequest(req, res);
    } else {
      res.status(400).json({ error: "No session. POST first." });
    }
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (sessionId && mcpSessions.has(sessionId)) {
      const transport = mcpSessions.get(sessionId);
      await transport.handleRequest(req, res);
      mcpSessions.delete(sessionId);
    } else {
      res.status(400).json({ error: "No session." });
    }
  });

  // Legacy SSE (keep for backward compat with first laptop)
  const sessions = new Map();

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    sessions.set(transport.sessionId, transport);
    res.on("close", () => sessions.delete(transport.sessionId));
    const server = createBlogServer();
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = sessions.get(sessionId);
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).json({ error: "Unknown session" });
    }
  });

  const port = parseInt(process.env.PORT);
  app.listen(port, () => {
    console.log(`ViveCura Blog MCP server running on port ${port}`);
  });
} else {
  const server = createBlogServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
