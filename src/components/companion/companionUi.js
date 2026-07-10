// companionUi.js — gemeinsamer Look & Feel der Patienten-App.
//
// Design-Idiom: helle Teal-Töne der Anamnese (public/anamnese.html), inline
// Style-Objekte + ein kleiner <style>-Tag in der Shell — bewusst KEIN
// Tailwind (Haus-Idiom der Patienten-Formulare). Alles hier ist pur und
// clientsicher: keine Supabase-Imports, kein Server-Code.
//
// Die kleinen Format-Helfer (fmtTimes/fmtWeekdays) sind hier NEU implementiert
// statt aus @/lib/companion importiert — jene Datei zieht den Admin-Supabase-
// Client mit, der in Patienten-Client-Komponenten nichts verloren hat.

export const C = {
  teal: "#43A9AB",
  tealSoft: "#389193",
  tealDeep: "#1f6e70",
  tealPale: "#e6f1f1",
  bg: "#f7fafa",
  text: "#515757",
  textSoft: "#8a9797",
  line: "#dbe8e8",
  card: "#ffffff",
  red: "#b8433a",
  redPale: "#fdf2f1",
};

export const cardStyle = {
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 1px 3px rgba(31, 110, 112, 0.06)",
};

export const primaryBtn = {
  display: "block",
  width: "100%",
  background: C.teal,
  color: "#fff",
  border: "none",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

export const ghostBtn = {
  display: "block",
  width: "100%",
  background: "transparent",
  color: C.tealDeep,
  border: `1.5px solid ${C.line}`,
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  border: `1.5px solid ${C.line}`,
  borderRadius: 12,
  padding: "13px 14px",
  fontSize: 17,
  color: C.text,
  outline: "none",
};

export const sectionTitle = {
  fontSize: 17,
  fontWeight: 700,
  color: C.tealDeep,
  margin: "0 0 10px",
};

// Das Pflicht-Label an jedem Baustein: die App erinnert nur an das, was
// Shukri verordnet hat — sie empfiehlt selbst NIE etwas (kein Medizinprodukt).
// small=true → leisere Variante für dichte Listen (Heute-Timeline): kleiner,
// nur zarter Rahmen statt Pillen-Hintergrund — Label bleibt trotzdem PFLICHT.
export function EmpfehlungBadge({ small = false }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: small ? "transparent" : C.tealPale,
        color: small ? C.tealSoft : C.tealDeep,
        border: small ? `1px solid ${C.tealPale}` : "none",
        borderRadius: 999,
        padding: small ? "1px 7px" : "2px 9px",
        fontSize: small ? 10 : 11,
        fontWeight: small ? 600 : 700,
        whiteSpace: "nowrap",
      }}
    >
      Empfehlung von Shukri
    </span>
  );
}

// Der ständige Fußtext — auf JEDEM Screen sichtbar (auch Login): die App ist
// Erinnerung + Tagebuch, keine Beratung und ausdrücklich kein Notfallkanal.
export function Disclaimer() {
  return (
    <div
      style={{
        textAlign: "center",
        fontSize: 12,
        lineHeight: 1.6,
        color: C.textSoft,
        padding: "18px 20px 6px",
      }}
    >
      Erinnerungs- und Tagebuch-Funktion. Ersetzt keine ärztliche Beratung.
      <br />
      Im Notfall 112 — wir sind kein Notfallkanal.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kleine pure Format-Helfer (Anzeige only)
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = { 1: "Mo", 2: "Di", 3: "Mi", 4: "Do", 5: "Fr", 6: "Sa", 7: "So" };

// [] oder null → "täglich", sonst "Mo, Mi, Fr" (fmtWeekdays-Semantik).
export function fmtWeekdays(days) {
  const list = (days || []).slice().sort((a, b) => a - b);
  if (!list.length) return "täglich";
  return list.map((n) => WEEKDAY_LABELS[n]).filter(Boolean).join(", ");
}

// ["08:00","20:00"] → "08:00 + 20:00 Uhr"
export function fmtTimes(times) {
  const list = (times || []).map((t) => String(t).slice(0, 5)).filter(Boolean);
  return list.length ? `${list.join(" + ")} Uhr` : "";
}

// 'YYYY-MM-DD' → "09.07.2026" — NUR für reine Datums-Spalten (start_date/
// end_date/checkin_date). Für timestamptz-Werte fmtBerlinDate nehmen!
export function fmtDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

// timestamptz (z. B. event_date) → "09.07.2026" in Europe/Berlin. NIE den
// UTC-ISO-String slicen: ein Termin um 00:00–01:59 Berlin liegt in UTC noch
// am Vortag und würde sonst einen Tag zu früh angezeigt.
export function fmtBerlinDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// 'YYYY-MM-DD' → "Mittwoch, 09.07." (nur Anzeige; T12:00 gegen TZ-Kanten)
export function fmtDayLong(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  const weekday = d.toLocaleDateString("de-DE", { weekday: "long" });
  return `${weekday}, ${m[3]}.${m[2]}.`;
}
