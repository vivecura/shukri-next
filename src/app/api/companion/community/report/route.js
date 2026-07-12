// POST /api/companion/community/report — Melden-Button.
// Body {kind:'post'|'comment'|'message'|'member', targetId, reason?}.
// Prüft das Ziel practice-gescoped auf Existenz, legt companion_reports an
// (reporter = Session) und feuert den roten Für-Shukri-Alert (dedupet über
// die Report-id). Erfolgsmeldung rendert der Client:
// "Danke, wir schauen uns das an." Die Identität des Melders erfahren andere
// Patienten nie.

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  reportTarget,
  requireCommunityMember,
} from "@/lib/server/companionCommunity";

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

    await reportTarget(session, body?.kind, body?.targetId, body?.reason);
    return Response.json({ ok: true }, { headers: sessionHeaders(session) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/report:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
