// POST/DELETE /api/companion/push — Push-Subscription des Geräts an-/abmelden.
//
// POST  Body {subscription: {endpoint, keys: {p256dh, auth}}} (= sub.toJSON()
//       aus dem Browser). Upsert mit onConflict 'endpoint': der Endpoint ist
//       der Geräte-Anker — meldet sich auf demselben Gerät später ein anderer
//       Patient an, wandert die Subscription korrekt zu ihm (kein Push an den
//       Vorgänger).
// DELETE Body {endpoint}. Löscht HART gescopet auf practice_id + submission_id
//       der Session + endpoint — der Service-Key umgeht RLS, also darf nur die
//       EIGENE Subscription getroffen werden (Ownership-Scoping ist Pflicht).
//
// Kein web-push-Import hier — der Versand lebt komplett in
// src/lib/server/companionReminders.js.

import {
  companionAdmin,
  jsonError,
  PRACTICE_ID,
  requireSession,
  sessionHeaders,
} from "@/lib/server/companionServer";

// Eingabe-Kappen: echte Browser-Subscriptions liegen weit darunter (Endpoint
// ~200–400 Zeichen, Keys Base64url fester Länge) — alles darüber ist kein
// Browser, sondern ein Flutungsversuch gegen die Tabelle.
const MAX_ENDPOINT_LEN = 1000;
const MAX_KEY_LEN = 256;
const MAX_USER_AGENT_LEN = 300;
// Max. Subscriptions je Patient — bei Überlauf fliegen die ältesten Zeilen
// DES Patienten, bevor die neue reinkommt (Geräte-Rotation statt Flut).
const MAX_SUBSCRIPTIONS_PER_PATIENT = 10;

export async function POST(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const sub = body?.subscription;
    const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
    const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
    const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";

    // Endpoint muss eine https-URL sein (Push-Dienste liefern immer https —
    // alles andere ist keine echte Browser-Subscription).
    let endpointOk = false;
    try {
      endpointOk = new URL(endpoint).protocol === "https:";
    } catch {
      endpointOk = false;
    }
    if (!endpointOk || !p256dh || !auth) {
      return jsonError(400, "Ungültige Anfrage.");
    }
    if (
      endpoint.length > MAX_ENDPOINT_LEN ||
      p256dh.length > MAX_KEY_LEN ||
      auth.length > MAX_KEY_LEN
    ) {
      return jsonError(400, "Ungültige Anfrage.");
    }

    // Kappe je Patient: ist der Endpoint neu UND das Limit erreicht, die
    // ältesten Zeilen dieses Patienten löschen (endpoint ist UNIQUE — ein
    // bestehender Endpoint wird nur upsert-aktualisiert, kein Überlauf).
    const { data: existing, error: listErr } = await companionAdmin
      .from("companion_push_subscriptions")
      .select("endpoint, created_at")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true });
    if (listErr) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }
    const rows = existing || [];
    if (
      !rows.some((r) => r.endpoint === endpoint) &&
      rows.length >= MAX_SUBSCRIPTIONS_PER_PATIENT
    ) {
      const oldest = rows
        .slice(0, rows.length - (MAX_SUBSCRIPTIONS_PER_PATIENT - 1))
        .map((r) => r.endpoint);
      const { error: delErr } = await companionAdmin
        .from("companion_push_subscriptions")
        .delete()
        .eq("practice_id", PRACTICE_ID)
        .eq("submission_id", submissionId)
        .in("endpoint", oldest);
      if (delErr) {
        return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
      }
    }

    const { error } = await companionAdmin
      .from("companion_push_subscriptions")
      .upsert(
        {
          practice_id: PRACTICE_ID,
          submission_id: submissionId,
          endpoint,
          p256dh,
          auth,
          user_agent: (req.headers.get("user-agent") || "").slice(
            0,
            MAX_USER_AGENT_LEN
          ),
        },
        { onConflict: "endpoint" }
      );
    if (error) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    return Response.json({ ok: true }, { headers: sessionHeaders(session) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/push POST:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}

export async function DELETE(req) {
  try {
    const session = await requireSession(req);
    const { submissionId } = session;

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) return jsonError(400, "Ungültige Anfrage.");

    // Nur die EIGENE Subscription — Scoping auf Session-Patient ist Pflicht
    // (Service-Key umgeht RLS).
    const { error } = await companionAdmin
      .from("companion_push_subscriptions")
      .delete()
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", submissionId)
      .eq("endpoint", endpoint);
    if (error) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }

    return Response.json({ ok: true }, { headers: sessionHeaders(session) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/push DELETE:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}
