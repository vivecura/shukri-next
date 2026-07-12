// ============================================================================
// companion-sw.js — Push-Service-Worker der ViveCura Companion App (Stufe 3).
//
// REINER Push-Worker: bewusst KEIN fetch-/Caching-Handler — das Offline- und
// Ladeverhalten der App bleibt exakt wie ohne Service Worker. Der Worker
// existiert nur, damit Web-Push-Benachrichtigungen ankommen und ein Tipp
// darauf die App öffnet.
//
// Die Datei liegt in public/ (= Root-Scope möglich); registriert wird sie aus
// CompanionApp.js mit { scope: '/companion' }.
//
// Payload-Vertrag (kommt aus src/lib/server/companionReminders.js):
//   { title, body, url, tag } — streng pseudonym (§5): NIE ein Klarname,
//   Lockscreens sind fremdeinsehbar. title ist konstant "ViveCura Companion".
//
// Bekannte, bewusste Lücke dieser Stufe: das Manifest hat kein 192px-/
// maskable-/monochromes Badge-Icon — LOGO.png ist der pragmatische Stand.
// Icon-Nachrüstung ist NICHT Teil dieser Stufe.
// ============================================================================

self.addEventListener("push", (event) => {
  // Payload defensiv parsen: kaputtes/fehlendes JSON darf die Anzeige nicht
  // verhindern (iOS verlangt, dass auf ein Push-Event eine sichtbare
  // Notification folgt — sonst entzieht Safari das Push-Recht).
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "ViveCura Companion";
  const options = {
    body: data.body || "",
    icon: "/Assets/LOGO.png",
    badge: "/Assets/LOGO.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/companion" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Nur relative Same-Origin-Pfade zulassen: "/…" ja, "//host" (protokoll-
  // relativ = fremder Host!) und absolute URLs nein — sonst könnte eine
  // manipulierte Payload den Patienten auf eine fremde Seite schicken.
  let url = (event.notification.data && event.notification.data.url) || "/companion";
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    url = "/companion";
  }
  event.waitUntil(
    (async () => {
      // Vorhandenes App-Fenster fokussieren statt ein zweites zu öffnen.
      // Match über den exakten Pfad (URL.pathname), NICHT per Substring —
      // "includes('/companion')" würde z. B. auch "/blog/companion-tiere"
      // oder ein "?from=/companion"-Query fälschlich treffen.
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        let path = "";
        try {
          path = new URL(client.url).pathname;
        } catch {
          continue;
        }
        if (
          (path === "/companion" || path.startsWith("/companion/")) &&
          "focus" in client
        ) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});

// Best effort: manche Push-Dienste rotieren Subscriptions. Dann mit dem alten
// applicationServerKey neu subscriben und same-origin an die eigene API
// melden (Session-Cookie läuft automatisch mit). Scheitert das (z. B. Session
// abgelaufen), bleibt es still — beim nächsten App-Besuch subscribt die
// Erinnerungs-Karte (CompanionPush) dann automatisch neu: Erlaubnis erteilt +
// lokales "war aktiv"-Flag, aber keine Subscription → Auto-Heilung im
// Mount-Effekt.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldSub = event.oldSubscription;
        const key = oldSub && oldSub.options && oldSub.options.applicationServerKey;
        if (!key) return;
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await fetch("/api/companion/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      } catch {
        // best effort — siehe Kommentar oben
      }
    })()
  );
});
