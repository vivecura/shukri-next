// POST /api/companion/logout — löscht das Session-Cookie (Max-Age=0).
// Funktioniert bewusst auch OHNE gültige Session. Ehrliche Einschränkung
// (securityNotes): das Cookie ist zustandslos — Logout löscht nur das Cookie
// DIESES Clients; ein gestohlenes Cookie bleibt bis exp gültig, außer der
// Zugang wird gesperrt (requireSession re-checkt active/Widerruf pro Request)
// oder COMPANION_SESSION_SECRET wird rotiert (globaler Kill-Switch).

import { clearSession } from "@/lib/server/companionServer";

export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearSession() } }
  );
}

export async function GET() {
  return Response.json({ ok: true, endpoint: "companion-logout" });
}
