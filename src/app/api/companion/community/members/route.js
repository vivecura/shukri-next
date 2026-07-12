// GET /api/companion/community/members — alle beigetretenen, aktiven, nicht
// widerrufenen Mitglieder der Praxis als {submissionId, nickname, isSelf}.
// Chat-Partner-Auswahl; der Client filtert isSelf aus den Zielen.
// NIE Klarnamen (nur nickname + opake submission_id).

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  getMembers,
  requireCommunityMember,
} from "@/lib/server/companionCommunity";

export async function GET(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    const members = await getMembers(session);
    return Response.json(
      { ok: true, members },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/members:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
