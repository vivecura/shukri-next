"use client";

// CompanionCharts — alle wiederverwendbaren SVG-Chart-Bausteine der
// Patienten-App: TrendChart (Tageslinie + 7-Tage-Schnitt), Sparkline,
// DeltaBadge, RingGauge (Treue-Ring), SegmentedControl (Zeitraum-Pille),
// TickerRow (Metrik-Zeile) und MiniBars (14-Tage-Balken je Plan-Baustein).
//
// NUR Präsentation: Daten kommen fertig berechnet als Props (companionStats
// bzw. verlauf-Route). Keine Datenladung, keine Dependencies — alles
// handgerollte SVGs im Haus-Idiom (inline Styles, Farben nur aus C).
//
// Zwei Design-Gesetze, die JEDE Komponente hier einhält:
//
// (1) y-Achsen sind IMMER fix (1-10 bzw. 0-10 über die domain-Prop), NIE
//     auto-skaliert. Auto-Skalierung zoomt in die Restvarianz hinein und
//     dramatisiert normales Tagesrauschen — eine Schwankung von 6 auf 7
//     sähe aus wie ein Absturz/Höhenflug. Die feste Skala zeigt Werte so
//     unaufgeregt, wie sie sind.
//
// (2) Es gibt KEINE Ampelfarben und keine semantische Färbung von Deltas —
//     grün/rot wäre eine Bewertung ("gut"/"schlecht") und damit
//     Medizinprodukt-Nähe (§6). Dazu kommt: Stressbelastung ist invertiert
//     (höher = MEHR Stress) und Symptome sind 0-10 STÄRKE (höher =
//     stärker) — eine Farb-Logik müsste je Feld die Richtung drehen und
//     würde damit erst recht interpretieren. Alles bleibt Teal; Pfeile
//     zeigen nur die numerische Richtung.
//
// Zusätzlich exportiert die Datei die PUREN Rechen-Helfer (rollingAverage,
// buildAxis, adherencePercent, …), damit Shukris spätere Therapie-Statistik
// exakt dieselben Formeln nutzt. Kanonische Heimat der Daten-Statistik ist
// src/lib/companionStats.js — die Formeln hier sind bewusst identisch
// definiert, damit die Chart-Schicht ohne Server-nahe Imports auskommt.

import { useEffect, useId, useState } from "react";
import { C } from "@/components/companion/companionUi";

// ---------------------------------------------------------------------------
// Pure Rechen-Helfer (kein React, kein DOM — auch für Therapie-Statistik)
// ---------------------------------------------------------------------------

// Gleitender 7-Tage-Schnitt: an Index i das Mittel der non-null Werte aus
// dem Fenster [i-window+1 … i]. Weniger als minPoints echte Werte → null
// (ein "Schnitt" aus einem einzigen Tag wäre keiner). null-Werte werden
// AUSGELASSEN, nie als 0 gezählt — ein erfundener Messwert wäre schlimmer
// als eine Lücke. Kein Runden: gerundet wird erst in der Anzeige.
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

// Letzter echter Wert einer Serie → { index, value } oder null (leer).
export function lastNonNull(series) {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const v = series[i];
    if (v !== null && v !== undefined) return { index: i, value: v };
  }
  return null;
}

// Wochen-Delta auf der GEGLÄTTETEN Serie: letzter Trend-Wert minus Trend-Wert
// 7 Positionen davor (= gleicher Wochentag). Fehlt eine Seite → null, nie 0
// erfinden. Vergleich Trend-gegen-Trend statt Tag-gegen-Tag, damit ein
// einzelner Ausreißer das Badge nicht dominiert.
export function deltaWeek(trend) {
  const last = lastNonNull(trend);
  if (!last || last.index < 7) return null;
  const prev = trend[last.index - 7];
  if (prev === null || prev === undefined) return null;
  return last.value - prev;
}

// Treue-Formel: Prozent = round(100 · ist / soll); ohne SOLL (Baustein im
// Zeitraum nie fällig) → null statt 0 oder 100 — "keine Aussage" ist die
// einzig ehrliche Zahl. Das Deckeln von ist auf soll passiert vorher in der
// Aggregation (companionStats.adherence) — Logs vor einer Plan-Änderung
// dürfen nie über 100 % erzeugen.
export function adherencePercent(ist, soll) {
  if (!soll || soll <= 0) return null;
  return Math.round((100 * ist) / soll);
}

// Achsen-Geometrie fürs SVG: bildet Index → x und Wert → y ab, mit FESTER
// domain (Design-Gesetz 1). Liefert zusätzlich die Gridline-Positionen und
// die Grundlinie (für die Fläche unter dem Trend). Pur und exportiert,
// damit spätere Charts (Therapie-Statistik) dieselbe Geometrie teilen.
export function buildAxis({
  n,
  domain = [1, 10],
  width = 320,
  height = 200,
  padLeft = 18,
  padRight = 8,
  padTop = 8,
  padBottom = 14,
}) {
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const [d0, d1] = domain;
  const span = d1 - d0 || 1;
  // n === 1: einzelner Punkt mittig statt Division durch 0.
  const x = (i) => (n > 1 ? padLeft + (i * innerW) / (n - 1) : padLeft + innerW / 2);
  const y = (v) => {
    const t = Math.min(1, Math.max(0, (v - d0) / span));
    return padTop + (1 - t) * innerH;
  };
  return {
    x,
    y,
    innerW,
    innerH,
    padLeft,
    padRight,
    padTop,
    padBottom,
    baseY: padTop + innerH,
    // 3 ruhige Hilfslinien bei 25/50/75 % — bewusst ohne Zahlen daran,
    // beschriftet werden nur min/max der festen Skala.
    gridYs: [0.25, 0.5, 0.75].map((f) => padTop + f * innerH),
  };
}

// Serie → zusammenhängende non-null-Läufe [{ from, to }]. null-Werte sind
// PFAD-BRÜCHE (neues M), NIE interpolieren: eine gezeichnete Linie über
// einen ausgelassenen Tag würde einen Messwert vortäuschen.
function nonNullRuns(series) {
  const runs = [];
  let start = -1;
  for (let i = 0; i <= series.length; i += 1) {
    const has = i < series.length && series[i] !== null && series[i] !== undefined;
    if (has && start === -1) start = i;
    if (!has && start !== -1) {
      runs.push({ from: start, to: i - 1 });
      start = -1;
    }
  }
  return runs;
}

// Läufe → SVG-Pfad (ein <path> mit M-Brüchen reicht; pathLength normalisiert
// über alle Teilpfade, der companion-draw-Trick funktioniert also weiter).
function runsToPath(series, runs, x, y) {
  let d = "";
  for (const r of runs) {
    for (let i = r.from; i <= r.to; i += 1) {
      d += `${i === r.from ? "M" : "L"}${round2(x(i))},${round2(y(series[i]))}`;
    }
  }
  return d;
}

// Läufe → geschlossene Flächen-Pfade bis zur Grundlinie (für den Gradient).
function runsToAreaPath(series, runs, x, y, baseY) {
  let d = "";
  for (const r of runs) {
    d += `M${round2(x(r.from))},${round2(baseY)}`;
    for (let i = r.from; i <= r.to; i += 1) {
      d += `L${round2(x(i))},${round2(y(series[i]))}`;
    }
    d += `L${round2(x(r.to))},${round2(baseY)}Z`;
  }
  return d;
}

const round2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
// Kleine Anzeige-Helfer (nur Formatierung, keine Logik)
// ---------------------------------------------------------------------------

// Zahl → de-DE mit max. 1 Nachkommastelle ("6,3"); null → "—".
export function fmtNum(v) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

// 'YYYY-MM-DD' → "12.7." (kurz, ohne führende Nullen — Achsen-Beschriftung).
function fmtShort(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}.${Number(m[2])}.` : "";
}

// 'YYYY-MM-DD' → "Di" (T12:00 gegen TZ-Kanten — reine Anzeige des
// Kalendertags, nie Geräte-Zeitzone auf Mitternacht loslassen).
function fmtWeekdayShort(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  return d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
}

// ---------------------------------------------------------------------------
// TrendChart — das große Detail-Chart ("Aktien-Chart")
// ---------------------------------------------------------------------------

// days: lückenloses Tages-Array 'YYYY-MM-DD'; values: Tageswerte (null =
// kein Eintrag); trend: 7-Tage-Schnitt (beide aus companionStats, hier wird
// NICHT gerechnet). drawKey erzwingt den Neustart der Einzeichen-Animation
// beim Metrik-/Zeitraum-Wechsel (React-key am Trend-Pfad).
export function TrendChart({
  days,
  values,
  trend,
  domain = [1, 10],
  height = 200,
  ariaLabel,
  drawKey,
}) {
  const gradientId = useId(); // useId statt fester id — mehrere Instanzen auf einer Seite kollidieren sonst im DOM
  const [scrub, setScrub] = useState(null); // Index unterm Finger, null = kein Scrub

  const n = days?.length || 0;
  const width = 320;
  const axis = buildAxis({ n, domain, width, height });

  if (!n) return null; // leeres Fenster fängt der Aufrufer mit Erklärtext ab

  const valueRuns = nonNullRuns(values);
  const trendRuns = nonNullRuns(trend);
  const trendPath = runsToPath(trend, trendRuns, axis.x, axis.y);
  const areaPath = runsToAreaPath(trend, trendRuns, axis.x, axis.y, axis.baseY);
  const valuePath = runsToPath(values, valueRuns, axis.x, axis.y);
  const trendEnd = lastNonNull(trend);

  // x-Beschriftung: erstes + letztes Datum, bei langen Fenstern zusätzlich
  // jeder Monatserste — mehr Labels würden auf 320px nur matschen.
  const xLabels = [{ i: 0, anchor: "start" }, { i: n - 1, anchor: "end" }];
  if (n >= 90) {
    for (let i = 1; i < n - 1; i += 1) {
      if (days[i].endsWith("-01")) xLabels.push({ i, anchor: "middle" });
    }
  }

  // Finger/Maus-Position → nächster Tages-Index. Client-Pixel müssen auf
  // viewBox-Koordinaten skaliert werden (das SVG rendert mit width:100%).
  function idxFromPointer(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const xView = ((e.clientX - rect.left) * width) / rect.width;
    const step = n > 1 ? axis.innerW / (n - 1) : axis.innerW;
    const raw = Math.round((xView - axis.padLeft) / step);
    return Math.min(n - 1, Math.max(0, raw));
  }

  // Tooltip-Inhalt: "Di 8.7. · Wert 6 · Schnitt 6,3" — fehlender Tageswert
  // heißt neutral "kein Eintrag" (keine Bewertung, §6).
  let tip = null;
  if (scrub !== null && scrub >= 0 && scrub < n) {
    const v = values[scrub];
    const t = trend[scrub];
    const parts = [`${fmtWeekdayShort(days[scrub])} ${fmtShort(days[scrub])}`];
    parts.push(v === null || v === undefined ? "kein Eintrag" : `Wert ${fmtNum(v)}`);
    if (t !== null && t !== undefined) parts.push(`Schnitt ${fmtNum(t)}`);
    const text = parts.join(" · ");
    const bw = Math.min(width - 4, text.length * 5.8 + 16);
    const bx = Math.min(width - bw - 2, Math.max(2, axis.x(scrub) - bw / 2));
    tip = { text, bw, bx, lineX: axis.x(scrub) };
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      // pan-y ist PFLICHT: der Scrub greift nur horizontale Gesten ab,
      // vertikales Scrollen der Seite darf nie blockieren (PWA, Mobile).
      style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
      onPointerDown={(e) => setScrub(idxFromPointer(e))}
      onPointerMove={(e) => {
        if (scrub !== null) setScrub(idxFromPointer(e));
      }}
      onPointerUp={() => setScrub(null)}
      onPointerLeave={() => setScrub(null)}
      onPointerCancel={() => setScrub(null)}
    >
      <defs>
        {/* Fläche unter dem Trend: sanfter Teal-Verlauf nach transparent —
            reine Zier, deshalb kein eigener Accessibility-Text. */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.tealPale} stopOpacity="0.9" />
          <stop offset="100%" stopColor={C.tealPale} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ruhige Gridlines bei 25/50/75 % */}
      {axis.gridYs.map((gy) => (
        <line
          key={gy}
          x1={axis.padLeft}
          x2={width - axis.padRight}
          y1={gy}
          y2={gy}
          stroke={C.line}
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      ))}

      {/* y-Beschriftung nur min/max — die Skala ist fix, mehr Zahlen wären Lärm */}
      <text x={axis.padLeft - 4} y={axis.padTop + 4} textAnchor="end" fontSize="10" fill={C.textSoft}>
        {domain[1]}
      </text>
      <text x={axis.padLeft - 4} y={axis.baseY + 3} textAnchor="end" fontSize="10" fill={C.textSoft}>
        {domain[0]}
      </text>

      {/* Fläche unter dem Trend (blendet nur ein, kein Einzeichnen) */}
      {areaPath ? (
        <path key={drawKey !== undefined ? `a-${drawKey}` : undefined} className="companion-fade" d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      ) : null}

      {/* Rausch-Schicht: die echten Tageswerte, bewusst leise (dünn + 35 %) —
          sie zeigen die Schwankung, ohne die Trend-Linie zu übertönen. */}
      {valuePath ? (
        <path d={valuePath} fill="none" stroke={C.teal} strokeWidth="1.5" opacity="0.35" />
      ) : null}

      {/* Trend-Schicht: der 7-Tage-Schnitt als kräftige Linie. pathLength=1
          + companion-draw zeichnet sie beim Mount/Metrik-Wechsel ein, ohne
          getTotalLength() messen zu müssen. */}
      {trendPath ? (
        <path
          key={drawKey !== undefined ? `t-${drawKey}` : undefined}
          className="companion-draw"
          d={trendPath}
          fill="none"
          stroke={C.tealDeep}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
        />
      ) : null}

      {/* End-Punkt des Trends: "hier stehst du" — weißer Ring hebt ihn von
          der Fläche ab. */}
      {trendEnd ? (
        <circle
          cx={axis.x(trendEnd.index)}
          cy={axis.y(trendEnd.value)}
          r="4"
          fill={C.tealDeep}
          stroke="#fff"
          strokeWidth="2"
        />
      ) : null}

      {/* x-Beschriftung */}
      {xLabels.map((l) => (
        <text
          key={l.i}
          x={axis.x(l.i)}
          y={height - 3}
          textAnchor={l.anchor}
          fontSize="10"
          fill={C.textSoft}
        >
          {fmtShort(days[l.i])}
        </text>
      ))}

      {/* Scrub: vertikale Linie + Bubble mit neutralem Wortlaut */}
      {tip ? (
        <g pointerEvents="none">
          <line
            x1={tip.lineX}
            x2={tip.lineX}
            y1={axis.padTop}
            y2={axis.baseY}
            stroke={C.textSoft}
            strokeWidth="1"
            opacity="0.5"
          />
          <rect x={tip.bx} y={2} width={tip.bw} height={18} rx="8" fill={C.tealDeep} />
          <text
            x={tip.bx + tip.bw / 2}
            y={15}
            textAnchor="middle"
            fontSize="11"
            fill="#fff"
            fontWeight="600"
          >
            {tip.text}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

// Legende zum TrendChart — außerhalb des SVG, damit sie umbruchfähig bleibt.
export function TrendLegend() {
  const swatch = (color, width, opacity) => (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 16,
        height: 0,
        borderTop: `${width}px solid ${color}`,
        opacity,
        borderRadius: 2,
        verticalAlign: "middle",
      }}
    />
  );
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        fontSize: 12,
        color: C.textSoft,
        marginTop: 8,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {swatch(C.teal, 2, 0.35)} Tageswerte
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {swatch(C.tealDeep, 3, 1)} 7-Tage-Schnitt
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline — Mini-Trend für die Ticker-Liste
// ---------------------------------------------------------------------------

// points: bereits GEGLÄTTETE Trend-Serie (der Aufrufer schneidet auf max.
// ~30 Punkte zu). Rein dekorativ: aria-hidden, keine Handler — die echte
// Auskunft gibt das Detail-Chart nach dem Tap auf die Zeile.
export function Sparkline({ points, domain = [1, 10], width = 72, height = 28 }) {
  const n = points?.length || 0;
  if (!n) return <span style={{ display: "inline-block", width, height }} aria-hidden />;
  // 3px Innenrand, damit Linie + End-Punkt nicht am viewBox-Rand clippen.
  const axis = buildAxis({
    n,
    domain,
    width,
    height,
    padLeft: 3,
    padRight: 3,
    padTop: 3,
    padBottom: 3,
  });
  const runs = nonNullRuns(points);
  const d = runsToPath(points, runs, axis.x, axis.y);
  const end = lastNonNull(points);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden style={{ display: "block" }}>
      {d ? <path d={d} fill="none" stroke={C.teal} strokeWidth="1.5" strokeLinejoin="round" /> : null}
      {end ? <circle cx={axis.x(end.index)} cy={axis.y(end.value)} r="2.5" fill={C.tealDeep} /> : null}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// DeltaBadge — Richtungs-Pille ohne Wertung
// ---------------------------------------------------------------------------

// Pfeil = NUR numerische Richtung, Farbe IMMER tealDeep (Design-Gesetz 2):
// Stressbelastung ist invertiert (höher = mehr Stress) und Symptome sind
// 0-10 Stärke — grün/rot würde je Feld etwas anderes bedeuten und wäre
// damit medizinische Interpretation. delta null → "—" (kein Vergleichswert).
export function DeltaBadge({ delta, labelBelow, onPale = false }) {
  let inner;
  if (delta === null || delta === undefined) {
    inner = "—";
  } else if (delta === 0) {
    inner = "＝ ±0"; // signDisplay 'always' würde "+0" zeigen — ±0 ist ehrlicher
  } else {
    const glyph = delta > 0 ? "▲" : "▼";
    const num = delta.toLocaleString("de-DE", {
      maximumFractionDigits: 1,
      signDisplay: "always",
    });
    inner = `${glyph} ${num}`;
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span
        style={{
          display: "inline-block",
          borderRadius: 999,
          padding: "3px 8px",
          fontSize: 12,
          fontWeight: 800,
          color: C.tealDeep,
          // Auf der tealPale-Feedback-Karte braucht die Pille weißen Grund,
          // sonst verschwindet sie im gleichen Ton.
          background: onPale ? "#fff" : C.tealPale,
          whiteSpace: "nowrap",
        }}
      >
        {inner}
      </span>
      {labelBelow ? (
        <span style={{ fontSize: 10, color: C.textSoft, textAlign: "center" }}>{labelBelow}</span>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// RingGauge — Treue-Ring (Donut)
// ---------------------------------------------------------------------------

// pathLength=100 auf beiden Kreisen: strokeDashoffset = 100 − Prozent, kein
// Umfang-Rechnen. Die Inline-Transition animiert JEDE Prop-Änderung mit —
// jeder Abhak-Klick im Heute-Tab schiebt den Ring weich weiter. Farbe immer
// C.teal auf C.tealPale — keine Ampel, der Ring zählt nur (Design-Gesetz 2).
export function RingGauge({ percent, size = 64, strokeWidth = 6, children }) {
  // Start-Animation: erster Frame zeichnet Offset 100 (leer), dann setzt ein
  // requestAnimationFrame den Zielwert — die Transition füllt den Ring.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const clamped =
    percent === null || percent === undefined
      ? null
      : Math.min(100, Math.max(0, percent));
  const offset = mounted && clamped !== null ? 100 - clamped : 100;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden style={{ display: "block" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={C.tealPale} strokeWidth={strokeWidth} pathLength={100} />
        {clamped !== null ? (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={C.teal}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${c} ${c})`}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }}
          />
        ) : null}
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {clamped === null ? <span style={{ color: C.textSoft, fontWeight: 700 }}>—</span> : children}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControl — Zeitraum-Umschalter mit gleitender Pille
// ---------------------------------------------------------------------------

// options: [{ id, label }]. Die weiße Pille gleitet per translateX unter die
// aktive Option (nur transform → compositor-billig, 60fps auch auf alten
// Geräten). Container-Höhe 44px = Mindest-Touch-Ziel.
export function SegmentedControl({ options, value, onChange }) {
  const n = options.length || 1;
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        background: C.tealPale,
        borderRadius: 14,
        padding: 3,
        height: 44,
        boxSizing: "border-box",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: 3,
          width: `calc((100% - 6px) / ${n})`,
          background: "#fff",
          borderRadius: 11,
          boxShadow: "0 1px 4px rgba(31, 110, 112, 0.15)",
          transform: `translateX(${idx * 100}%)`,
          transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            style={{
              flex: 1,
              position: "relative",
              zIndex: 1,
              background: "transparent",
              border: "none",
              borderRadius: 11,
              fontSize: 13.5,
              fontWeight: active ? 800 : 600,
              color: active ? C.tealDeep : C.textSoft,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TickerRow — eine Metrik-Zeile der Ticker-Liste
// ---------------------------------------------------------------------------

// Ganzflächiger Button (ganze Zeile = Touch-Ziel ≥52px): links Emoji + Label,
// Mitte Sparkline, rechts aktueller 7-Tage-Schnitt + Vorwochen-Delta.
// muted = keine Werte im Fenster oder Symptom nicht mehr erfasst — die Zeile
// bleibt sichtbar (Vollständigkeit), tritt aber optisch zurück.
export function TickerRow({ emoji, label, spark, current, delta, active, muted, onPress, domain = [1, 10] }) {
  return (
    <button
      type="button"
      onClick={onPress}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        minHeight: 52,
        padding: "6px 8px",
        background: active ? C.tealPale : "transparent",
        border: "none",
        borderRadius: active ? 12 : 0,
        // Trennlinie zwischen Zeilen; bei der aktiven (tealPale) Zeile bleibt
        // sie stehen — auf dem hellen Grund ist sie ohnehin kaum sichtbar.
        borderBottom: `1px solid ${C.line}`,
        opacity: muted ? 0.5 : 1,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          maxWidth: "40%",
          minWidth: 0,
          fontSize: 14,
          fontWeight: 600,
          color: C.text,
        }}
      >
        <span aria-hidden style={{ flexShrink: 0 }}>{emoji}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </span>
      <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {/* domain durchreichen — Symptome (0-10) sonst auf 1-10 verzerrt */}
        <Sparkline points={spark || []} domain={domain} />
      </span>
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.tealDeep }}>
          {muted ? "—" : fmtNum(current)}
        </span>
        {!muted ? <DeltaBadge delta={delta} labelBelow="Vorwoche" /> : null}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// MiniBars — die letzten 14 Tage eines Plan-Bausteins (IST vs. SOLL)
// ---------------------------------------------------------------------------

// days: [{ date, ist, soll }] (fix die letzten 14 Tage bis gestern, kommt
// fertig vom Server). Balkenhöhe = Anteil erfasster Slots am Tag; Tage ohne
// SOLL (Baustein nicht fällig) zeigen einen flachen Strich in C.line —
// "kein Termin" ist etwas anderes als "nicht erfasst".
export function MiniBars({ days, height = 32 }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {(days || []).map((d) => {
        const due = d.soll > 0;
        const ratio = due ? Math.min(d.ist, d.soll) / d.soll : 0;
        const h = due ? Math.max(2, Math.round(ratio * height)) : 2;
        return (
          <div
            key={d.date}
            title={`${fmtShort(d.date)}: ${d.ist} von ${d.soll}`}
            style={{
              width: 8,
              height: h,
              background: due ? C.teal : C.line,
              borderRadius: 2,
              // Ein fälliger Tag ganz ohne Log bleibt als 2px-Sockel in Teal
              // sichtbar — neutral "0 von 2", keine Alarm-Optik.
              opacity: due && d.ist === 0 ? 0.35 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyframes der Chart-Animationen
// ---------------------------------------------------------------------------

// Exportierter <style>-Baustein: die Klassen companion-draw/companion-fade,
// die TrendChart nutzt. Kanonischer Ort aller Companion-Keyframes ist die
// GlobalStyles-Komponente der Shell (CompanionApp.js) — dieser Baustein
// existiert, damit die Charts auch dort funktionieren, wo die Shell (noch)
// nicht rendert (Admin-Statistik, Storybook-artige Tests). Identische
// Keyframe-Namen doppelt zu definieren ist harmlos: gleicher Inhalt, die
// spätere Definition gewinnt. Animations-Budget: nur stroke-dashoffset und
// opacity — compositor-freundlich, 60fps auch auf alten Geräten.
export function CompanionChartsStyles() {
  return (
    <style>{`
      @keyframes companionDraw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
      .companion-draw { stroke-dasharray: 1; animation: companionDraw 0.9s ease-out both; }
      @keyframes companionFade { from { opacity: 0 } to { opacity: 1 } }
      .companion-fade { animation: companionFade 0.5s ease both; }
      @media (prefers-reduced-motion: reduce) {
        .companion-draw, .companion-fade { animation: none !important; }
      }
    `}</style>
  );
}
