// POST /api/companion/community/post — Beitrag anlegen. Die ERSTE multipart-
// Route des Repos; zwei Content-Type-Zweige:
//   * multipart/form-data: Feld 'body' (Text) + bis zu 4 'files'-Einträge.
//     Serverseitige Validierung (MIME/Größe/Anzahl) passiert VOR dem Upload
//     in companionCommunity.createPost; Upload in den privaten Bucket unter
//     community/<submissionId>/<uuid>.<ext> mit contentType.
//   * application/json {body, media:[paths]}: der upload-url-Zweig — Pfade
//     wurden vom Client direkt zu Supabase Storage hochgeladen und werden
//     hier serverseitig re-verifiziert (eigener Präfix + Existenz + Limits).
// BEKANNTE GRENZE: Vercel-Serverless-Bodies enden bei ~4,5 MB — multipart
// trägt nur kleine Fotos. buildOrder Schritt 14 testet auf der Vercel-
// Preview mit >5 MB; bei 413 stellt der Client-Composer auf den
// upload-url-Zwei-Schritt um (diese Route nimmt ihn schon an).

import {
  jsonError,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";
import {
  createPost,
  requireCommunityMember,
} from "@/lib/server/companionCommunity";

export async function POST(req) {
  try {
    const session = await requireSession(req);
    requireCommunityMember(session);

    const contentType = String(req.headers.get("content-type") || "");
    let body;
    let files = [];
    let paths = [];

    if (contentType.includes("multipart/form-data")) {
      let form;
      try {
        form = await req.formData();
      } catch {
        return jsonError(400, "Ungültige Anfrage.");
      }
      body = form.get("body");
      // Nur echte Datei-Einträge — Strings im 'files'-Feld fliegen raus.
      files = form
        .getAll("files")
        .filter(
          (f) =>
            f && typeof f === "object" && typeof f.arrayBuffer === "function"
        );
    } else {
      let json;
      try {
        json = await req.json();
      } catch {
        return jsonError(400, "Ungültige Anfrage.");
      }
      body = json?.body;
      paths = Array.isArray(json?.media) ? json.media : [];
    }

    const post = await createPost(session, body, files, paths);
    return Response.json(
      { ok: true, post },
      { headers: sessionHeaders(session) }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/community/post:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
