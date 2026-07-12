// /api/companion/community/chat — 1:1-Chat zwischen Mitgliedern.
//   GET   ?with=<submissionId>&since=<iso> → Konversation in beide
//         Richtungen: ohne since die NEUESTEN 200 Nachrichten, mit since
//         nur neuere (Cursor fürs 5s-Polling) — beides aufsteigend
//         geliefert; Antwort enthält cursor = created_at der letzten
//         Nachricht (oder den mitgegebenen since-Wert).
//   POST  {to, body ≤2000}  → senden (Empfänger wird re-validiert:
//         beigetreten + aktiv + gleiche Praxis).
//   PATCH {with}            → markRead (NUR eigene empfangene Nachrichten).

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  getConversation,
  markRead,
  requireCommunityMember,
  sendMessage,
} from "@/lib/server/companionCommunity";

export async function GET(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    const { searchParams } = new URL(req.url);
    const withId = searchParams.get("with");
    const since = searchParams.get("since") || null;

    const messages = await getConversation(session, withId, since);
    const cursor = messages.length
      ? messages[messages.length - 1].createdAt
      : since;
    return Response.json(
      { ok: true, messages, cursor },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/chat:", e);
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

    const message = await sendMessage(session, body?.to, body?.body);
    return Response.json(
      { ok: true, message },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/chat:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}

export async function PATCH(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    await markRead(session, body?.with);
    return Response.json({ ok: true }, { headers: sessionHeaders(session) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/chat:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
