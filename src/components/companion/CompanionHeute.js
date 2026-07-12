"use client";

// CompanionHeute — der Heute-Tab als Tages-Timeline: alle heutigen Baustein-
// Vorkommen werden nach Uhrzeit in Tagesabschnitte gruppiert (☀️ Morgens bis
// 10:59 · 🌞 Mittags 11–14:59 · 🌤 Nachmittags 15–16:59 · 🌙 Abends 17–20:59 ·
// 🛌 Vor dem Schlafen ab 21:00 · 📌 Jederzeit heute ohne Uhrzeit) und an einer
// schlanken Zeitleiste abgehakt. Die Abschnitte und ihre Grenzen kommen aus
// den kanonischen Tageszeit-Slots (@/lib/daySlots via companionUi) — dieselbe
// Quelle, aus der der Admin-Editor seine Slot-Chips (1-0-1-Schema) speist.
// Ein Item mit 08:00 + 20:00 erscheint morgens UND abends — jedes Vorkommen
// hakt seinen eigenen Slot ab (toggle-item mit due_time, Optimistic UI mit
// Rollback + Teal-Pop wie gehabt).
//
// Aufklapp-Logik: der Abschnitt zur aktuellen Berlin-Uhrzeit ist offen,
// frühere Abschnitte mit offenen Punkten ebenfalls (nichts Offenes bleibt
// versteckt); alles andere ist eingeklappt, aber als Kopfzeile mit
// Fortschritt + Ein-Zeilen-Zusammenfassung scanbar.
//
// Optik seit dem Verlauf-Ausbau: oben ein freistehender Hero (Begrüßung nach
// Berlin-Uhrzeit + Tages-Ring statt Balken), der aktuelle Berlin-Abschnitt
// ist dezent als "Bühne" hervorgehoben (heller Teal-Ring, atmender Rail-
// Punkt), Auf-/Zuklappen und Abhaken laufen als weiche CSS-Übergänge.
// Animations-Budget-Regel: nur transform, opacity und stroke-dashoffset
// animieren (compositor-freundlich, 60fps auch auf alten Geräten) — die
// grid-rows-Klappe ist die einzige bewusste Layout-Transition. Die Klassen
// companion-rise / companion-breath / companion-checkdraw kommen aus
// GlobalStyles in der Shell (inkl. prefers-reduced-motion-Guard); fehlen sie,
// rendert alles einfach ohne Animation — nichts bricht.
//
// Der 🆘-Knopf ist ruhig, aber präsent gestaltet (outlined, kein Alarm-Rot-
// Geschrei): die App ist KEIN Notfallkanal — das Sheet und die Bestätigung
// sagen beide klar "Im Notfall 112".

import { useCallback, useEffect, useRef, useState } from "react";
import {
  C,
  cardStyle,
  ghostBtn,
  primaryBtn,
  sectionTitle,
  EmpfehlungBadge,
  fmtDayLong,
  DAY_SLOTS,
  slotForTime,
} from "@/components/companion/companionUi";
import { RingGauge } from "@/components/companion/CompanionCharts";
import CompanionCheckin from "@/components/companion/CompanionCheckin";
import CompanionContact from "@/components/companion/CompanionContact";
import CompanionPush from "@/components/companion/CompanionPush";

const KIND_EMOJI = { supplement: "💊", todo: "✅", vorbereitung: "📋" };
const slotKey = (itemId, time) => `${itemId}|${time ?? ""}`;

// Tagesabschnitte der Timeline (Reihenfolge = Tagesverlauf, 📌 zuletzt):
// die kanonischen Tageszeit-Slots mit ihrem Patienten-Label ("Vor dem
// Schlafen" statt ärztlichem "Zur Nacht") + der Jederzeit-Sammler. Leere
// Abschnitte fliegen in buildTimeline raus (🌤 Nachmittags erscheint also
// nur, wenn dort wirklich etwas liegt).
const SLOT_DEFS = [
  ...DAY_SLOTS.map((s) => ({ id: s.key, emoji: s.emoji, label: s.patientLabel })),
  { id: "jederzeit", emoji: "📌", label: "Jederzeit heute" },
];
const TIME_SLOT_IDS = DAY_SLOTS.map((s) => s.key);

// "HH:MM" | null → Abschnitts-Id über die geteilten Slot-Grenzen
// (@/lib/daySlots); ohne/mit unlesbarer Uhrzeit → jederzeit.
function slotIdForTime(time) {
  return slotForTime(time)?.key || "jederzeit";
}

// Aktuelle Uhrzeit in Europe/Berlin als "HH:MM" (Gerätezeit kann anders
// ticken — Reisende, falsche Systemzeit; Fallback: lokale Zeit).
function berlinNowHM() {
  try {
    const s = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
    const m = s.match(/(\d{1,2})\D(\d{2})/);
    if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  } catch {
    // Intl-Ausfall → Fallback unten
  }
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Begrüßung nach Berlin-Uhrzeit — der Shell-Header sagt schon "Hallo
// {Vorname}", hier deshalb bewusst OHNE Namen (keine Dopplung).
function greetingForHM(hm) {
  const h = parseInt(hm.slice(0, 2), 10);
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Guten Tag";
  return "Guten Abend";
}

// Items (mit slots[]) → gefüllte Timeline-Abschnitte. Ein Item taucht in
// JEDEM Abschnitt auf, in dem es eine Uhrzeit hat; leere Abschnitte fliegen
// raus. Innerhalb eines Abschnitts nach Uhrzeit sortiert (stabil → bei
// gleicher Zeit bleibt die Server-Sortierung erhalten).
function buildTimeline(items) {
  const buckets = SLOT_DEFS.map((def) => ({ ...def, entries: [] }));
  for (const item of items) {
    for (const slot of item.slots) {
      const bucket = buckets.find((b) => b.id === slotIdForTime(slot.time));
      bucket.entries.push({ item, slot });
    }
  }
  for (const b of buckets) {
    b.entries.sort((a, z) =>
      (a.slot.time || "").localeCompare(z.slot.time || "")
    );
  }
  return buckets.filter((b) => b.entries.length > 0);
}

// Anfangszustand der Aufklappung: aktueller Berlin-Abschnitt offen, frühere
// Abschnitte mit offenen Punkten offen, "Jederzeit" offen solange dort etwas
// unerledigt ist, Rest zu.
function initialExpanded(items) {
  const buckets = buildTimeline(items);
  const nowIdx = TIME_SLOT_IDS.indexOf(slotIdForTime(berlinNowHM()));
  const expanded = {};
  for (const b of buckets) {
    const hasOpen = b.entries.some((e) => !e.slot.done);
    if (b.id === "jederzeit") {
      expanded[b.id] = hasOpen;
    } else {
      const idx = TIME_SLOT_IDS.indexOf(b.id);
      expanded[b.id] = idx === nowIdx || (idx < nowIdx && hasOpen);
    }
  }
  return expanded;
}

// onGoVerlauf ist optional: die Shell reicht ihren Tab-Wechsel durch, damit
// die Feedback-Karte des Check-ins in den Verlauf springen kann.
export default function CompanionHeute({ api, onGoVerlauf }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState([]);
  const [checkin, setCheckin] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [hasReminderItems, setHasReminderItems] = useState(false);
  const [expanded, setExpanded] = useState(null); // {abschnittId: bool} | null
  const [toast, setToast] = useState("");
  const [popping, setPopping] = useState(null); // slotKey mit laufender Pop-Animation
  const [helpOpen, setHelpOpen] = useState(false);
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api("/today");
      setDate(data.date);
      setItems(data.items || []);
      setCheckin(data.checkin);
      setSymptoms(data.symptoms || []);
      setHasReminderItems(!!data.hasReminderItems);
      // Aufklappung nur beim ersten erfolgreichen Laden setzen — manuelles
      // Auf-/Zuklappen des Patienten nicht überschreiben.
      setExpanded((prev) => prev ?? initialExpanded(data.items || []));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }

  function patchSlot(itemId, time, patch) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              slots: it.slots.map((s) =>
                (s.time ?? null) === (time ?? null) ? { ...s, ...patch } : s
              ),
            }
          : it
      )
    );
  }

  async function toggle(item, slot) {
    const next = !slot.done;
    // Optimistisch abhaken — bei Fehler unten zurückrollen.
    patchSlot(item.id, slot.time, { done: next });
    if (next) {
      setPopping(slotKey(item.id, slot.time));
      setTimeout(() => setPopping(null), 400);
    }
    try {
      const res = await api("/toggle-item", {
        method: "POST",
        body: { itemId: item.id, time: slot.time, done: next },
      });
      // Reconciliation mit dem Serverstand (Doppel-Tipp, Races).
      patchSlot(item.id, slot.time, res.slot);
    } catch (err) {
      patchSlot(item.id, slot.time, { done: !next });
      showToast(err.message);
    }
  }

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard text={error} onRetry={load} />;

  const timeline = buildTimeline(items);
  const totalSlots = items.reduce((n, it) => n + it.slots.length, 0);
  const doneSlots = items.reduce(
    (n, it) => n + it.slots.filter((s) => s.done).length,
    0
  );
  const allDone = totalSlots > 0 && doneSlots === totalSlots;

  // Aktuelle Berlin-Uhrzeit einmal pro Render: steuert Begrüßung, die
  // "Bühne" (hervorgehobener aktueller Abschnitt) und den Abend-/Tag-Text.
  const nowHM = berlinNowHM();
  const currentSlotId = slotIdForTime(nowHM);
  const isEvening = parseInt(nowHM.slice(0, 2), 10) >= 17;

  // Gestaffelter Einstieg (companion-rise): Hero zuerst, dann jeder
  // Timeline-Abschnitt, zuletzt die Check-in-Karte — nur an den Mount
  // gekoppelt (Tabs remounten ohnehin komplett, kein State nötig).
  const riseDelay = (i) => ({ animationDelay: `${i * 80}ms` });
  const checkinRiseIdx = 1 + timeline.length;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Hero: Begrüßung + Datum links, Tages-Ring rechts — freistehend auf
          dem Body-Gradient (bewusst KEINE Card). Der Ring übernimmt die
          progressbar-Semantik des alten Balkens; jeder Abhak-Klick schiebt
          ihn per stroke-dashoffset-Transition weich weiter. */}
      <div
        className="companion-rise"
        style={{
          ...riseDelay(0),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 4px 20px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: C.tealDeep,
              lineHeight: 1.25,
            }}
          >
            {greetingForHM(nowHM)}
          </h2>
          <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>
            {fmtDayLong(date)}
          </div>
        </div>
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalSlots}
          aria-valuenow={doneSlots}
          aria-label={`${doneSlots} von ${totalSlots} erledigt`}
          style={{ flexShrink: 0 }}
        >
          <RingGauge
            percent={totalSlots > 0 ? (100 * doneSlots) / totalSlots : null}
            size={72}
            strokeWidth={7}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: C.tealDeep,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {doneSlots}/{totalSlots}
            </span>
          </RingGauge>
        </span>
      </div>

      {/* Tages-Timeline */}
      {items.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", color: C.textSoft, fontSize: 14 }}>
          Für heute steht nichts auf deiner Liste.
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: "8px 14px 8px 10px" }}>
          {timeline.map((bucket, idx) => (
            <SlotSection
              key={bucket.id}
              bucket={bucket}
              isLast={idx === timeline.length - 1}
              isCurrent={bucket.id === currentSlotId}
              riseStyle={riseDelay(1 + idx)}
              expanded={!!expanded?.[bucket.id]}
              onToggleExpand={() =>
                setExpanded((prev) => ({
                  ...(prev || {}),
                  [bucket.id]: !prev?.[bucket.id],
                }))
              }
              popping={popping}
              onToggleSlot={toggle}
            />
          ))}
        </div>
      )}

      {allDone && (
        <div
          style={{
            textAlign: "center",
            fontSize: 14,
            fontWeight: 700,
            color: C.tealDeep,
            padding: "2px 0",
          }}
        >
          {isEvening
            ? "Alles für heute abgehakt. Schönen Abend dir!"
            : "Alles für heute abgehakt. Schönen Tag dir!"}
        </div>
      )}

      {/* Check-in-Karte — mit zarter Teal-Akzentkante links */}
      <div
        className="companion-rise"
        style={{
          ...cardStyle,
          ...riseDelay(checkinRiseIdx),
          borderLeft: `3px solid ${C.teal}`,
        }}
      >
        <h3 style={sectionTitle}>Wie geht es dir heute?</h3>
        <CompanionCheckin
          api={api}
          initial={checkin}
          symptoms={symptoms}
          onSaved={setCheckin}
          onGoVerlauf={onGoVerlauf}
        />
      </div>

      {/* Erinnerungs-Karte (Web-Push) — erscheint nur, wenn es laut /today
          etwas zu erinnern gibt (hasReminderItems) und Push möglich ist. */}
      <CompanionPush api={api} hasReminderItems={hasReminderItems} />

      {/* Hilfe-Knopf — ruhig, aber gut sichtbar: als schmale Fußzeilen-Karte,
          Mechanik (HelpSheet, help_flag) unverändert */}
      {checkin?.help_flag ? (
        <div
          style={{
            ...cardStyle,
            background: C.tealPale,
            border: `1px solid ${C.teal}55`,
            textAlign: "center",
            fontSize: 14,
            color: C.tealDeep,
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          🆘 Deine Rückruf-Bitte ist angekommen. Wir melden uns bei dir.
          <br />
          Im Notfall 112.
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 10 }}>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            style={{
              ...ghostBtn,
              border: `1.5px solid ${C.red}66`,
              color: C.red,
              fontWeight: 700,
              minHeight: 44,
            }}
          >
            🆘 Ich brauche Hilfe / Rückruf
          </button>
        </div>
      )}

      {/* Kontakt zur Praxis — immer sichtbar am Ende des Heute-Tabs */}
      <CompanionContact />

      {helpOpen && (
        <HelpSheet
          api={api}
          onClose={() => setHelpOpen(false)}
          onSent={() =>
            setCheckin((c) => ({ ...(c || {}), help_flag: true }))
          }
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            background: C.tealDeep,
            color: "#fff",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 14,
            maxWidth: "88vw",
            zIndex: 60,
            boxShadow: "0 4px 14px rgba(31,110,112,0.3)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline-Bausteine
// ---------------------------------------------------------------------------

// Ein Tagesabschnitt: Schiene links (Punkt + Linie), rechts die tappbare
// Kopfzeile (Emoji + Name + x/y ✓ + Zusammenfassung) und — aufgeklappt —
// die abhakbaren Zeilen. Der Abschnitt zur aktuellen Berlin-Uhrzeit ist die
// "Bühne": heller Teal-Ring + sanfter Verlauf + atmender Rail-Punkt — reine
// Hervorhebung, keine Bewertung. Auf-/Zuklappen läuft als grid-rows-Klappe
// (die Zeilen bleiben gemountet; visibility nimmt sie eingeklappt aus der
// Tab-Reihenfolge, damit versteckte Buttons nicht fokussierbar sind).
function SlotSection({
  bucket,
  isLast,
  isCurrent,
  riseStyle,
  expanded,
  onToggleExpand,
  popping,
  onToggleSlot,
}) {
  const done = bucket.entries.filter((e) => e.slot.done).length;
  const total = bucket.entries.length;
  const complete = total > 0 && done === total;
  const summary = bucket.entries
    .map((e) => `${KIND_EMOJI[e.item.kind] || "•"} ${e.item.name}`)
    .join(" · ");

  return (
    <div
      className="companion-rise"
      style={{
        ...riseStyle,
        display: "flex",
        // Bühne für den aktuellen Abschnitt: dezenter Ring in tealPale +
        // Verlauf, der unten sanft ins Teal ausläuft — bewusst KEIN Alarm.
        // Eingeklappte, nicht-aktuelle Abschnitte treten leicht zurück.
        ...(isCurrent
          ? {
              boxShadow: `0 0 0 3px ${C.tealPale}`,
              background: `linear-gradient(180deg, #fff 60%, ${C.tealPale} 160%)`,
              borderRadius: 12,
              padding: "0 8px 0 2px",
              margin: "0 -8px 0 -2px",
            }
          : !expanded
            ? { opacity: 0.88 }
            : null),
      }}
    >
      {/* Zeitleisten-Schiene: Punkt auf Höhe der Kopfzeile + Verbindungslinie */}
      <div
        style={{
          width: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          paddingTop: 17,
        }}
      >
        <span
          aria-hidden="true"
          className={isCurrent ? "companion-breath" : undefined}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            flexShrink: 0,
            boxSizing: "border-box",
            background: complete ? C.teal : "#fff",
            border: `2px solid ${complete ? C.teal : C.line}`,
            // Kleine Choreografie: der Punkt füllt sich erst NACH dem Pop
            // der letzten Zeile (0.15s Verzögerung).
            transition: "background 0.4s ease 0.15s, border-color 0.4s ease 0.15s",
          }}
        />
        {!isLast && (
          <span
            aria-hidden="true"
            style={{ width: 2, flex: 1, background: C.tealPale, marginTop: 3 }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, padding: "4px 0 12px" }}>
        {/* Kopfzeile — komplette Fläche klappt auf/zu */}
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          style={{
            display: "block",
            width: "100%",
            background: "none",
            border: "none",
            padding: "8px 0 0",
            margin: 0,
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "inherit",
            color: "inherit",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{bucket.emoji}</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: C.tealDeep,
                whiteSpace: "nowrap",
              }}
            >
              {bucket.label}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12.5,
                fontWeight: 800,
                color: complete ? C.teal : C.textSoft,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {done}/{total} ✓
            </span>
            <span
              aria-hidden="true"
              style={{
                fontSize: 10,
                color: C.textSoft,
                flexShrink: 0,
                transform: expanded ? "rotate(90deg)" : "none",
                transition: "transform 0.3s ease",
              }}
            >
              ▶
            </span>
          </span>
          {!expanded && (
            <span
              style={{
                display: "block",
                marginTop: 3,
                fontSize: 12.5,
                color: C.textSoft,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {summary}
            </span>
          )}
        </button>

        {/* Weiche Klappe: grid-template-rows 0fr↔1fr ist die einzige bewusste
            Layout-Transition der App. visibility flippt am Übergangs-Ende und
            hält eingeklappte Zeilen aus Fokus/Screenreader heraus. */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: expanded ? "1fr" : "0fr",
            transition: "grid-template-rows 0.35s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            style={{
              overflow: "hidden",
              minHeight: 0,
              visibility: expanded ? "visible" : "hidden",
              transition: "visibility 0.35s",
            }}
            aria-hidden={!expanded}
          >
            <div style={{ marginTop: 8 }}>
              {bucket.entries.map(({ item, slot }) => (
                <TimelineRow
                  key={slotKey(item.id, slot.time)}
                  item={item}
                  slot={slot}
                  popping={popping === slotKey(item.id, slot.time)}
                  onToggle={() => onToggleSlot(item, slot)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Eine abhakbare Zeile: die GANZE Zeile ist der Tap-Target — großer runder
// Haken links, Name + Dosis/Hinweis, Uhrzeit klein rechts. Erledigt →
// durchgestrichen + ausgeblendet (Opacity). Das Abhaken ist ein kleiner
// Moment: Teal-Pop (companion-pop), das ✓ zeichnet sich als SVG-Pfad ein
// (companion-checkdraw, pathLength=1 — kein getTotalLength-Messen nötig),
// Kreis-Füllung und Durchstreichen gleiten als weiche Transitions nach.
function TimelineRow({ item, slot, popping, onToggle }) {
  const done = slot.done;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? `${item.name} wieder öffnen` : `${item.name} abhaken`}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 11,
        background: "none",
        border: "none",
        borderTop: `1px solid ${C.tealPale}`,
        padding: "11px 0",
        margin: 0,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        color: "inherit",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span
        aria-hidden="true"
        className={popping ? "companion-pop" : undefined}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          flexShrink: 0,
          boxSizing: "border-box",
          border: `2px solid ${done ? C.teal : C.line}`,
          background: done ? C.teal : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        {done && (
          <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true" style={{ display: "block" }}>
            <path
              d="M3.4 8.6 L6.7 11.6 L12.6 4.9"
              fill="none"
              stroke="#fff"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="companion-checkdraw"
            />
          </svg>
        )}
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          opacity: done ? 0.5 : 1,
          transition: "opacity 0.35s ease",
        }}
      >
        <span
          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>
            {KIND_EMOJI[item.kind] || "•"}
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {item.name}
          </span>
          <EmpfehlungBadge small />
        </span>
        {(item.dosis || item.instructions) && (
          <span
            style={{
              display: "block",
              fontSize: 12.5,
              color: C.textSoft,
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {[item.dosis, item.instructions].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>

      {slot.time && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.textSoft,
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {slot.time}
        </span>
      )}
    </button>
  );
}

// Bestätigungs-Bottom-Sheet des Hilfe-Knopfs. Zustände: idle → sending → done.
function HelpSheet({ api, onClose, onSent }) {
  const [note, setNote] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done
  const [error, setError] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      await api("/help", { method: "POST", body: { note: note.trim() } });
      onSent?.();
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && state !== "sending") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31, 110, 112, 0.35)",
        zIndex: 70,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 480,
          padding: "22px 20px calc(20px + env(safe-area-inset-bottom))",
          boxShadow: "0 -6px 24px rgba(31,110,112,0.25)",
        }}
      >
        {state === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
            <h3 style={{ ...sectionTitle, fontSize: 19 }}>
              Wir melden uns bei dir.
            </h3>
            <p style={{ fontSize: 15, color: C.text, margin: "0 0 18px", lineHeight: 1.5 }}>
              Deine Nachricht ist in der Praxis angekommen.
              <br />
              <strong>Im Notfall 112.</strong>
            </p>
            <button type="button" style={primaryBtn} onClick={onClose}>
              Alles klar
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ ...sectionTitle, fontSize: 19 }}>
              Sollen wir dich zurückrufen?
            </h3>
            <p style={{ fontSize: 14, color: C.text, margin: "0 0 12px", lineHeight: 1.55 }}>
              Shukri und das Praxis-Team bekommen deine Nachricht und melden
              sich bei dir. Die App ist kein Notfallkanal —{" "}
              <strong>im Notfall wähle bitte sofort 112</strong>.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              placeholder="Was ist los? (optional)"
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1.5px solid ${C.line}`,
                borderRadius: 12,
                padding: "11px 12px",
                fontSize: 15,
                color: C.text,
                resize: "vertical",
                fontFamily: "inherit",
                outline: "none",
                marginBottom: 12,
              }}
            />
            {error && (
              <div
                style={{
                  background: C.redPale,
                  color: C.red,
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={send}
              disabled={state === "sending"}
              style={{
                ...primaryBtn,
                background: C.red,
                opacity: state === "sending" ? 0.6 : 1,
              }}
            >
              {state === "sending" ? "Wird gesendet …" : "Ja, bitte meldet euch"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={state === "sending"}
              style={{ ...ghostBtn, marginTop: 10 }}
            >
              Abbrechen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lade-/Fehlerkarten (auch von den anderen Tabs importiert)
// ---------------------------------------------------------------------------

export function LoadingCard() {
  return (
    <div
      style={{ ...cardStyle, textAlign: "center", color: C.textSoft, fontSize: 14 }}
      className="companion-pulse"
    >
      Lädt …
    </div>
  );
}

export function ErrorCard({ text, onRetry }) {
  return (
    <div style={{ ...cardStyle, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: C.text, margin: "0 0 12px" }}>{text}</p>
      {onRetry && (
        <button type="button" style={ghostBtn} onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
