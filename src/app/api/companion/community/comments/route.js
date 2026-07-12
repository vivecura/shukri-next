// /api/companion/community/comments — Kommentare eines Beitrags.
//   GET  ?postId=<uuid>       → sichtbare Kommentare (Beitrag muss sichtbar +
//                               practice-gescoped existieren), Autoren nur
//                               als Nickname.
//   POST {postId, body ≤1000} → Kommentar anlegen (nach Existenz-/
//                               Sichtbarkeits-Check des Beitrags).

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  addComment,
  getComments,
  requireCommunityMember,
} from "@/lib/server/companionCommunity";

export async function GET(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    const { searchParams } = new URL(req.url);
    const comments = await getComments(session, searchParams.get("postId"));
    return Response.json(
      { ok: true, comments },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/comments:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}

export async function POST(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const comment = await addComment(session, body?.postId, body?.body);
    return Response.json(
      { ok: true, comment },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/comments:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
