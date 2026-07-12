// POST /api/companion/community/join — Community-Beitritt (Opt-in).
// Body {nickname}. Setzt nickname + community_joined_at auf companion_access
// (practice+submission-gescopetes UPDATE); Unique-Index-Verletzung (23505)
// wird zur freundlichen 409. Idempotent: wer schon Mitglied ist, bekommt
// seinen bestehenden Stand zurück.
// Die EINZIGE Community-Route OHNE requireCommunityMember — sie IST der Weg
// hinein. Die Regel-Zustimmung passiert im Client (CommunityJoin-Karte).

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import { joinCommunity } from "@/lib/server/companionCommunity";

export async function POST(req) {
  try {
    const session = await requireSession(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const result = await joinCommunity(session, body?.nickname);
    return Response.json(
      {
        ok: true,
        nickname: result.nickname,
        communityJoinedAt: result.communityJoinedAt,
      },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/join:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
