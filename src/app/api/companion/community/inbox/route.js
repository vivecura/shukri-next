// GET /api/companion/community/inbox — ungelesen je Partner + Vorschau der
// letzten Nachricht (80 Zeichen) + totalUnread. EIN Endpoint hinter beidem:
// Shell-Tab-Badge (20s-Poll; 403 = noch nicht beigetreten → Badge still 0)
// und die Thread-Liste im CommunityChat.

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  getInbox,
  requireCommunityMember,
} from "@/lib/server/companionCommunity";

export async function GET(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    const { partners, totalUnread } = await getInbox(session);
    return Response.json(
      { ok: true, partners, totalUnread },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/inbox:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
