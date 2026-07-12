// GET /api/companion/community/feed?page=N — die letzten 20 SICHTBAREN
// (hidden=false) Beiträge der Praxis, neueste zuerst. Autoren erscheinen NUR
// als Nickname (Klarnamen-Verbot), Medien als 1h-signierte URLs aus dem
// privaten 'community'-Bucket. Rückgabe {ok, posts, page, hasMore}.

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  getFeed,
  requireCommunityMember,
} from "@/lib/server/companionCommunity";

export async function GET(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    const { searchParams } = new URL(req.url);
    const raw = parseInt(searchParams.get("page") || "0", 10);
    const page = Number.isInteger(raw) && raw > 0 ? raw : 0;

    const { posts, hasMore } = await getFeed(session, page);
    return Response.json(
      { ok: true, posts, page, hasMore },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/feed:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
