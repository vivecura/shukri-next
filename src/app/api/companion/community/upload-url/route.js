// POST /api/companion/community/upload-url — signierte Direkt-Upload-URLs
// für große Medien (Vercel-Serverless-Bodies enden bei ~4,5 MB; 10-MB-Fotos
// und 60-MB-Videos passen da nie durch). Gleiche MIME-/Größen-/Anzahl-
// Whitelist wie /community/post; Ziel-Pfade IMMER unter dem eigenen Präfix
// community/<submissionId>/. Der Client lädt die Dateien direkt zu Supabase
// Storage hoch (uploadToSignedUrl bzw. PUT auf die signedUrl) und POSTet
// danach /community/post als JSON mit den zurückgegebenen Pfaden — dort
// werden sie serverseitig re-verifiziert.
// Body: {files:[{type,size}, …]} ODER (Kompatibilität) {type, size, count}.

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  createUploadUrls,
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

    // Bevorzugt files:[{type,size}]; alternativ {type,size,count} für
    // count gleichartige Dateien. count wird VOR dem Array.from hart
    // geklemmt — sonst könnte ein riesiger Wert (z. B. 1e9) die Lambda
    // per Speicher-Explosion crashen, bevor createUploadUrls (≤4) prüft.
    let specs;
    if (Array.isArray(body?.files)) {
      specs = body.files;
    } else {
      const count = Number.isInteger(body?.count) && body.count > 0 ? body.count : 1;
      if (count > 4) {
        return jsonError(400, "Maximal 4 Fotos/Videos pro Beitrag.");
      }
      specs = Array.from({ length: count }, () => ({
        type: body?.type,
        size: body?.size,
      }));
    }

    const uploads = await createUploadUrls(session, specs);
    return Response.json(
      { ok: true, uploads },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/upload-url:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
