"use client";

// CompanionPush — die leise "🔔 Erinnerungen aktivieren"-Karte im Heute-Tab
// (Stufe 3, Web-Push). Props: { api, hasReminderItems }.
//
// Die Karte erscheint überhaupt nur, wenn es etwas zu erinnern gibt
// (hasReminderItems aus der /today-Antwort) UND der Build einen VAPID-Public-
// Key kennt (NEXT_PUBLIC_VAPID_PUBLIC_KEY wird beim next build inlined — ohne
// ihn kann der Client nicht subscriben, also bleibt die Karte weg).
//
// Zustände:
//   checking     → noch am Prüfen (rendert nichts, kein Flackern)
//   ios-install  → iOS-Safari ohne installierte PWA: Push gibt es auf iOS
//                  (>= 16.4) NUR standalone → Hinweis "Zum Home-Bildschirm"
//   hidden       → Push generell nicht unterstützt → Karte komplett weg
//   denied       → Notification.permission === 'denied' → dezenter Hinweis
//   inactive     → Nutzenerklärung + Button "Erinnerungen aktivieren"
//   active       → "Erinnerungen sind aktiv ✓" + leiser Deaktivieren-Link
//
// Aktivieren: SW registrieren (/companion-sw.js, Scope /companion, idempotent)
// → Notification.requestPermission() → pushManager.subscribe(VAPID) →
// POST /api/companion/push. Deaktivieren: subscription.unsubscribe() +
// DELETE /api/companion/push (schlägt der Server-Delete fehl, räumt spätestens
// der 404/410-Cleanup des Versand-Sweeps die tote Zeile ab).
//
// Auto-Heilung: war Push auf diesem Gerät schon aktiv (localStorage-Flag),
// ist die Erlaubnis erteilt, aber die Subscription weg (Push-Dienst rotiert),
// subscribt der Mount-Effekt still neu und meldet sie an den Server.
//
// Wichtig: alle navigator/window-Zugriffe leben in Effekten/Handlern — die
// Komponente bleibt SSR-sicher. Kein Import von Server-Modulen (Invariante
// der components/companion-Schicht).

import { useEffect, useState } from "react";
import {
  C,
  cardStyle,
  ghostBtn,
  sectionTitle,
} from "@/components/companion/companionUi";

// Wird beim next build inlined — ohne Key keine Karte (siehe Kopfkommentar).
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

const SW_URL = "/companion-sw.js";
const SW_SCOPE = "/companion";

// localStorage-Flag "Erinnerungen waren auf diesem Gerät aktiv" — gesetzt nach
// erfolgreichem Aktivieren, gelöscht beim Deaktivieren. Nur damit kann der
// Mount-Effekt eine vom Push-Dienst rotierte (= verschwundene) Subscription
// von "war nie aktiv" unterscheiden und still neu subscriben (Auto-Heilung).
const PUSH_ACTIVE_FLAG = "vc-companion-push-active";

const FALLBACK_ERROR =
  "Das hat leider nicht geklappt. Bitte versuche es später erneut.";

// localStorage kann werfen (Private Mode) — Erinnerungen dürfen daran nie
// scheitern, deshalb best effort.
function readPushFlag() {
  try {
    return localStorage.getItem(PUSH_ACTIVE_FLAG) === "1";
  } catch {
    return false;
  }
}

function writePushFlag(active) {
  try {
    if (active) localStorage.setItem(PUSH_ACTIVE_FLAG, "1");
    else localStorage.removeItem(PUSH_ACTIVE_FLAG);
  } catch {
    // best effort
  }
}

// Base64url (VAPID-Key-Format) → Uint8Array für pushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

// iPhone/iPad-Safari ohne installierte PWA? Dann fehlt PushManager, aber der
// Patient kann sich helfen: App über Teilen → "Zum Home-Bildschirm" anlegen.
// iPadOS-Gotcha: Safari meldet sich dort als "Macintosh" — Touch-Fähigkeit
// ('ontouchend' in document) verrät das iPad trotzdem (echte Macs haben das
// nicht).
function isIosNotInstalled() {
  const ua = navigator.userAgent || "";
  const isIosDevice =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && "ontouchend" in document);
  if (!isIosDevice) return false;
  const standalone =
    navigator.standalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches);
  return !standalone;
}

export default function CompanionPush({ api, hasReminderItems }) {
  const [status, setStatus] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasReminderItems || !VAPID_PUBLIC_KEY) return undefined;
    let cancelled = false;

    (async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) {
        if (!cancelled) setStatus(isIosNotInstalled() ? "ios-install" : "hidden");
        return;
      }

      // SW früh und idempotent registrieren — so bleibt auch der
      // pushsubscriptionchange-Handler bestehender Subscriptions am Leben.
      try {
        await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      } catch (err) {
        // Nicht UI-blockierend: Aktivieren registriert notfalls erneut.
        console.warn("companion push: SW-Registrierung fehlgeschlagen", err);
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          if (!cancelled) setStatus("active");
          return;
        }

        // AUTO-HEILUNG: Erlaubnis erteilt, Flag "war aktiv" gesetzt, aber
        // keine Subscription mehr → der Push-Dienst hat sie rotiert/verworfen
        // (und pushsubscriptionchange kam nicht durch). Still neu subscriben
        // und an den Server melden — ohne Klick, der Patient hat das ja
        // bereits gewollt. Scheitert es, ehrlich "inactive" zeigen.
        if (reg && Notification.permission === "granted" && readPushFlag()) {
          try {
            const fresh = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            await api("/push", {
              method: "POST",
              body: { subscription: fresh.toJSON() },
            });
            if (!cancelled) setStatus("active");
            return;
          } catch (err) {
            console.warn("companion push: Auto-Heilung fehlgeschlagen", err);
          }
        }

        if (!cancelled) setStatus("inactive");
      } catch {
        if (!cancelled) setStatus("inactive");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasReminderItems, api]);

  async function activate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, {
        scope: SW_SCOPE,
      });
      // Warten, bis der Worker aktiv ist (ready matcht die /companion-Seite).
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("denied");
        return;
      }
      if (permission !== "granted") return; // weggetippt → Zustand bleibt

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      try {
        await api("/push", {
          method: "POST",
          body: { subscription: sub.toJSON() },
        });
      } catch (err) {
        // Server kennt die Subscription nicht → lokal wieder aufräumen,
        // sonst glaubt das Gerät "aktiv", ohne je einen Push zu bekommen.
        try {
          await sub.unsubscribe();
        } catch {
          // best effort
        }
        throw err;
      }

      writePushFlag(true); // ab jetzt darf der Mount-Effekt auto-heilen
      setStatus("active");
    } catch (err) {
      console.warn("companion push: Aktivierung fehlgeschlagen", err);
      // API-Fehler kommen mit deutschem Text (err.status gesetzt) — Browser-
      // Fehler (subscribe/SW) bekommen den generischen deutschen Fallback.
      setError(err?.status ? err.message : FALLBACK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (busy) return;
    setBusy(true);
    setError("");
    writePushFlag(false); // gewollt aus — Auto-Heilung darf NICHT re-subscriben
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const endpoint = sub?.endpoint || "";
      if (sub) await sub.unsubscribe();
      if (endpoint) {
        try {
          await api("/push", { method: "DELETE", body: { endpoint } });
        } catch (err) {
          // Gerät ist bereits abgemeldet — die verwaiste Server-Zeile räumt
          // spätestens der 404/410-Cleanup des nächsten Sweeps ab.
          console.warn("companion push: Server-Abmeldung fehlgeschlagen", err);
        }
      }
      setStatus("inactive");
    } catch (err) {
      console.warn("companion push: Deaktivierung fehlgeschlagen", err);
      setError(err?.status ? err.message : FALLBACK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  // Karte nur zeigen, wenn es etwas zu erinnern gibt und der Client einen
  // Subscribe-Key hat; während der Prüfung und bei "unsupported" still bleiben.
  if (!hasReminderItems || !VAPID_PUBLIC_KEY) return null;
  if (status === "checking" || status === "hidden") return null;

  if (status === "ios-install") {
    return (
      <div style={{ ...cardStyle, fontSize: 14, color: C.text, lineHeight: 1.55 }}>
        <h3 style={{ ...sectionTitle, fontSize: 15 }}>🔔 Erinnerungen</h3>
        Füge die App zuerst über Teilen → &bdquo;Zum Home-Bildschirm&ldquo;
        hinzu, dann kannst du Erinnerungen aktivieren.
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div
        style={{
          ...cardStyle,
          textAlign: "center",
          fontSize: 13.5,
          color: C.textSoft,
          lineHeight: 1.5,
        }}
      >
        🔔 Erinnerungen sind in deinen Browser-Einstellungen blockiert.
      </div>
    );
  }

  if (status === "active") {
    // Dezente Bestätigung im Idiom der help_flag-Karte (tealPale + teal55).
    return (
      <div
        style={{
          ...cardStyle,
          background: C.tealPale,
          border: `1px solid ${C.teal}55`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: C.tealDeep,
            lineHeight: 1.5,
          }}
        >
          🔔 Erinnerungen sind aktiv ✓
        </div>
        {error && <ErrorNote text={error} />}
        <button
          type="button"
          onClick={deactivate}
          disabled={busy}
          style={{
            background: "none",
            border: "none",
            color: C.textSoft,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "8px 6px 0",
            textDecoration: "underline",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Wird deaktiviert …" : "Erinnerungen deaktivieren"}
        </button>
      </div>
    );
  }

  // status === "inactive" — die eigentliche Einladung, leise gehalten.
  return (
    <div style={cardStyle}>
      <h3 style={sectionTitle}>🔔 Erinnerungen aktivieren</h3>
      <p
        style={{
          fontSize: 14,
          color: C.text,
          margin: "0 0 12px",
          lineHeight: 1.55,
        }}
      >
        Wir erinnern dich an das, was Shukri dir verordnet hat — direkt aufs
        Handy.
      </p>
      {error && <ErrorNote text={error} boxed />}
      <button
        type="button"
        onClick={activate}
        disabled={busy}
        style={{
          ...ghostBtn,
          border: `1.5px solid ${C.teal}66`,
          color: C.tealDeep,
          fontWeight: 700,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Wird aktiviert …" : "Erinnerungen aktivieren"}
      </button>
    </div>
  );
}

// Kleiner Fehlerhinweis: boxed (redPale-Kasten, vor dem Button) oder als
// schlichte rote Zeile in der Aktiv-Karte.
function ErrorNote({ text, boxed = false }) {
  if (boxed) {
    return (
      <div
        style={{
          background: C.redPale,
          color: C.red,
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 13.5,
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        {text}
      </div>
    );
  }
  return (
    <div style={{ fontSize: 13, color: C.red, marginTop: 6, lineHeight: 1.5 }}>
      {text}
    </div>
  );
}
