// ============================================================================
// daySlots.js — die kanonischen Tageszeit-Slots des ViveCura Companion:
// DIE eine Brücke zwischen ärztlicher Kurznotation (1-0-1), dem Admin-Editor
// (AdminCompanionSection) und der Patienten-Timeline (CompanionHeute/-Plan).
//
// Pure Logik, clientsicher: kein Supabase, kein JSX — direkt importierbar im
// Admin (@/lib/daySlots) und re-exportiert über companionUi.js, damit die
// Patienten-Komponenten bei ihrem einen Import-Pfad bleiben.
//
// Kein Schema-/SQL-Change: companion_plan_items.times (time[]) bleibt der
// Speicher. Vier Slots haben eine kanonische Uhrzeit, die Chips und Schema
// dort hineinschreiben (Morgens 08:00 · Mittags 12:30 · Abends 18:30 ·
// Zur Nacht 22:00); "nachmittags" ist ein reiner Gruppierungs-Slot für freie
// Uhrzeiten (time: null) — er taucht nie als Chip oder Schema-Ziffer auf und
// wird in der Plan-Tabelle in die Mittags-Spalte gefaltet.
//
// Gruppierungs-Grenzen (fromHour ≤ h < toHour, lückenlos 0–24):
//   ☀️ Morgens < 11 · 🌞 Mittags 11–14:59 · 🌤 Nachmittags 15–16:59 ·
//   🌙 Abends 17–20:59 · 🛌 Zur Nacht ≥ 21.
// ============================================================================

// "08:00:00" | "08:00" → 8; Unlesbares → null.
function hourOf(time) {
  const h = parseInt(String(time ?? "").slice(0, 2), 10);
  return Number.isNaN(h) ? null : h;
}

// "08:00:00" → "08:00" (Postgres time[] liefert Sekunden mit).
function hm(time) {
  return String(time ?? "").slice(0, 5);
}

// key, emoji, label (ärztlich/Admin), patientLabel (Timeline der App), time
// (kanonische Uhrzeit | null), fromHour/toHour + matches(time) für die
// Gruppierung beliebiger Uhrzeiten.
export const DAY_SLOTS = [
  { key: "morgens", emoji: "☀️", label: "Morgens", patientLabel: "Morgens", time: "08:00", fromHour: 0, toHour: 11 },
  { key: "mittags", emoji: "🌞", label: "Mittags", patientLabel: "Mittags", time: "12:30", fromHour: 11, toHour: 15 },
  { key: "nachmittags", emoji: "🌤", label: "Nachmittags", patientLabel: "Nachmittags", time: null, fromHour: 15, toHour: 17 },
  { key: "abends", emoji: "🌙", label: "Abends", patientLabel: "Abends", time: "18:30", fromHour: 17, toHour: 21 },
  { key: "nacht", emoji: "🛌", label: "Zur Nacht", patientLabel: "Vor dem Schlafen", time: "22:00", fromHour: 21, toHour: 24 },
].map((s) => ({
  ...s,
  matches: (time) => {
    const h = hourOf(time);
    return h != null && h >= s.fromHour && h < s.toHour;
  },
}));

// Die vier verordnungsfähigen Slots (Chips im Admin, Schema-Ziffern,
// Spalten des Tagesüberblicks) — in Schema-Reihenfolge morgens-mittags-
// abends-nacht (nachmittags hat keine kanonische Uhrzeit und fliegt raus).
export const CANONICAL_SLOTS = DAY_SLOTS.filter((s) => s.time);

// "HH:MM(:SS)" → Slot-Objekt der Gruppierung; null/Unlesbares → null
// (Aufrufer entscheiden: Timeline → "jederzeit", Tabelle → Fallback-Spalte).
export function slotForTime(time) {
  return DAY_SLOTS.find((s) => s.matches(time)) || null;
}

// times[] → klassische Kurznotation: "1-0-1" (3 Ziffern) bzw. "1-0-1-1"
// (4. Ziffer nur, wenn Zur Nacht aktiv ist — klassisch bleibt klassisch).
// Aktiv ist ein Slot, wenn seine EXAKTE kanonische Uhrzeit in times steht;
// freie Uhrzeiten ändern das Schema nicht. Nichts aktiv → "".
export function timesToSchema(times) {
  const set = new Set((times || []).map(hm));
  const digits = CANONICAL_SLOTS.map((s) => (set.has(s.time) ? "1" : "0"));
  if (!digits.includes("1")) return "";
  if (digits[3] === "0") digits.pop();
  return digits.join("-");
}

// Kurznotation → { on: [morgens, mittags, abends, nacht], hasAmount } | null.
// Akzeptiert 3 Ziffern (morgens-mittags-abends, Zur Nacht = 0) oder 4
// Ziffern (+ zur Nacht), Trenner "-", Leerzeichen egal. Ziffer > 0 = Slot an;
// hasAmount meldet Ziffern > 1 (Menge gehört in die Dosis, nicht ins Schema).
export function parseSchema(str) {
  const m = String(str || "")
    .replace(/\s+/g, "")
    .match(/^(\d)-(\d)-(\d)(?:-(\d))?$/);
  if (!m) return null;
  const digits = [m[1], m[2], m[3], m[4] ?? "0"].map((d) => parseInt(d, 10));
  return {
    on: digits.map((d) => d > 0),
    hasAmount: digits.some((d) => d > 1),
  };
}

// Schema aufs times-Array anwenden: kanonische Uhrzeiten der vier Slots
// exakt nach on[] setzen/entfernen, freie (nicht-kanonische) Uhrzeiten
// unangetastet lassen. Liefert ein sauberes, sortiertes HH:MM-Array.
export function applySchemaToTimes(times, on) {
  const canonical = new Set(CANONICAL_SLOTS.map((s) => s.time));
  const next = new Set((times || []).map(hm).filter((t) => !canonical.has(t)));
  CANONICAL_SLOTS.forEach((s, i) => {
    if (on[i]) next.add(s.time);
  });
  return [...next].sort();
}

// times[] → Anzeige mit Slot-Worten statt roher kanonischer Uhrzeiten:
// ["08:00","18:30"] → "morgens · abends"; freie Uhrzeiten bleiben roh
// ("morgens · 16:30 · abends"). Für die Bausteine-Liste im Admin.
export function fmtTimesAsSlots(times) {
  return (times || [])
    .map(hm)
    .filter(Boolean)
    .sort()
    .map((t) => {
      const slot = CANONICAL_SLOTS.find((s) => s.time === t);
      return slot ? slot.label.charAt(0).toLowerCase() + slot.label.slice(1) : t;
    })
    .join(" · ");
}
