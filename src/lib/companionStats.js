// ============================================================================
// companionStats.js — KANONISCHE Heimat der Companion-Statistik-Formeln.
//
// PURE Funktionen: kein Supabase, kein React, kein DOM — nur Arrays, Objekte
// und 'YYYY-MM-DD'-Strings rein und raus. Dadurch nutzbar von BEIDEN Seiten:
//   * Server-Routen (/api/companion/verlauf, /api/companion/checkin)
//   * Admin-Client (Patientenblick, Shukris spätere Therapie-Statistik)
// Eine Wahrheit: Server und Admin rechnen exakt dieselben Zahlen.
//
// Zeitzonen-Gesetz (Vercel-Lambdas laufen UTC, Patienten leben in Berlin):
// Ein 'YYYY-MM-DD'-String aus der DB IST bereits das Berliner Kalenderdatum.
// Deshalb ALLE Datums-Arithmetik als reine String/UTC-Arithmetik (Date.UTC
// auf die geparsten Teile), NIE new Date('YYYY-MM-DD') in lokaler Zeitzone
// interpretieren und nie toISOString() auf "jetzt" loslassen.
//
// Design-Gesetz (§6, kein Medizinprodukt): alles hier ist reine Zähl- und
// Mittelwert-Arithmetik über Patienten-Selbsteinträge — keinerlei Bewertungs-
// oder Diagnose-Logik.
// ============================================================================

// ---------------------------------------------------------------------------
// Datums-Helfer (Europe/Berlin)
// ---------------------------------------------------------------------------

/** Heute als 'YYYY-MM-DD' in Europe/Berlin (en-CA formatiert ISO-artig). */
export function berlinTodayIso() {
  // Fallback lokale Uhr nur für sehr alte WebViews ohne Intl-TZ-Datenbank —
  // auf Node/Vercel greift immer der Intl-Zweig.
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}

/** timestamptz/Date → 'YYYY-MM-DD' in Europe/Berlin (z. B. created_at-Fallbacks). */
export function toBerlinDateIso(ts) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

/** 'YYYY-MM-DD' ± n Tage (reine Datums-Arithmetik, UTC-neutral). */
export function addDaysIso(dateStr, n) {
  const [y, m, d] = String(dateStr).split("-").map((x) => parseInt(x, 10));
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Lückenloses Tages-Array [fromIso … toIso] — Chart-Achsen brauchen JEDEN Kalendertag. */
export function listDatesIso(fromIso, toIso) {
  const out = [];
  for (let d = fromIso; d <= toIso; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

/**
 * ISO-Wochentag (1=Mo … 7=So, Format der days_of_week-Spalte) für ein
 * HISTORISCHES 'YYYY-MM-DD' — reine UTC-Arithmetik auf dem String, denn der
 * String IST bereits das Berliner Kalenderdatum.
 */
export function isoWeekday(dateIso) {
  const [y, m, d] = String(dateIso).split("-").map((x) => parseInt(x, 10));
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

/** Postgres-time ('08:00:00') → 'HH:MM'; null bleibt null. */
export function normTime(t) {
  return t == null ? null : String(t).slice(0, 5);
}

// ---------------------------------------------------------------------------
// Trend-Serien (Check-in-Zeilen → Tageswerte → Schnitt → Delta)
// ---------------------------------------------------------------------------

/**
 * Tages-Serie aus Check-in-Zeilen: je Tag aus days der getter-Wert der
 * passenden Zeile (checkin_date). Fehlender Check-in ODER nicht-numerisches
 * Feld → null — NIE 0, nie interpolieren (ein erfundener Messwert wäre
 * schlimmer als eine Lücke).
 */
export function buildDailySeries(days, checkinRows, getter) {
  const byDate = new Map(
    (checkinRows || []).map((c) => [String(c.checkin_date).slice(0, 10), c])
  );
  return days.map((d) => {
    const c = byDate.get(d);
    if (!c) return null;
    const v = getter(c);
    return typeof v === "number" ? v : null;
  });
}

/**
 * Gleitender 7-Tage-Schnitt: an Index i das Mittel der non-null Werte aus
 * [i-window+1 … i]; weniger als minPoints echte Werte → null. null wird
 * AUSGELASSEN, nie als 0 gezählt. Kein Runden — formatiert wird in der Anzeige.
 */
export function rollingAverage(series, window = 7, minPoints = 2) {
  const out = new Array(series.length).fill(null);
  for (let i = 0; i < series.length; i += 1) {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - window + 1); j <= i; j += 1) {
      const v = series[j];
      if (v !== null && v !== undefined) {
        sum += v;
        n += 1;
      }
    }
    out[i] = n >= minPoints ? sum / n : null;
  }
  return out;
}

/** Letzter echter Wert einer Serie → { index, value } oder null (leer). */
export function lastNonNull(series) {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const v = series[i];
    if (v !== null && v !== undefined) return { index: i, value: v };
  }
  return null;
}

/**
 * Vorwochen-Delta auf der GEGLÄTTETEN Serie: letzter Trend-Wert minus Wert
 * 7 Positionen davor (= gleicher Wochentag). Fehlt eine Seite → null, nie 0.
 */
export function deltaWeek(trend) {
  const last = lastNonNull(trend);
  if (!last || last.index < 7) return null;
  const prev = trend[last.index - 7];
  if (prev === null || prev === undefined) return null;
  return last.value - prev;
}

// ---------------------------------------------------------------------------
// Sofort-Vergleich nach dem Check-in (checkin-Route + Admin)
// ---------------------------------------------------------------------------

/** Die sechs Skalen-Spalten des Tages-Check-ins (Anzeige-Reihenfolge macht der Client). */
export const VERGLEICH_SCALE_FIELDS = [
  "feeling",
  "energy",
  "sleep",
  "verdauung",
  "stress",
  "klarheit",
];

/**
 * Mittel der non-null Werte über rows (getter je Zeile); weniger als
 * minPoints echte Werte → null (ein "Schnitt" aus einem Tag wäre keiner).
 * null wird AUSGELASSEN, nie als 0 gezählt. Kein Runden.
 */
export function meanField(rows, getter, minPoints = 2) {
  let sum = 0;
  let n = 0;
  for (const row of rows) {
    const v = getter(row);
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      n += 1;
    }
  }
  return n >= minPoints ? sum / n : null;
}

/**
 * Sofort-Vergleich { gestern, vorwoche, schnitt7 } aus den Zeilen
 * [heute-7 … heute-1]: gestern = heute-1, vorwoche = heute-7 (per
 * Konstruktion GLEICHER ISO-Wochentag), schnitt7 = Mittel je Skala plus
 * schnitt7.symptome je Symptom-Id. Referenz-Zeilen gehen roh mit — Deltas
 * rechnet der Client. todayRow bleibt in der Signatur (stabile API, auch
 * wenn aktuell nur die Vortage einfließen).
 */
export function buildCheckinVergleich(todayRow, rows7, today) {
  const gestern =
    rows7.find((r) => r.checkin_date === addDaysIso(today, -1)) || null;
  const vorwoche =
    rows7.find((r) => r.checkin_date === addDaysIso(today, -7)) || null;

  const schnitt7 = {};
  for (const field of VERGLEICH_SCALE_FIELDS) {
    schnitt7[field] = meanField(rows7, (r) => r[field]);
  }
  // Alle Symptom-Ids der 7 Vortage — auch inzwischen deaktivierte: der
  // Client blendet über seine Symptomliste selbst aus.
  const symIds = new Set();
  for (const r of rows7) {
    for (const id of Object.keys(r.symptom_scores || {})) symIds.add(id);
  }
  const symptome = {};
  for (const id of symIds) {
    symptome[id] = meanField(rows7, (r) => (r.symptom_scores || {})[id]);
  }
  schnitt7.symptome = symptome;

  return { gestern, vorwoche, schnitt7 };
}

// ---------------------------------------------------------------------------
// Einnahme-Treue (SOLL/IST) + Serien (Streaks)
// ---------------------------------------------------------------------------

/**
 * SOLL-Slots eines Plan-Items an Tag D ('YYYY-MM-DD'): 0 vor dem
 * created_at-Tag (einzige untere Schranke — plan_items haben kein
 * Änderungs-Log), 0 außerhalb start_date/end_date, 0 wenn days_of_week
 * nicht-leer und den ISO-Wochentag nicht enthält (leer = TÄGLICH), sonst
 * max(times.length, 1) — leeres times ist genau EIN Tages-Slot.
 */
export function sollSlots(item, dateIso) {
  const created = String(item.created_at || "").slice(0, 10);
  if (created && dateIso < created) return 0;
  if (item.start_date && dateIso < String(item.start_date).slice(0, 10)) return 0;
  if (item.end_date && dateIso > String(item.end_date).slice(0, 10)) return 0;
  const days = item.days_of_week || [];
  if (days.length && !days.includes(isoWeekday(dateIso))) return 0;
  return Math.max((item.times || []).length, 1);
}

/**
 * Treue-Prozent = round(100 · ist / soll); soll <= 0 → null ("keine
 * Aussage" — nie 0 oder 100 erfinden). Das Deckeln von ist auf soll passiert
 * vorher in buildTreue.
 */
export function adherencePercent(ist, soll) {
  if (!soll || soll <= 0) return null;
  return Math.round((100 * ist) / soll);
}

/**
 * Streak: aufeinanderfolgende Tage (Set aus 'YYYY-MM-DD') rückwärts ab
 * today; heute ohne Eintrag → Zählung ab gestern (Serie noch nicht
 * gerissen). Die Kappung entsteht durch das Lade-/Filter-Fenster des
 * Aufrufers (konstant 60 Tage → faktisch max. 61).
 */
export function streakEndingToday(datesSet, today) {
  let day = datesSet.has(today) ? today : addDaysIso(today, -1);
  let streak = 0;
  while (datesSet.has(day)) {
    streak += 1;
    day = addDaysIso(day, -1);
  }
  return streak;
}

/**
 * Log-Zeilen ({item_id, due_date, due_time}) → { logCounts, daysByItem }.
 * Dedupe über den Slot-Schlüssel (item, Tag, COALESCE(due_time,'00:00')) —
 * exakt die Semantik des UNIQUE-Index uq_companion_item_logs_slot, damit ein
 * 00:00-Slot und ein NULL-Slot nie doppelt zählen.
 *   logCounts: item_id → Map('YYYY-MM-DD' → Anzahl deduplizierter Slots)
 *   daysByItem: item_id → Set('YYYY-MM-DD' >= streakSince) für Serien
 */
export function indexLogs(logs, streakSince) {
  const seenSlots = new Set();
  const logCounts = new Map();
  const daysByItem = new Map();
  for (const log of logs || []) {
    const date = String(log.due_date).slice(0, 10);
    if (date >= streakSince) {
      if (!daysByItem.has(log.item_id)) daysByItem.set(log.item_id, new Set());
      daysByItem.get(log.item_id).add(date);
    }
    const slotKey = `${log.item_id}|${date}|${normTime(log.due_time) ?? "00:00"}`;
    if (seenSlots.has(slotKey)) continue;
    seenSlots.add(slotKey);
    let perDay = logCounts.get(log.item_id);
    if (!perDay) {
      perDay = new Map();
      logCounts.set(log.item_id, perDay);
    }
    perDay.set(date, (perDay.get(date) || 0) + 1);
  }
  return { logCounts, daysByItem };
}

/** Serien je Item (>= 1 Log am Tag → Tag zählt) → [{ itemId, kind, name, streak }]. */
export function buildSerien(items, daysByItem, today) {
  return (items || []).map((it) => ({
    itemId: it.id,
    kind: it.kind,
    name: it.name,
    streak: streakEndingToday(daysByItem.get(it.id) || new Set(), today),
  }));
}

/** Check-in-Streak über die checkin_dates >= streakSince (konstantes 60-Tage-Fenster). */
export function buildCheckinStreak(checkinRows, streakSince, today) {
  const checkinDates = new Set(
    (checkinRows || [])
      .map((c) => String(c.checkin_date).slice(0, 10))
      .filter((d) => d >= streakSince)
  );
  return streakEndingToday(checkinDates, today);
}

/**
 * Treue-Startdatum für range='all': frühester Zähl-Tag über alle Items
 * (je Item der spätere von created_at-Tag und start_date); kein Item vor
 * bis → bis (leerer Zeitraum, treue wird "keine Aussage").
 */
export function earliestTreueStart(items, bis) {
  let earliest = null;
  for (const it of items || []) {
    const created = String(it.created_at || "").slice(0, 10);
    const start = it.start_date ? String(it.start_date).slice(0, 10) : "";
    const lower = start > created ? start : created;
    if (lower && (!earliest || lower < earliest)) earliest = lower;
  }
  return earliest && earliest <= bis ? earliest : bis;
}

/**
 * Einnahme-Treue über [von … bis]: pro Tag IST auf SOLL gedeckelt (Logs vor
 * einer Plan-Änderung dürfen nie über 100 % erzeugen), dann summiert.
 * Liefert { von, bis, gesamt: {ist, soll, prozent}, proItem } — proItem nur
 * für Items mit SOLL > 0 im Zeitraum, je Item mit letzte14 (fix die letzten
 * 14 Tage bis bis, [{ date, ist, soll }] für MiniBars).
 * logCounts wie aus indexLogs (item_id → Map(Tag → Slot-Anzahl)).
 */
export function buildTreue(items, logCounts, von, bis) {
  const letzte14Start = addDaysIso(bis, -13);
  let gesamtIst = 0;
  let gesamtSoll = 0;
  const proItem = [];
  for (const it of items || []) {
    const counts = logCounts.get(it.id) || new Map();
    let ist = 0;
    let soll = 0;
    for (let d = von; d <= bis; d = addDaysIso(d, 1)) {
      const s = sollSlots(it, d);
      if (!s) continue;
      soll += s;
      ist += Math.min(counts.get(d) || 0, s);
    }
    gesamtIst += ist;
    gesamtSoll += soll;
    // Items ohne SOLL im Zeitraum weglassen — "keine Aussage" ist keine
    // Zeile wert (der Client zeigt nur, was zählbar war).
    if (soll <= 0) continue;
    const letzte14 = [];
    for (let d = letzte14Start; d <= bis; d = addDaysIso(d, 1)) {
      const s = sollSlots(it, d);
      letzte14.push({ date: d, ist: Math.min(counts.get(d) || 0, s), soll: s });
    }
    proItem.push({
      itemId: it.id,
      name: it.name,
      kind: it.kind,
      ist,
      soll,
      prozent: adherencePercent(ist, soll),
      letzte14,
    });
  }
  return {
    von,
    bis,
    gesamt: {
      ist: gesamtIst,
      soll: gesamtSoll,
      prozent: adherencePercent(gesamtIst, gesamtSoll),
    },
    proItem,
  };
}
