// GET/POST /api/companion/cron — Trigger des Erinnerungs-Sweeps (Stufe 3).
//
// KEINE Session: Aufrufer ist eine Maschine (Testphase: launchd auf dem Mac
// mini, minütlich per curl — siehe Projects/Follow-Up-App/betrieb/
// PUSH-BETRIEB.md). Guard ist ausschließlich der Header x-cron-secret gegen
// COMPANION_CRON_SECRET (lazy zur Request-Zeit gelesen). Fehlt das Secret in
// der Env ODER ist der Header falsch/leer → 403. NIEMALS "kein Secret gesetzt
// = offen".
//
// GO-LIVE-VORMERKUNG (dokumentiert in PUSH-BETRIEB.md, in dieser Stufe NICHT
// gebaut): Vercel Cron kann keine Custom-Header setzen und schickt stattdessen
// `Authorization: Bearer <CRON_SECRET>` — der Guard wird dann um diese
// Bearer-Prüfung auf COMPANION_CRON_SECRET erweitert (Einzeiler).
//
// Kein web-push-Import hier — die gesamte Versand-Logik lebt in
// src/lib/server/companionReminders.js.

import { createHash, timingSafeEqual } from "node:crypto";
import { jsonError } from "@/lib/server/companionServer";
import { runReminderSweep } from "@/lib/server/companionReminders";

// Vercel-Funktionslimit: der 09:00-Lauf (Stufe 4) schreibt in einer Schleife je stillem Patienten Claim + Aufgabe — 60 s Puffer statt Default.
export const maxDuration = 60;

// Timing-sicherer Secret-Vergleich: beide Seiten erst sha256-hashen (gleiche,
// feste Länge — timingSafeEqual verlangt das und die Länge des echten Secrets
// bleibt unbeobachtbar), dann timingSafeEqual statt ===. Ein ===-Vergleich
// bricht beim ersten falschen Byte ab und leakt so per Antwortzeit, wie viele
// führende Zeichen stimmen.
function secretMatches(given, secret) {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

async function handle(req) {
  try {
    const secret = process.env.COMPANION_CRON_SECRET; // lazy: erst zur Request-Zeit
    const given = req.headers.get("x-cron-secret") || "";
    // Kein Secret in der Env = zu, NIE offen.
    if (!secret || !secretMatches(given, secret)) {
      return jsonError(403, "Zugriff verweigert.");
    }

    const counters = await runReminderSweep();
    return Response.json({ ok: true, ...counters });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("companion/cron:", e);
    return jsonError(500, "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.");
  }
}

export async function GET(req) {
  return handle(req);
}

export async function POST(req) {
  return handle(req);
}
