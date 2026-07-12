// GET /api/companion/me — Session-Probe + Identität für die App-Shell.
// Der Name steht NIE im Cookie (keine PII im Transport-Artefakt) — er wird
// hier pro Request serverseitig aufgelöst. Explizite Spaltenliste: aus
// anamnese_submissions werden NUR vorname + nachname gelesen (§9 —
// Diagnose-tragende Felder verlassen den Server nie).

import {
  companionAdmin,
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

export async function GET(req) {
  try {
    const session = await requireSession(req);
    const { submissionId, access } = session;

    const { data: sub, error } = await companionAdmin
      .from("anamnese_submissions")
      .select("vorname, nachname")
      .eq("id", submissionId)
      .maybeSingle();
    if (error) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    // Community-Status (Stufe 6): der Client entscheidet beim Mount des
    // Community-Tabs anhand nickname + community_joined_at zwischen
    // Join-Screen und Feed — ohne extra Roundtrip. Der Nickname ist das
    // Pseudonym, kein Klarname.
    return Response.json(
      {
        ok: true,
        vorname: sub?.vorname || "",
        nachname: sub?.nachname || "",
        nummer: access.patient_number,
        nickname: access.nickname || null,
        community_joined_at: access.community_joined_at || null,
      },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/me:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
