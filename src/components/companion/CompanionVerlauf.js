"use client";

// CompanionVerlauf — das "Aktien-Terminal" des Verlaufs-Tabs: EIN großes
// interaktives Detail-Chart (Tageswerte leise, 7-Tage-Schnitt kräftig) plus
// eine Ticker-Liste aller Metriken (sechs feste Skalen + individuelle
// Symptome) und die serverseitig fertig gerechnete Einnahme-Treue mit
// Ring-Anzeige und aufklappbaren 14-Tage-Balken je Baustein.
//
// Arbeitsteilung: die Trend-Serien rechnet der CLIENT aus data.checkins
// (buildDailySeries + rollingAverage — Lücken bleiben Lücken, nie 0, nie
// interpolieren); die Treue kommt FERTIG vom Server (verlauf-Route), damit
// Shukris spätere Therapie-Statistik dieselben Zahlen sieht. Alle neuen
// Response-Felder (range/startDate/treue) sind optional — antwortet ein
// älterer Server ohne sie, rendert der Tab einfach ohne Treue-Karte.
//
// Bewusst REINE Darstellung der eigenen Einträge — keinerlei Bewertungs-
// oder Alarm-Wortwahl (§6, kein Medizinprodukt): die Kurve zeigt, sie
// urteilt nicht. Pfeile der DeltaBadges sind reine Zahlen-Richtung, Farben
// bleiben durchgehend Teal (Design-Gesetze in CompanionCharts.js); die
// einzige Einordnung sind die neutralen Skalen-Anker aus dem Check-in-
// Formular selbst ("1 = entspannt · 10 = Vollgas").

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  C,
  cardStyle,
  sectionTitle,
  CHECKIN_SCALES,
  SYMPTOM_SCALE,
  EmpfehlungBadge,
  fmtDate,
} from "@/components/companion/companionUi";
import { LoadingCard, ErrorCard } from "@/components/companion/CompanionHeute";
import {
  TrendChart,
  TrendLegend,
  DeltaBadge,
  RingGauge,
  SegmentedControl,
  TickerRow,
  MiniBars,
  CompanionChartsStyles,
  rollingAverage,
  lastNonNull,
  deltaWeek,
  fmtNum,
} from "@/components/companion/CompanionCharts";

// Datums-Arithmetik rein auf ISO-Strings (Date.UTC gegen TZ-Kanten) — der
// 'YYYY-MM-DD'-String IST bereits das Berliner Kalenderdatum, UTC-Rechnung
// darauf ist neutral. Formelgleich mit addDaysIso in companionServer.js.
function addDaysIso(iso, n) {
  const [y, m, d] = String(iso).split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Lückenloses Tages-Array [from … to] — die Chart-Achse braucht JEDEN
// Kalendertag, damit Tage ohne Eintrag als echte Lücke sichtbar sind.
function listDatesIso(fromIso, toIso) {
  const out = [];
  for (let d = fromIso; d <= toIso; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

// Heute in Europe/Berlin — NIE Geräte-Zeitzone auf Mitternacht loslassen
// (Muster wie berlinNowHM in CompanionHeute); Fallback lokale Uhr, wenn die
// Intl-TZ-Datenbank fehlt (sehr alte WebViews).
function berlinTodayIso() {
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

const RANGE_OPTIONS = [
  { id: "30", label: "30 Tage" },
  { id: "90", label: "90 Tage" },
  { id: "all", label: "Seit Beginn" },
];
const RANGE_LABEL = { 30: "30 Tage", 90: "90 Tage", all: "seit Beginn" };

// Emojis nur fürs Wiederfinden in Ticker/Detail-Kopf — die Skalen selbst
// bleiben kanonisch in CHECKIN_SCALES (companionUi), hier wird nichts
// dupliziert, nur dekoriert.
const SCALE_EMOJI = {
  feeling: "🙂",
  energy: "⚡",
  sleep: "😴",
  verdauung: "🍽️",
  stress: "🌊",
  klarheit: "🧠",
};
const SYMPTOM_EMOJI = "📍";

export default function CompanionVerlauf({ api }) {
  const [range, setRange] = useState("30");
  const [selectedMetric, setSelectedMetric] = useState("feeling");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [openItemId, setOpenItemId] = useState(null); // nur EIN MiniBars-Panel offen
  const detailRef = useRef(null);
  // Sequenz-Guard gegen stale Antworten: tippt der Patient im Mobilnetz
  // schnell "90 Tage" → "Seit Beginn", darf die LANGSAMERE 90er-Antwort die
  // neuere nicht überschreiben — sonst rechnet model mit range='all' auf
  // einem 97-Tage-Fenster und alles davor sähe aus wie monatelange Lücken.
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (r) => {
      const requestId = ++requestIdRef.current;
      setError("");
      setRefreshing(true);
      try {
        const res = await api(`/verlauf?range=${r}`);
        if (requestId !== requestIdRef.current) return; // stale — verwerfen
        setData(res);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err.message);
      } finally {
        if (requestId === requestIdRef.current) setRefreshing(false);
      }
    },
    [api]
  );

  useEffect(() => {
    load(range);
  }, [load, range]);

  // Ein Render-Zyklus = ein Tag: der Tab wird bei jedem Tab-Wechsel frisch
  // gemountet (Shell), Mitternachts-Drift während offener Ansicht ist egal.
  const today = useMemo(() => berlinTodayIso(), []);

  // Alle Metrik-Serien aus den geladenen Check-ins — mit 7 Vortagen als
  // Anlauf für den gleitenden Schnitt, die danach wieder abgeschnitten
  // werden (der Chart-Rand hat so vom ersten Tag an einen echten Schnitt).
  const model = useMemo(() => {
    if (!data) return null;
    const checkins = data.checkins || [];
    const byDate = new Map(
      checkins.map((c) => [String(c.checkin_date).slice(0, 10), c])
    );
    const earliestLoaded = checkins.length
      ? String(checkins[checkins.length - 1].checkin_date).slice(0, 10)
      : today;
    // startDate ist ein NEUES Feld — ältere Server liefern es nicht,
    // dann trägt der früheste geladene Eintrag die "Seit Beginn"-Achse.
    const startDate = data.startDate || earliestLoaded;

    const chartStart =
      range === "all"
        ? startDate < today
          ? startDate
          : today
        : addDaysIso(today, -(parseInt(range, 10) - 1));
    const leadStart = range === "all" ? chartStart : addDaysIso(chartStart, -7);
    const fullDays = listDatesIso(leadStart, today);
    const days = listDatesIso(chartStart, today);
    const lead = fullDays.length - days.length;

    // buildDailySeries + rollingMean in einem Rutsch: fehlender Check-in
    // ODER null-Feld → null. NIE 0, nie interpolieren — ein erfundener
    // Messwert wäre schlimmer als eine Lücke.
    const buildMetric = ({ id, emoji, label, domain, low, high, getter, forceMuted }) => {
      const fullValues = fullDays.map((d) => {
        const c = byDate.get(d);
        if (!c) return null;
        const v = getter(c);
        return typeof v === "number" ? v : null;
      });
      const fullTrend = rollingAverage(fullValues);
      const values = fullValues.slice(lead);
      const trend = fullTrend.slice(lead);
      const nonNull = values.reduce((n, v) => (v !== null ? n + 1 : n), 0);
      return {
        id,
        emoji,
        label,
        domain,
        low,
        high,
        days,
        values,
        trend,
        nonNull,
        current: lastNonNull(trend)?.value ?? null,
        delta: deltaWeek(trend),
        spark: trend.slice(-30),
        muted: !!forceMuted || nonNull === 0,
      };
    };

    const metrics = CHECKIN_SCALES.map((s) =>
      buildMetric({
        id: s.key,
        emoji: SCALE_EMOJI[s.key] || "•",
        label: s.label,
        domain: [1, 10],
        low: s.low,
        high: s.high,
        getter: (c) => c[s.key],
      })
    );
    for (const sym of data.symptoms || []) {
      const m = buildMetric({
        id: `sym:${sym.id}`,
        emoji: SYMPTOM_EMOJI,
        // Deaktivierte Symptome bleiben beschriftet (alte Werte stecken
        // noch in symptom_scores), treten aber optisch zurück.
        label: sym.active ? sym.name : `${sym.name} (nicht mehr erfasst)`,
        domain: [SYMPTOM_SCALE.min, SYMPTOM_SCALE.max],
        low: SYMPTOM_SCALE.low,
        high: SYMPTOM_SCALE.high,
        getter: (c) => (c.symptom_scores || {})[sym.id],
        forceMuted: !sym.active,
      });
      if (sym.active || m.nonNull > 0) metrics.push(m);
    }

    const entryCount = checkins.length;
    const daysSinceStart =
      Math.round(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
          86400000
      ) + 1;
    return { metrics, startDate, entryCount, daysSinceStart };
  }, [data, range, today]);

  // Erste Ladung: klassisches Lade-Idiom. Bei Range-Wechseln bleibt die
  // Ansicht stehen (nur gedimmt + Puls) — kein Layout-Sprung.
  if (!data) {
    if (error) return <ErrorCard text={error} onRetry={() => load(range)} />;
    return <LoadingCard />;
  }

  const metrics = model?.metrics || [];
  const selected =
    metrics.find((m) => m.id === selectedMetric) || metrics[0] || null;
  const treue = data.treue || null;
  const streakByItem = new Map(
    (data.serien || []).map((s) => [s.itemId, s.streak])
  );

  const onPressMetric = (id) => {
    setSelectedMetric(id);
    // nearest statt start: nur scrollen, wenn die Detail-Karte nicht schon
    // im Blick ist — kein Springen bei Taps weiter unten in der Liste.
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    );
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Keyframes companion-draw/companion-fade: kanonisch in GlobalStyles
          der Shell — dieser Baustein stellt sie sicher, solange die Shell
          sie (noch) nicht mitbringt. Doppelt definieren ist harmlos. */}
      <CompanionChartsStyles />

      {/* 1) Kopf + Zeitraum — sticky, damit der Umschalter beim Scrollen
          durch Ticker und Treue erreichbar bleibt (zIndex 10 < Tab-Bar 50). */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: C.bg,
          padding: "8px 0",
        }}
      >
        <h2 style={{ ...sectionTitle, margin: "0 0 8px", fontSize: 19 }}>
          Dein Verlauf
        </h2>
        <SegmentedControl
          options={RANGE_OPTIONS}
          value={range}
          onChange={(id) => setRange(id)}
        />
      </div>

      <div
        className={refreshing ? "companion-pulse" : undefined}
        style={{ display: "grid", gap: 12, opacity: refreshing ? 0.6 : 1 }}
      >
        <p
          style={{
            fontSize: 12.5,
            color: C.textSoft,
            margin: "0 2px",
            lineHeight: 1.5,
          }}
        >
          Einzelne Tage schwanken — die kräftige Linie zeigt deinen
          7-Tage-Schnitt.
          {range === "all" && model ? (
            <>
              {" "}
              Seit deinem Start am {fmtDate(model.startDate)}:{" "}
              {model.entryCount}{" "}
              {model.entryCount === 1 ? "Eintrag" : "Einträge"} in{" "}
              {model.daysSinceStart}{" "}
              {model.daysSinceStart === 1 ? "Tag" : "Tagen"}.
            </>
          ) : null}
        </p>

        {/* Fehler beim Nachladen (Range-Wechsel): alte Ansicht bleibt stehen,
            der Hinweis ersetzt sie nicht. */}
        {error ? (
          <ErrorCard text={error} onRetry={() => load(range)} />
        ) : null}

        {/* 2) Detail-Chart — das eine große "Aktien-Chart" */}
        {selected ? (
          <div ref={detailRef} style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    ...sectionTitle,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selected.emoji} {selected.label}
                </h3>
                {/* Neutrale Skalen-Anker aus dem Check-in-Formular — reine
                    Leserichtung, keine Bewertung (Stress: höher = mehr). */}
                <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 2 }}>
                  {selected.domain[0]} = {selected.low} · {selected.domain[1]} ={" "}
                  {selected.high}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{ fontSize: 22, fontWeight: 800, color: C.tealDeep }}
                >
                  {fmtNum(selected.current)}
                </span>
                <DeltaBadge delta={selected.delta} labelBelow="Vorwoche" />
              </div>
            </div>
            {selected.nonNull < 2 ? (
              <div
                style={{
                  fontSize: 13.5,
                  color: C.textSoft,
                  padding: "24px 0",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Noch zu wenige Einträge für eine Kurve — jeder Check-in füllt
                sie weiter.
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <TrendChart
                  days={selected.days}
                  values={selected.values}
                  trend={selected.trend}
                  domain={selected.domain}
                  height={200}
                  ariaLabel={`Verlauf ${selected.label}: Tageswerte und 7-Tage-Schnitt`}
                  // Neustart der Einzeichen-Animation bei Metrik-/Range-Wechsel
                  drawKey={`${selected.id}-${range}`}
                />
                <TrendLegend />
              </div>
            )}
          </div>
        ) : null}

        {/* 3) Ticker-Liste: alle Metriken, Tap wählt das Detail-Chart */}
        <div style={{ ...cardStyle, padding: "4px 8px" }}>
          {metrics.map((m) => (
            <TickerRow
              key={m.id}
              emoji={m.emoji}
              label={m.label}
              spark={m.spark}
              current={m.current}
              delta={m.delta}
              domain={m.domain}
              active={selected ? m.id === selected.id : false}
              muted={m.muted}
              onPress={() => onPressMetric(m.id)}
            />
          ))}
        </div>

        {/* 4) Einnahme-Treue — nur wenn der Server das neue Feld liefert */}
        {treue ? (
          <div style={cardStyle}>
            <h3 style={{ ...sectionTitle, margin: 0 }}>Dein Plan im Blick</h3>
            <div style={{ fontSize: 12, color: C.textSoft, margin: "2px 0 12px" }}>
              Zeitraum: {RANGE_LABEL[range] || range}, bis gestern
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <RingGauge percent={treue.gesamt?.prozent ?? null} size={96} strokeWidth={10}>
                <span style={{ fontSize: 24, fontWeight: 800, color: C.tealDeep }}>
                  {treue.gesamt?.prozent != null ? `${treue.gesamt.prozent} %` : ""}
                </span>
              </RingGauge>
              <div style={{ fontSize: 13.5, color: C.text, textAlign: "center" }}>
                {treue.gesamt?.soll > 0 ? (
                  <>
                    {treue.gesamt.ist} von {treue.gesamt.soll} Einnahmen und
                    Aufgaben erfasst
                  </>
                ) : (
                  <>Im Zeitraum waren keine Einnahmen oder Aufgaben fällig.</>
                )}
              </div>
            </div>

            {(treue.proItem || []).map((item) => {
              const open = openItemId === item.itemId;
              const streak = streakByItem.get(item.itemId) || 0;
              return (
                <div key={item.itemId} style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 2 }}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setOpenItemId((prev) => (prev === item.itemId ? null : item.itemId))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      minHeight: 56,
                      padding: "8px 0",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {/* Ring immer Teal auf TealPale — der Ring zählt nur,
                        er bewertet nicht (Design-Gesetz 2). */}
                    <RingGauge percent={item.prozent} size={44} strokeWidth={5} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: C.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.name}
                        </span>
                        <EmpfehlungBadge small />
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: C.textSoft,
                          marginTop: 2,
                        }}
                      >
                        {item.ist} von {item.soll} erfasst
                        {streak >= 2 ? ` · 🔥 ${streak} Tage in Folge` : ""}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: C.tealDeep,
                        flexShrink: 0,
                      }}
                    >
                      {item.prozent != null ? `${item.prozent} %` : "—"}
                    </span>
                  </button>
                  {/* CSS-Klappe über grid-template-rows — die einzige
                      Layout-Transition im Animations-Budget. */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: open ? "1fr" : "0fr",
                      transition:
                        "grid-template-rows 0.35s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    <div style={{ overflow: "hidden", minHeight: 0 }}>
                      <div style={{ padding: "2px 0 10px 56px" }}>
                        <MiniBars days={item.letzte14 || []} />
                        <div style={{ fontSize: 11, color: C.textSoft, marginTop: 4 }}>
                          Die letzten 14 Tage, bis gestern
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <p
              style={{
                fontSize: 11.5,
                color: C.textSoft,
                margin: "12px 0 0",
                lineHeight: 1.5,
              }}
            >
              Gezählt ab dem Tag, an dem der Baustein in deinen Plan
              aufgenommen wurde. Plan-Änderungen wirken auf die Zählung.
            </p>
          </div>
        ) : null}

        {/* 5) Check-in-Streak — bestehende Daten, nur neue Optik */}
        <div
          style={{
            ...cardStyle,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 700,
            color: C.tealDeep,
            textAlign: "center",
          }}
        >
          {data.checkinStreak > 0 ? (
            <>
              📖 {data.checkinStreak}{" "}
              {data.checkinStreak === 1 ? "Tag" : "Tage"} in Folge eingetragen
            </>
          ) : (
            <>📖 Dein nächster Eintrag startet eine neue Serie.</>
          )}
        </div>
      </div>
    </div>
  );
}
