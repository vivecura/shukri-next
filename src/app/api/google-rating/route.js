// Liefert die aktuelle Google-Gesamtnote + Anzahl der Bewertungen fuer die
// Startseiten-Sektion "Was unsere Patienten sagen".
//
// WARUM serverseitig: Der Abruf passiert hier auf dem Server (Vercel), nicht im
// Browser der Besucher. Dadurch baut der Browser keine Verbindung zu Google auf,
// es werden keine Cookies gesetzt und keine IP an Google uebertragen. Das ist die
// DSGVO-schonende Variante (kein Einwilligungs-Banner noetig fuer diesen Bereich).
//
// WARUM nur Note + Anzahl: Die 5 angezeigten Bewertungen sind eine feste,
// handverlesene Auswahl (im Frontend). Ueber die Google-API holen wir bewusst nur
// die Gesamtnote (rating) und die Gesamtzahl (userRatingCount), damit oben immer
// die echten, tagesaktuellen Werte stehen.
//
// COACHING/BETRIEB: Google-Nutzungsbedingungen erlauben KEIN dauerhaftes Speichern
// von Rezensions-Inhalten. Hier wird nichts in einer Datenbank abgelegt, nur die
// Zahl kurz per ISR-Cache (taeglich) zwischengehalten. Das haelt die API-Aufrufe
// minimal (etwa 1 pro Tag) und damit kostenlos.

// Taeglich neu abrufen (24h Cache).
export const revalidate = 86400;

// Letzter bekannter Stand. Wird nur benutzt, wenn die Live-Zahl (noch) nicht
// verfuegbar ist (z.B. bevor der API-Schluessel gesetzt wurde). So ist der
// Abschnitt nie leer und zeigt immer eine sinnvolle Zahl.
const FALLBACK = { rating: 5.0, count: 46 };

// Eindeutige Zuordnung der Praxis (Name + Adresse + Standort).
const PLACE_QUERY = "Vivecura Privatärztliche Praxis von Shukri Jarmoukli, Skalitzer Straße 137, Berlin";
const PLACE_CENTER = { latitude: 52.4996398, longitude: 13.4183315 };

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // Ohne Schluessel: sauberer Fallback, keine Fehlerseite.
  if (!apiKey) {
    return Response.json({ ...FALLBACK, source: "fallback" });
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Nur die zwei benoetigten Felder (guenstige "Pro"-Stufe, kein Rezensions-Feld).
        "X-Goog-FieldMask": "places.rating,places.userRatingCount,places.displayName",
      },
      body: JSON.stringify({
        textQuery: PLACE_QUERY,
        languageCode: "de",
        maxResultCount: 1,
        locationBias: { circle: { center: PLACE_CENTER, radius: 300 } },
      }),
      // Antwort 24h cachen -> ca. 1 API-Aufruf pro Tag.
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return Response.json({ ...FALLBACK, source: "fallback" });
    }

    const data = await res.json();
    const place = data?.places?.[0];
    const rating = place?.rating;
    const count = place?.userRatingCount;
    const name = place?.displayName?.text || "";

    // Sicherheitscheck: nur uebernehmen, wenn es wirklich die Vivecura-Praxis ist.
    if (typeof rating === "number" && typeof count === "number" && /vivecura/i.test(name)) {
      return Response.json({ rating, count, source: "google" });
    }

    return Response.json({ ...FALLBACK, source: "fallback" });
  } catch {
    return Response.json({ ...FALLBACK, source: "fallback" });
  }
}
