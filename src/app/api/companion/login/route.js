// POST /api/companion/login — zwei Modi in EINER Route:
//   1. Probe:  {nummer}       → IMMER dieselbe generische 200 { ok, next:"pin" }
//   2. Login:  {nummer, pin}  → verifyPin → Session-Cookie → { ok:true };
//                               PIN noch nicht festgelegt → { ok, needsPin:true }
//
// Sicherheits-Design (Pflichtenheft Stufe 2, Anti-Enumeration):
//   * Die PIN-lose Probe verrät NICHTS mehr: gültige wie ungültige Nummern
//     bekommen exakt dieselbe Antwort (kein DB-Zugriff) — die echte Prüfung
//     passiert erst beim vollen Login-/Set-PIN-Versuch.
//   * needsPin (Erst-Besuch, pin_hash NULL) wird erst nach einem VOLLEN
//     Login-Versuch verraten, der als Fehlversuch in BEIDE Rate-Limits zählt
//     (Nummer+IP und IP-only) — Existenz einer Nummer kostet also immer.
//   * Im Login-Modus ist die Fehlermeldung für unbekannte Nummer und falsche
//     PIN identisch ("Nummer oder PIN falsch.").
//   * Rate-Limiter (Best-Effort, siehe companionServer.js): 5 Fehlversuche je
//     Nummer+IP UND 15 je IP über ALLE Nummern → je 10 Minuten Sperre.
//
// RESTRISIKO, ehrlich dokumentiert: die VC-Nummern sind sequenziell und damit
// prinzipiell durchprobierbar; die IP-Sperre begrenzt das nur (verteilte IPs
// umgehen sie). Die echte Härtung ist Stufe 3: qr_token als per-Patient-
// Geheimnis im Login-Link.

import {
  getAccessByNumber,
  getAnamneseKiConsentAdmin,
  jsonError,
  normalizeNummer,
  PIN_REGEX,
  rateKey,
  ipRateKey,
  assertNotRateLimited,
  registerAuthFailures,
  resetAuthFailures,
  signSession,
  verifyPin,
} from "@/lib/server/companionServer";
// hasKiConsent ist PUR (keine Client-Abhängigkeit) — serverseitig sicher.
// Umgekehrt gilt: companionServer NIE in Client-Komponenten importieren.
import { hasKiConsent } from "@/lib/companion";

const GENERIC_401 = "Nummer oder PIN falsch.";

// Volle Berechtigungsprüfung (nur bei Login/Set-PIN — Sessions re-checken
// später nur active + Widerruf, siehe requireSession).
async function isEligible(access) {
  if (!access || access.active !== true) return false;
  const anamneseConsent = await getAnamneseKiConsentAdmin(access.submission_id);
  return hasKiConsent(anamneseConsent, access);
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.");
    }

    const nummer = normalizeNummer(body?.nummer);
    const key = rateKey(req, nummer || String(body?.nummer || ""));
    assertNotRateLimited(key);
    assertNotRateLimited(ipRateKey(req));

    const pinGiven = body?.pin !== undefined && body?.pin !== null && body?.pin !== "";

    // ---- Modus 1: Nummer-Probe (kein PIN im Body) --------------------------
    // Bewusst OHNE DB-Zugriff und IMMER dieselbe Antwort — ob eine Nummer
    // existiert oder berechtigt ist, lässt sich hier nicht mehr ablesen.
    if (!pinGiven) {
      return Response.json({ ok: true, next: "pin" });
    }

    // ---- Modus 2: Login (Nummer + PIN) -------------------------------------
    const pin = String(body.pin);
    if (!nummer) {
      registerAuthFailures(req, key);
      return jsonError(401, GENERIC_401);
    }
    const access = await getAccessByNumber(nummer);
    const eligible = access ? await isEligible(access) : false;

    // Erst-Besuch: Zugang berechtigt, aber pin_hash noch NULL → needsPin.
    // Zählt bewusst als Fehlversuch auf BEIDE Zähler (die Antwort verrät die
    // Existenz der Nummer); der Client wechselt daraufhin auf "PIN festlegen".
    if (access && eligible && !access.pin_hash) {
      registerAuthFailures(req, key);
      return Response.json({ ok: true, needsPin: true });
    }

    // Formatfehler, unbekannte Nummer, nicht berechtigt: alles dieselbe
    // generische 401 — und alles zählt als Fehlversuch (beide Zähler).
    if (!PIN_REGEX.test(pin) || !access || !eligible) {
      registerAuthFailures(req, key);
      return jsonError(401, GENERIC_401);
    }
    const valid = await verifyPin(pin, access.pin_hash);
    if (!valid) {
      registerAuthFailures(req, key);
      return jsonError(401, GENERIC_401);
    }

    // Erfolg löscht nur den Nummer-Zähler — der IP-Zähler bleibt stehen
    // (sonst könnte ein gültiger Zugang ihn zwischen Proben immer nullen).
    resetAuthFailures(key);
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": signSession(access.submission_id) } }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/login:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}

// Health-Check (Haus-Idiom, vgl. /api/revalidate).
export async function GET() {
  return Response.json({ ok: true, endpoint: "companion-login" });
}
