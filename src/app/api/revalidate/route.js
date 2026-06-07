import { revalidatePath } from "next/cache";

// Supabase Database Webhook receiver.
// On INSERT / UPDATE / DELETE of a row in `blog_posts`, this endpoint
// triggers on-demand ISR for every route that surfaces the affected post.
//
// Supabase sends payloads of the shape:
//   { type: "INSERT" | "UPDATE" | "DELETE", table, schema, record, old_record }
// For DELETE, `record` is null and `old_record` is populated.
export async function POST(req) {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { type, record, old_record } = body || {};
  const post = record || old_record;

  if (!post?.slug || !post?.language) {
    return Response.json(
      { ok: false, error: "Missing slug or language" },
      { status: 400 }
    );
  }

  const isEn = post.language === "en";
  const blogList = isEn ? "/en/blog" : "/blog";
  const detail = (isEn ? "/en/blog/" : "/blog/") + post.slug;
  // revalidatePath does NOT accept globs; use the route-pattern form
  // with type="page" to refresh every materialized topic page at once.
  const topicPattern = isEn ? "/en/blog/topic/[slug]" : "/blog/thema/[slug]";

  // Also refresh the sitemap so new/removed posts appear immediately.
  revalidatePath("/sitemap.xml");
  revalidatePath(blogList);
  revalidatePath(detail);
  revalidatePath(topicPattern, "page");

  return Response.json({
    ok: true,
    type,
    slug: post.slug,
    language: post.language,
    revalidated: [blogList, detail, topicPattern, "/sitemap.xml"],
  });
}

// Health-check endpoint — handy for verifying the route is deployed.
export async function GET() {
  return Response.json({ ok: true, endpoint: "revalidate" });
}
