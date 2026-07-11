"use client";

// CompanionVerlauf — Verlauf + Serien: handgerollte SVG-Sparklines (keine
// Chart-Lib) über die letzten 30 Tages-Check-ins — die sechs festen Skalen
// (CHECKIN_SCALES, eine Quelle mit dem Formular) plus je eine Kurve pro
// individuellem Symptom mit Daten im Fenster (0-10 STÄRKE, höher = stärker;
// deaktivierte Symptome bleiben über die Server-Liste beschriftet). Dazu
// "🔥 X Tage in Folge"-Chips je Gewohnheits-Baustein und fürs Tagebuch.
//
// Bewusst REINE Darstellung der eigenen Einträge — keinerlei Bewertungs- oder
// Alarm-Wortwahl (§6, kein Medizinprodukt): die Kurve zeigt, sie urteilt
// nicht. Einzige Einordnung ist die neutrale Richtungs-Erklärung bei
// Stressbelastung ("niedriger ist besser") und der Symptom-Skala — ohne sie
// würde eine fallende Stress-Kurve wie eine Verschlechterung aussehen.

import { useCallback, useEffect, useState } from "react";
import {
  C,
  cardStyle,
  sectionTitle,
  CHECKIN_SCALES,
  SYMPTOM_SCALE,
} from "@/components/companion/companionUi";
import { LoadingCard, ErrorCard } from "@/components/companion/CompanionHeute";

// Datums-Arithmetik rein auf ISO-Strings (UTC-Mittag gegen TZ-Kanten) —
// nur für die Achse der Anzeige, nicht für Logik.
function addDaysIso(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function CompanionVerlauf({ api }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkins, setCheckins] = useState([]);
  const [serien, setSerien] = useState([]);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [symptoms, setSymptoms] = useState([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api("/verlauf");
      setCheckins(data.checkins || []);
      setSerien(data.serien || []);
      setCheckinStreak(data.checkinStreak || 0);
      setSymptoms(data.symptoms || []);
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

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard text={error} onRetry={load} />;

  const hasData = checkins.length > 0;

  // Symptome mit mindestens einem Wert in den geladenen Check-ins — nur die
  // bekommen eine Kurve (auch deaktivierte: alte Daten bleiben beschriftet).
  const symptomsWithData = symptoms.filter((sym) =>
    checkins.some(
      (c) => typeof (c.symptom_scores || {})[sym.id] === "number"
    )
  );

  // 30-Tage-Achse rückwärts ab dem neuesten Eintrag; Tage ohne Eintrag = null
  // (Lücke in der Linie statt erfundener Werte).
  let axis = [];
  if (hasData) {
    const byDate = new Map(
      checkins.map((c) => [String(c.checkin_date).slice(0, 10), c])
    );
    const latest = String(checkins[0].checkin_date).slice(0, 10);
    for (let i = 29; i >= 0; i--) {
      const day = addDaysIso(latest, -i);
      axis.push(byDate.get(day) || null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ padding: "0 2px" }}>
        <h2 style={{ ...sectionTitle, margin: 0, fontSize: 19 }}>
          Dein Verlauf
        </h2>
        <p style={{ fontSize: 13, color: C.textSoft, margin: "4px 0 0", lineHeight: 1.5 }}>
          Deine eigenen Einträge der letzten 30 Tage — zum Anschauen und fürs
          Gespräch in der Praxis.
        </p>
      </div>

      {!hasData ? (
        <div style={{ ...cardStyle, textAlign: "center", color: C.textSoft, fontSize: 14 }}>
          Hier entsteht dein Verlauf, sobald du im Tagebuch Einträge machst.
        </div>
      ) : (
        <>
          {CHECKIN_SCALES.map((m) => (
            <TrendCard
              key={m.key}
              label={m.label}
              // Bei "höher = mehr Stress" braucht die Kurve eine neutrale
              // Leserichtung — sonst wirkt sinkender Stress wie ein Absturz.
              subtitle={m.higherIsBetter ? null : "niedriger ist besser"}
              values={axis.map((c) => (c ? (c[m.key] ?? null) : null))}
              min={1}
              max={10}
            />
          ))}
          {symptomsWithData.map((sym) => (
            <TrendCard
              key={sym.id}
              label={sym.name}
              subtitle={`${SYMPTOM_SCALE.min} = ${SYMPTOM_SCALE.low} · ${SYMPTOM_SCALE.max} = ${SYMPTOM_SCALE.high}`}
              values={axis.map((c) => {
                const v = c ? (c.symptom_scores || {})[sym.id] : null;
                return typeof v === "number" ? v : null;
              })}
              min={SYMPTOM_SCALE.min}
              max={SYMPTOM_SCALE.max}
            />
          ))}
        </>
      )}

      {/* Serien */}
      <div style={cardStyle}>
        <h3 style={{ ...sectionTitle, fontSize: 15 }}>Deine Serien</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SerienChip name="Tagebuch" streak={checkinStreak} />
          {serien.map((s) => (
            <SerienChip key={s.itemId} name={s.name} streak={s.streak} />
          ))}
        </div>
        {serien.length === 0 && checkinStreak === 0 && (
          <p style={{ fontSize: 13, color: C.textSoft, margin: "10px 0 0" }}>
            Sobald du regelmäßig abhakst, sammelst du hier deine Serien.
          </p>
        )}
      </div>
    </div>
  );
}

// Eine Verlaufs-Karte: Label + (optionale) Richtungs-Zeile + letzter Wert +
// Sparkline — identisch für feste Skalen (1-10) und Symptome (0-10).
function TrendCard({ label, subtitle, values, min, max }) {
  const latestValue = [...values].reverse().find((v) => v !== null);
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          marginBottom: subtitle ? 2 : 6,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: C.tealDeep,
            flexShrink: 0,
          }}
        >
          {latestValue !== undefined && latestValue !== null
            ? `${latestValue}/10`
            : "–"}
        </span>
      </div>
      {subtitle && (
        <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 6 }}>
          {subtitle}
        </div>
      )}
      <Sparkline values={values} min={min} max={max} />
    </div>
  );
}

// Handgerollte Polyline-Sparkline: Werte min-max (Skalen 1-10, Symptome
// 0-10), null = Lücke (Liniensegment endet, Einzelpunkte werden als Punkt
// gezeichnet).
function Sparkline({ values, min = 1, max = 10 }) {
  const W = 300;
  const H = 64;
  const PAD = 6;
  const n = values.length;
  const x = (i) => PAD + (i / Math.max(n - 1, 1)) * (W - 2 * PAD);
  const y = (v) => PAD + (1 - (v - min) / (max - min)) * (H - 2 * PAD);

  const segments = [];
  let current = [];
  values.forEach((v, i) => {
    if (v === null || v === undefined) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push([x(i), y(v)]);
    }
  });
  if (current.length) segments.push(current);

  const lastSeg = segments[segments.length - 1];
  const lastPoint = lastSeg ? lastSeg[lastSeg.length - 1] : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="64"
      role="img"
      aria-label="Verlaufslinie der letzten 30 Tage"
    >
      {/* leise Referenzlinien bei min, Mitte und max */}
      {[min, (min + max) / 2, max].map((v) => (
        <line
          key={v}
          x1={PAD}
          x2={W - PAD}
          y1={y(v)}
          y2={y(v)}
          stroke={C.tealPale}
          strokeWidth="1"
        />
      ))}
      {segments.map((seg, i) =>
        seg.length === 1 ? (
          <circle key={i} cx={seg[0][0]} cy={seg[0][1]} r="2.5" fill={C.teal} />
        ) : (
          <polyline
            key={i}
            points={seg.map(([px, py]) => `${px},${py}`).join(" ")}
            fill="none"
            stroke={C.teal}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      )}
      {lastPoint && (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3.5" fill={C.tealDeep} />
      )}
    </svg>
  );
}

function SerienChip({ name, streak }) {
  const active = streak > 0;
  return (
    <span
      style={{
        display: "inline-block",
        background: active ? C.tealPale : "#f1f5f5",
        color: active ? C.tealDeep : C.textSoft,
        borderRadius: 999,
        padding: "7px 12px",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {active
        ? `🔥 ${streak} ${streak === 1 ? "Tag" : "Tage"} in Folge — ${name}`
        : `${name} — noch keine Serie`}
    </span>
  );
}
