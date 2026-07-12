// SERVER ONLY — nie in Client-Komponenten importieren (Service-Key!)
// ============================================================================
// companionServer.js — Server-Kern der ViveCura Companion Patienten-App
// (Stufe 2 "Login + eigene Daten"). Die EINZIGE Datei, die den Supabase
// Service-Key liest. Alle /api/companion/*-Routen importieren von hier.
//
// Enthält:
//   * companionAdmin       Service-Role-Client (umgeht RLS — deshalb MUSS jede
//                          Query hart auf practice_id + submission_id scopen)
//   * hashPin/verifyPin    scrypt (node:crypto), selbstbeschreibender Hash
//   * signSession/…        HMAC-signiertes, zustandsloses Session-Cookie
//   * requireSession       Cookie prüfen + Zugang PRO REQUEST in der DB
//                          re-checken (active + kein Widerruf) → Sperre und
//                          DSGVO-Widerruf wirken sofort trotz Stateless-Cookie
//   * Rate-Limiter         5 Fehlversuche je Nummer+IP UND 15 je IP über
//                          alle Nummern (Anti-Enumeration) → 10 Min. Sperre
//   * berlinToday/…        ALLE Datumslogik in Europe/Berlin (Vercel = UTC!)
//   * insertCompanionAlert Hilfe-Knopf / Befinden ≤3 → rote recall_task
//                          (erscheint in der bestehenden "Für Shukri"-Liste)
//   * sendPracticeHelpEmail Hilfe-Knopf → SOFORTIGE E-Mail an die Praxis
//                          (Pflichtenheft §9; Resend-HTTP-API, env-gated)
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

// ---------------------------------------------------------------------------
// ENV-GUARD — LAZY: beim Modul-Laden nur lesen, NICHT werfen. Next importiert
// die Routen-Module schon beim `next build`; ein Wurf hier lässt jeden Build
// ohne gesetzte Env-Variablen scheitern (z. B. die Vercel-Preview, bevor die
// Variablen im Dashboard hinterlegt sind). Deshalb: klare Ansage erst beim
// ERSTEN echten Request (requireCompanionEnv in requireSession/Client-Zugriff).
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const COMPANION_SESSION_SECRET = process.env.COMPANION_SESSION_SECRET;

export function requireCompanionEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !COMPANION_SESSION_SECRET) {
    throw new Error(
      "Companion-Server: Umgebungsvariablen fehlen (SUPABASE_URL, " +
        "SUPABASE_SERVICE_KEY, COMPANION_SESSION_SECRET). Lokal: .env.local im " +
        "Repo-Root anlegen; auf Vercel: alle drei Variablen in Preview UND " +
        "Production setzen. Ohne sie kann die Patienten-App nicht starten."
    );
  }
}

// Mandant — gleiche Semantik wie PRACTICE_ID in src/lib/companion.js. Hier
// bewusst dupliziert, damit der Server-Kern ohne den Anon-Client-Layer lädt.
export const PRACTICE_ID = "vivecura";

// Grund-Präfix der Smart-Recall-Aufgaben (Stufe 4) — GETEILTE Konstante:
// companionReminders.js legt die Anruf-Aufgaben mit diesem Präfix an, die
// Check-in-Route (checkin/route.js) räumt sie über LIKE '<Präfix>%' wieder
// ab. Beide importieren von hier — es gibt genau EINE Quelle. Darf NIE mit
// "Companion:" beginnen: dieses Präfix filtert recalls.js/isCompanionAlert
// aus Mahmouds Anrufliste heraus (das sind die Für-Shukri-Alerts).
export const SR_GRUND_PREFIX = "App: Keine Rückmeldung";

// ---------------------------------------------------------------------------
// SERVICE-ROLE-CLIENT — umgeht RLS. Deshalb gilt die harte Invariante: JEDE
// Query in den Companion-Routen scoped auf practice_id UND submission_id der
// Session; Writes auf fremde ids werden vorher per Ownership-SELECT geprüft.
// LAZY hinter einem Proxy: erzeugt erst beim ersten Zugriff (Request-Zeit),
// damit `next build` auch ohne Env-Variablen durchläuft (siehe ENV-GUARD).
// ---------------------------------------------------------------------------
let _companionAdmin = null;
export const companionAdmin = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!_companionAdmin) {
        requireCompanionEnv();
        _companionAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      }
      const value = _companionAdmin[prop];
      return typeof value === "function" ? value.bind(_companionAdmin) : value;
    },
  }
);

// ---------------------------------------------------------------------------
// JSON-Fehler (deutsche Meldungen). Wird als Response GEWORFEN — die Routen
// fangen `instanceof Response` und geben sie direkt zurück.
// ---------------------------------------------------------------------------
export function jsonError(status, message, extraHeaders) {
  return Response.json(
    { ok: false, error: message },
    { status, headers: extraHeaders }
  );
}

// ---------------------------------------------------------------------------
// PATIENTENNUMMER — Eingaben wie "vc-0012", "VC 12" oder "12" auf das
// kanonische Format "VC-0012" normalisieren. null = nicht interpretierbar.
// ---------------------------------------------------------------------------
export function normalizeNummer(input) {
  const raw = String(input || "").trim().toUpperCase();
  const m = raw.match(/^(?:VC[\s-]*)?(\d{1,10})$/);
  if (!m) return null;
  return "VC-" + String(parseInt(m[1], 10)).padStart(4, "0");
}

// ---------------------------------------------------------------------------
// PIN-HASHING (scrypt, node:crypto — keine neue Dependency).
// Format: scrypt$N=16384,r=8,p=1$<salt b64url>$<key b64url>
// Die Parameter stehen IM String, damit ein späteres Kosten-Upgrade alte
// Hashes weiter verifizieren kann. PIN-Regel serverseitig: 6-12 Ziffern
// (min. 6 laut Pflichtenheft, Deckel 12 gegen DoS-lange Eingaben).
// ---------------------------------------------------------------------------
export const PIN_REGEX = /^\d{6,12}$/;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const SCRYPT_KEYLEN = 32;

export async function hashPin(pin) {
  if (!PIN_REGEX.test(String(pin || ""))) {
    throw jsonError(400, "Die PIN muss aus 6 bis 12 Ziffern bestehen.");
  }
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(String(pin), salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return (
    `scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$` +
    `${salt.toString("base64url")}$${key.toString("base64url")}`
  );
}

export async function verifyPin(pin, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const params = {};
    for (const piece of parts[1].split(",")) {
      const [k, v] = piece.split("=");
      params[k] = parseInt(v, 10);
    }
    if (!params.N || !params.r || !params.p) return false;
    const salt = Buffer.from(parts[2], "base64url");
    const expected = Buffer.from(parts[3], "base64url");
    const actual = await scryptAsync(String(pin), salt, expected.length, {
      N: params.N,
      r: params.r,
      p: params.p,
    });
    return (
      actual.length === expected.length &&
      crypto.timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// SESSION-COOKIE "companion_session"
// Wert: v1.<payloadB64url>.<sigB64url>; payload = {sid:<submission_id>, exp}.
// KEINE PII im Cookie — sid ist eine opake UUID, der Name wird pro Request
// serverseitig aufgelöst (/me). Laufzeit 30 Tage MIT Sliding-Renewal
// (Pflichtenheft §3): ist das Cookie beim Request älter als 7 Tage, gibt
// requireSession ein frisches 30-Tage-Cookie mit, das die Routen über
// sessionHeaders an ihre Erfolgs-Response hängen — aktive Patienten bleiben
// so dauerhaft angemeldet, inaktive laufen nach 30 Tagen aus.
// Globaler Kill-Switch: COMPANION_SESSION_SECRET rotieren invalidiert ALLE
// Sessions sofort (kein Redeploy-Kopplungs-Gotcha wie beim Legacy-JWT).
// ---------------------------------------------------------------------------
const COOKIE_NAME = "companion_session";
const SESSION_MAX_AGE_S = 2592000; // 30 Tage
const SESSION_RENEW_AFTER_S = 604800; // 7 Tage — danach greift das Sliding-Renewal

function hmacB64url(payloadB64url) {
  // Env-Check zur Request-Zeit (Modul-Laden darf ohne Env durchgehen — Build).
  requireCompanionEnv();
  return crypto
    .createHmac("sha256", COMPANION_SESSION_SECRET)
    .update(payloadB64url)
    .digest("base64url");
}

function cookieAttributes(maxAge) {
  // Secure nur in Production, damit localhost-Dev (http) funktioniert.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

// Set-Cookie-String für eine frische 30-Tage-Session.
export function signSession(submissionId) {
  const payload = {
    sid: submissionId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const value = `v1.${payloadB64}.${hmacB64url(payloadB64)}`;
  return `${COOKIE_NAME}=${value}${cookieAttributes(SESSION_MAX_AGE_S)}`;
}

// Set-Cookie-String, der das Session-Cookie löscht (Logout).
export function clearSession() {
  return `${COOKIE_NAME}=${cookieAttributes(0)}`;
}

// Mini-Parser für den Cookie-Header (bewusst keine cookie-Lib).
export function parseCookies(header) {
  const out = {};
  for (const piece of String(header || "").split(";")) {
    const idx = piece.indexOf("=");
    if (idx < 0) continue;
    const name = piece.slice(0, idx).trim();
    if (!name) continue;
    out[name] = piece.slice(idx + 1).trim();
  }
  return out;
}

// Signatur + Ablauf prüfen → Payload {sid, exp} oder null. HMAC-Vergleich über
// timingSafeEqual (konstante Zeit). exp bleibt sichtbar, weil das Sliding-
// Renewal daraus das Ausstellungsalter des Cookies ableitet.
function verifySessionPayload(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, payloadB64, sigB64] = parts;
  let given;
  let expected;
  try {
    given = Buffer.from(sigB64, "base64url");
    expected = Buffer.from(hmacB64url(payloadB64), "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(given, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.sid !== "string" || !payload.sid) return null;
  if (typeof payload.exp !== "number") return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// Kompatibilitäts-Wrapper: Signatur + Ablauf prüfen → submission_id oder null.
export function verifySessionValue(value) {
  const payload = verifySessionPayload(value);
  return payload ? payload.sid : null;
}

// Der Wächter jeder Daten-Route: Cookie verifizieren UND den Zugang in der DB
// re-checken. Der DB-Check PRO REQUEST ist Absicht: active=false (Sperre im
// Admin) und consent_revoked_at (DSGVO-Widerruf) wirken damit SOFORT, obwohl
// das Cookie zustandslos ist. Das volle hasKiConsent (inkl. Anamnese-Häkchen)
// wird nur bei Login/Set-PIN ausgewertet — für laufende Sessions genügt
// active + kein Widerruf.
// Wirft bei jedem Problem eine 401-Response ("Bitte melde dich neu an.").
//
// Sliding-Renewal (Pflichtenheft §3): ist das Cookie älter als 7 Tage
// (Ausstellungszeit = exp − 30 Tage), liefert requireSession zusätzlich
// renewCookie (frisches 30-Tage-Set-Cookie). Die Routen hängen es über
// sessionHeaders(session) an ihre Erfolgs-Response — so bleiben aktive
// Patienten dauerhaft angemeldet, ohne dass das Cookie ewig gültig wäre.
export async function requireSession(req) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const payload = verifySessionPayload(cookies[COOKIE_NAME]);
  if (!payload) throw jsonError(401, "Bitte melde dich neu an.");
  const sid = payload.sid;

  const { data: access, error } = await companionAdmin
    .from("companion_access")
    .select(
      "id, submission_id, patient_number, pin_hash, consent_app_at, consent_source, consent_revoked_at, active"
    )
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", sid)
    .maybeSingle();
  if (error) {
    throw jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
  if (!access || access.active !== true || access.consent_revoked_at !== null) {
    throw jsonError(401, "Bitte melde dich neu an.");
  }

  const issuedAt = payload.exp - SESSION_MAX_AGE_S;
  const ageS = Math.floor(Date.now() / 1000) - issuedAt;
  const renewCookie = ageS > SESSION_RENEW_AFTER_S ? signSession(sid) : null;

  return { submissionId: sid, access, renewCookie };
}

// Header-Objekt für Response.json(...): setzt das Renewal-Cookie, wenn
// requireSession eines mitgegeben hat — sonst undefined (keine Extra-Header).
export function sessionHeaders(session) {
  return session?.renewCookie
    ? { "Set-Cookie": session.renewCookie }
    : undefined;
}

// ---------------------------------------------------------------------------
// BRUTE-FORCE-BREMSE — ZWEI Zähler in EINER Map:
//   * `${Nummer}|${IP}`: 5 Fehlversuche → 10 Minuten 429 (Schutz je Nummer).
//   * `ip:${IP}`:       15 Fehlversuche → 10 Minuten 429. Zählt JEDEN
//     Fehlversuch dieser IP über ALLE Nummern (falsche PIN, needsPin-Treffer,
//     Set-PIN auf nicht berechtigten/bereits vergebenen Zugang) und bremst
//     damit das Durchprobieren fortlaufender VC-Nummern (Anti-Enumeration).
// Erfolg löscht nur den Nummer-Key — der IP-Zähler bleibt bewusst stehen,
// sonst könnte ein Angreifer mit EINEM gültigen Zugang seinen IP-Zähler
// zwischen den Enumerations-Proben immer wieder nullen.
//
// DOKUMENTIERTE EINSCHRÄNKUNG (Pflichtenheft/securityNotes): diese Map lebt
// im Modul-Scope einer Vercel-Lambda-Instanz — sie ist NICHT über parallele
// Instanzen geteilt und wird bei jedem Cold Start geleert. Der Limiter ist
// also nur Best-Effort. Der echte Schutz ist die Kombination aus PIN-Raum
// (>= 10^6), scrypt-Kosten pro Rateversuch und generischen Fehlermeldungen.
// Upgrade-Pfad (spätere Stufe): Zähler in einer Tabelle oder einem KV-Store.
//
// RESTRISIKO, ehrlich dokumentiert: die Patientennummern sind sequenziell
// (VC-0001, VC-0002, …) und damit prinzipiell enumerierbar — ein voller,
// gezählter Login-/Set-PIN-Versuch verrät die Existenz einer Nummer. Die
// IP-Sperre begrenzt das nur (verteilte IPs umgehen sie). Die echte Härtung
// ist Stufe 3: qr_token als per-Patient-Geheimnis im Login-Link.
// ---------------------------------------------------------------------------
const rateMap = new Map(); // key → { fails, lockedUntil }
const RATE_MAX_FAILS = 5;
const RATE_MAX_FAILS_IP = 15;
const RATE_LOCK_MS = 10 * 60 * 1000;

export function rateKey(req, nummer) {
  const fwd = String(req.headers.get("x-forwarded-for") || "");
  const ip = fwd.split(",")[0].trim() || "unknown";
  return `${nummer || ""}|${ip}`;
}

// IP-only-Key für den Anti-Enumeration-Zähler (zählt über alle Nummern).
export function ipRateKey(req) {
  const fwd = String(req.headers.get("x-forwarded-for") || "");
  const ip = fwd.split(",")[0].trim() || "unknown";
  return `ip:${ip}`;
}

// Wirft 429, wenn der Key gesperrt ist; räumt abgelaufene Sperren auf.
export function assertNotRateLimited(key) {
  const entry = rateMap.get(key);
  if (!entry) return;
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    rateMap.delete(key);
    return;
  }
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    throw jsonError(429, "Zu viele Versuche. Bitte warte 10 Minuten.");
  }
}

export function registerAuthFailure(key, maxFails = RATE_MAX_FAILS) {
  // Opportunistisches Aufräumen, damit die Map nicht unbegrenzt wächst.
  if (rateMap.size > 1000) {
    const now = Date.now();
    for (const [k, v] of rateMap) {
      if (v.lockedUntil && v.lockedUntil <= now) rateMap.delete(k);
    }
  }
  const entry = rateMap.get(key) || { fails: 0, lockedUntil: 0 };
  entry.fails += 1;
  if (entry.fails >= maxFails) {
    entry.lockedUntil = Date.now() + RATE_LOCK_MS;
    entry.fails = 0; // nach Ablauf der Sperre wieder bei null beginnen
  }
  rateMap.set(key, entry);
}

// Beide Zähler in einem Rutsch erhöhen: Nummer+IP (5er-Limit) UND IP-only
// (15er-Limit) — jeder gezählte Fehlversuch zahlt auf beide Sperren ein.
export function registerAuthFailures(req, key) {
  registerAuthFailure(key);
  registerAuthFailure(ipRateKey(req), RATE_MAX_FAILS_IP);
}

export function resetAuthFailures(key) {
  rateMap.delete(key);
}

// ---------------------------------------------------------------------------
// DATUM/ZEIT — Vercel-Lambdas laufen in UTC. ALLE "heute"-Logik (Heute-Liste,
// Check-in-Upsert, Log-due_date, Serien, Alert-Dedupe) MUSS Europe/Berlin
// verwenden, nie new Date().toISOString().slice(...) — sonst erzeugen
// Spätabend-Einträge Artefakte am Folgetag und die Dedupe bricht.
// ---------------------------------------------------------------------------

// Heute als 'YYYY-MM-DD' in Europe/Berlin (en-CA formatiert ISO-artig).
export function berlinToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ISO-Wochentag in Berlin: 1=Mo … 7=So (Format der days_of_week-Spalte).
export function berlinWeekdayIso() {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(new Date());
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] || 1;
}

// Berliner Tagesbeginn (heute 00:00 Europe/Berlin) als UTC-ISO-Instant —
// Untergrenze für die Alert-Dedupe auf done_at (timestamptz).
export function berlinStartOfDayIso() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t) =>
    parseInt(parts.find((p) => p.type === t)?.value || "0", 10);
  const elapsedMs =
    (((get("hour") % 24) * 60 + get("minute")) * 60 + get("second")) * 1000 +
    now.getMilliseconds();
  return new Date(now.getTime() - elapsedMs).toISOString();
}

// 'YYYY-MM-DD' ± n Tage (reine Datums-Arithmetik, UTC-neutral).
export function addDaysIso(dateStr, n) {
  const [y, m, d] = String(dateStr).split("-").map((x) => parseInt(x, 10));
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// Postgres-time ("08:00:00") → "HH:MM" fürs API-Format; null bleibt null.
export function normTime(t) {
  return t == null ? null : String(t).slice(0, 5);
}

// ---------------------------------------------------------------------------
// ZUGANGS-LOOKUPS für Login/Set-PIN (per Nummer statt Session).
// ---------------------------------------------------------------------------

// Zugang per (Mandant, Patientennummer) — explizite Spaltenliste.
export async function getAccessByNumber(patientNumber) {
  const { data, error } = await companionAdmin
    .from("companion_access")
    .select(
      "id, submission_id, patient_number, pin_hash, consent_app_at, consent_source, consent_revoked_at, active"
    )
    .eq("practice_id", PRACTICE_ID)
    .eq("patient_number", patientNumber)
    .maybeSingle();
  if (error) {
    throw jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
  return data || null;
}

// Anamnese-KI-Häkchen (payload.consent_ki_pseudonym) mit dem Service-Client.
// Bewusst NUR dieses eine Payload-Feld selektieren — Diagnose-tragende Teile
// des Payloads verlassen den Server nie (§9).
export async function getAnamneseKiConsentAdmin(submissionId) {
  const { data, error } = await companionAdmin
    .from("anamnese_submissions")
    .select("consent:payload->consent_ki_pseudonym")
    .eq("id", submissionId)
    .maybeSingle();
  if (error) {
    throw jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
  return !!data?.consent;
}

// ---------------------------------------------------------------------------
// FÜR-SHUKRI-ALERT — Hilfe-Knopf / Befinden ≤3 erzeugen eine recall_task, die
// exakt so geformt ist, dass listForShukri (src/lib/recalls.js) sie findet:
// status 'erledigt', ampel 'rot', geklaert false, done_at jetzt, created_by
// 'auto'. Die Karte erscheint damit ROT ganz oben im bestehenden
// "Für Shukri"-Sub-Tab, und "✓ Geklärt" IST der Klär-Mechanismus.
//
// Dedupe (deterministisch): jede Alert-Notiz trägt am Ende einen Maschinen-
// Marker `[checkin:<id>|<kind>]` — pro (Check-in-Zeile, Alert-Art) entsteht
// maximal EIN ungeklärter Alert. Die Check-in-id kodiert Patient + Berlin-Tag
// (UNIQUE-Index auf companion_checkins), damit spammen wiederholte Knopfdrücke
// die Liste nicht zu; am nächsten Tag (neue Check-in-Zeile) oder nach
// "Geklärt" darf wieder ein neuer entstehen. Kein Emoji-/Namens-Substring-
// Matching mehr — das war nicht deterministisch.
//
// Der Klarname im notiz-Text ist ok: die Admin-Seite ist intern (PII erlaubt);
// nach außen (App/Push) bleibt alles pseudonym.
// ---------------------------------------------------------------------------
const ALERT_REASONS = {
  help: {
    emoji: "🆘",
    grund: "Companion: Hilfe-Knopf gedrückt",
    prefix: "🆘 Hilfe-Knopf",
  },
  low_feeling: {
    emoji: "📉",
    grund: "Companion: Befinden ≤ 3",
    prefix: "📉 Befinden ≤3",
  },
};

export async function insertCompanionAlert({
  submissionId,
  patientNumber,
  reason,
  detail,
  checkinId,
}) {
  const conf = ALERT_REASONS[reason];
  if (!conf) throw new Error(`Unbekannter Alert-Grund: ${reason}`);

  // Maschinen-Marker der deterministischen Dedupe (siehe Blockkommentar oben):
  // exakter String-Match statt Emoji-Substring — pro Check-in UND Alert-Art.
  const marker = `[checkin:${checkinId}|${reason}]`;

  // Dedupe: gibt es heute (Berlin) schon einen ungeklärten Auto-Alert mit
  // exakt diesem Marker? Dann nichts einfügen. (Der done_at-Filter ist nur
  // Scan-Begrenzung — die Tages-Grenze steckt schon in der Check-in-id.)
  const { data: existing, error: dedupeErr } = await companionAdmin
    .from("recall_tasks")
    .select("id, notiz")
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", submissionId)
    .eq("created_by", "auto")
    .eq("geklaert", false)
    .gte("done_at", berlinStartOfDayIso());
  if (dedupeErr) {
    throw jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
  const dup = (existing || []).find((t) =>
    String(t.notiz || "").includes(marker)
  );
  if (dup) return { created: false, id: dup.id };

  // Klarname serverseitig auflösen (nur vorname/nachname — nie mehr).
  const { data: sub } = await companionAdmin
    .from("anamnese_submissions")
    .select("vorname, nachname")
    .eq("id", submissionId)
    .maybeSingle();
  const name =
    [sub?.vorname, sub?.nachname].filter(Boolean).join(" ").trim() ||
    "Unbenannt";

  // Marker ans Ende der Notiz — für Mahmoud/Shukri unauffällig, für die
  // Dedupe eindeutig.
  const detailText = String(detail || "").trim();
  const notiz =
    `${conf.prefix} — ${name} (${patientNumber})` +
    (detailText ? `: ${detailText}` : "") +
    ` ${marker}`;

  const { data, error } = await companionAdmin
    .from("recall_tasks")
    .insert({
      practice_id: PRACTICE_ID,
      submission_id: submissionId,
      grund: conf.grund,
      fragen: [],
      due_date: berlinToday(),
      status: "erledigt",
      ampel: "rot",
      notiz,
      geklaert: false,
      created_by: "auto",
      done_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    throw jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
  return { created: true, id: data.id };
}

// ---------------------------------------------------------------------------
// SOFORT-E-MAIL AN DIE PRAXIS — Pflichtenheft §9: Hilfe-Knopf = rote Liste
// + SOFORTIGE E-Mail an die Praxis (von Shukri per Multiple Choice so
// festgelegt). Versand über die Resend-HTTP-API per fetch — bewusst ohne
// neue npm-Dependency, läuft so direkt in der Vercel-Lambda.
//
// Aktivierung über ENV (auf Vercel in Preview UND Production setzen):
//   COMPANION_ALERT_EMAIL_KEY   Resend-API-Key ("re_…") — PFLICHT für Versand
//   COMPANION_ALERT_EMAIL_TO    Empfänger (Default: praxis@vivecura.com)
//   COMPANION_ALERT_EMAIL_FROM  bei Resend verifizierter Absender (Default:
//                               "ViveCura Companion <no-reply@vivecura.com>")
// Fehlt der Key, wird NICHT gesendet und LAUT geloggt (Vercel-Logs) — die
// §9-Lücke soll auffallen, nicht still bleiben.
//
// Inhalt bewusst pseudonym: nur VC-Nummer + die Notiz, die der Patient selbst
// an die Praxis schreibt — KEIN Klarname (E-Mail verlässt die eigene
// Infrastruktur; die Zuordnung Nummer→Name steht in der roten Für-Shukri-
// Karte im Admin).
//
// Rückgabe true/false statt throw: der Versand darf den Hilferuf des
// Patienten NIE scheitern lassen — der rote Alert ist zu diesem Zeitpunkt
// bereits gesetzt.
// ---------------------------------------------------------------------------
export async function sendPracticeHelpEmail({ patientNumber, note }) {
  const apiKey = process.env.COMPANION_ALERT_EMAIL_KEY;
  const to = process.env.COMPANION_ALERT_EMAIL_TO || "praxis@vivecura.com";
  const from =
    process.env.COMPANION_ALERT_EMAIL_FROM ||
    "ViveCura Companion <no-reply@vivecura.com>";

  if (!apiKey) {
    console.error(
      "companion/help: COMPANION_ALERT_EMAIL_KEY fehlt — Pflichtenheft §9 " +
        "verlangt beim Hilfe-Knopf eine SOFORTIGE Praxis-E-Mail. Der Alert " +
        `für ${patientNumber} steht nur in der Für-Shukri-Liste. Bitte ` +
        "Resend-Key als Vercel-ENV setzen (Preview + Production)."
    );
    return false;
  }

  const noteText = String(note || "").trim();
  const text = [
    `Patient ${patientNumber} hat in der Companion-App den Hilfe-Knopf gedrückt.`,
    "",
    noteText ? `Nachricht an die Praxis: ${noteText}` : "Ohne Nachricht.",
    "",
    "Details (Name, Verlauf) stehen in der roten Karte unter",
    "vivecura.com/admin → Recall → Für Shukri.",
    "",
    "Zusage in der App: Rückmeldung am selben Werktag.",
    "Kein Notfallkanal — die App zeigt immer den 112-Hinweis.",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `🆘 Companion Hilfe-Knopf — ${patientNumber}`,
        text,
      }),
      // Deckel, damit ein hängender Mail-Provider nicht die Lambda blockiert.
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `companion/help: Praxis-E-Mail fehlgeschlagen (HTTP ${res.status}): ` +
          detail.slice(0, 500)
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("companion/help: Praxis-E-Mail fehlgeschlagen:", e);
    return false;
  }
}
