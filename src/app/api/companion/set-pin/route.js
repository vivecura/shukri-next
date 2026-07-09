// POST /api/companion/set-pin — PIN festlegen beim ersten Besuch.
// Body {nummer, pin}. Der Client erzwingt "zweimal eingeben, muss
// übereinstimmen" — der Server bekommt nur die EINE bestätigte PIN.
//
// Kern-Sicherheit: der Claim ist ATOMAR — UPDATE ... WHERE pin_hash IS NULL.
// Von zwei Rennen gewinnt genau eines; der Verlierer trifft null Zeilen und
// bekommt einen klaren deutschen Fehler. Eine gesetzte PIN kann über diese
// Route NIE überschrieben werden. Nach einem Admin-PIN-Reset (pin_hash=null)
// scharf-schaltet dieselbe Route den Zugang erneut.

import {
  companionAdmin,
  getAccessByNumber,
  getAnamneseKiConsentAdmin,
  hashPin,
  jsonError,
  normalizeNummer,
  PIN_REGEX,
  PRACTICE_ID,
  rateKey,
  ipRateKey,
  assertNotRateLimited,
  registerAuthFailures,
  resetAuthFailures,
  signSession,
} from "@/lib/server/companionServer";
import { hasKiConsent } from "@/lib/companion";

const GENERIC_403 = "Zugang nicht möglich. Bitte melde dich in der Praxis.";

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

    const pin = String(body?.pin ?? "");
    if (!PIN_REGEX.test(pin)) {
      return jsonError(400, "Die PIN muss aus 6 bis 12 Ziffern bestehen.");
    }

    // Berechtigung serverseitig re-validieren (nie der UI vertrauen):
    // Zugang existiert, aktiv, Einwilligungs-Gate offen. Set-PIN auf einen
    // nicht berechtigten Zugang zählt als Fehlversuch auf BEIDE Zähler
    // (Nummer+IP und IP-only — Anti-Probing über alle Nummern hinweg).
    const access = nummer ? await getAccessByNumber(nummer) : null;
    if (!access || access.active !== true) {
      registerAuthFailures(req, key);
      return jsonError(403, GENERIC_403);
    }
    const anamneseConsent = await getAnamneseKiConsentAdmin(access.submission_id);
    if (!hasKiConsent(anamneseConsent, access)) {
      registerAuthFailures(req, key);
      return jsonError(403, GENERIC_403);
    }

    // Atomarer Claim: nur wenn pin_hash JETZT noch NULL ist, greift das
    // Update. Race-Verlierer (oder bereits vergebene PIN) → 0 Zeilen.
    const newHash = await hashPin(pin);
    const { data: claimed, error } = await companionAdmin
      .from("companion_access")
      .update({ pin_hash: newHash })
      .eq("practice_id", PRACTICE_ID)
      .eq("patient_number", nummer)
      .is("pin_hash", null)
      .select("submission_id");
    if (error) {
      return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
    }
    if (!claimed || claimed.length === 0) {
      // Claim nicht gegriffen (Race verloren / PIN längst vergeben) — zählt
      // ebenfalls auf beide Zähler.
      registerAuthFailures(req, key);
      return jsonError(
        409,
        "Für diese Nummer ist bereits eine PIN festgelegt. Bitte melde dich mit deiner PIN an."
      );
    }

    // Erfolg = Auto-Login: Session-Cookie direkt setzen. Löscht nur den
    // Nummer-Zähler — der IP-Zähler bleibt bewusst stehen.
    resetAuthFailures(key);
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": signSession(claimed[0].submission_id) } }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/set-pin:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}

export async function GET() {
  return Response.json({ ok: true, endpoint: "companion-set-pin" });
}
