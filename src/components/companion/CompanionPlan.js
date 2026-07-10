"use client";

// CompanionPlan — "Mein Plan", read-only. Zeigt die aktiven Bausteine aller
// fünf Arten, gruppiert wie vom Server geliefert (/api/companion/plan gibt
// Label + Emoji je Gruppe in kanonischer ITEM_KINDS-Reihenfolge mit).
//
// §9 hart: hier gibt es KEINE Diagnose — nur die Empfehlungen selbst. Jeder
// Baustein trägt das Badge "Empfehlung von Shukri" (die App empfiehlt nie
// selbst etwas).

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  C,
  cardStyle,
  sectionTitle,
  EmpfehlungBadge,
  fmtBerlinDate,
  fmtDate,
  fmtTimes,
  fmtWeekdays,
} from "@/components/companion/companionUi";
import { LoadingCard, ErrorCard } from "@/components/companion/CompanionHeute";
import CompanionContact from "@/components/companion/CompanionContact";

export default function CompanionPlan({ api }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api("/plan");
      setGroups(data.groups || []);
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

  const supplements =
    groups.find((g) => g.kind === "supplement")?.items || [];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ padding: "0 2px" }}>
        <h2 style={{ ...sectionTitle, margin: 0, fontSize: 19 }}>
          Deine Empfehlungen von Shukri
        </h2>
        <p style={{ fontSize: 13, color: C.textSoft, margin: "4px 0 0", lineHeight: 1.5 }}>
          Dein Plan aus der Praxis, hier zum Nachlesen. Änderungen besprichst
          du direkt mit Shukri.
        </p>
      </div>

      {supplements.length > 0 && (
        <SupplementDayOverview items={supplements} />
      )}

      {groups.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", color: C.textSoft, fontSize: 14 }}>
          Noch keine Einträge. Shukri legt deinen Plan in der Praxis an.
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.kind} style={cardStyle}>
            <h3 style={{ ...sectionTitle, fontSize: 15 }}>
              {group.emoji} {group.label}
            </h3>
            {group.items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  padding: "11px 0",
                  borderTop: idx === 0 ? "none" : `1px solid ${C.tealPale}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: C.text }}>
                    {item.name}
                  </span>
                  <EmpfehlungBadge />
                </div>
                {item.dosis && (
                  <div style={{ fontSize: 14, color: C.text, marginTop: 3 }}>
                    {item.dosis}
                  </div>
                )}
                {item.instructions && (
                  <div
                    style={{
                      fontSize: 13,
                      color: C.textSoft,
                      marginTop: 3,
                      lineHeight: 1.5,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {item.instructions}
                  </div>
                )}
                <MetaLine item={item} />
              </div>
            ))}
          </div>
        ))
      )}

      {/* Kontakt zur Praxis — immer sichtbar am Ende des Plan-Tabs */}
      <CompanionContact />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kompakter Supplement-Tagesüberblick oben im Plan: eine Zeile je aktivem
// Supplement, drei Tageszeit-Spalten (☀️ bis 10:59 · 🌞🌤 11:00–17:59 ·
// 🌙 ab 18:00) mit der exakten Uhrzeit als Teal-Chip. Ohne Uhrzeit → "Nach
// Bedarf" darunter. Reine Anzeige — abgehakt wird im Heute-Tab.
// ---------------------------------------------------------------------------

const OVERVIEW_COLS = [
  { id: "morgens", emoji: "☀️", label: "Morgens" },
  { id: "tagsueber", emoji: "🌞🌤", label: "Mittags/Nachmittags" },
  { id: "abends", emoji: "🌙", label: "Abends" },
];

// "HH:MM" → Spalten-Id (<11 morgens, <18 tagsüber, sonst abends).
function overviewColForTime(time) {
  const h = parseInt(String(time).slice(0, 2), 10);
  if (Number.isNaN(h) || h < 11) return "morgens";
  if (h < 18) return "tagsueber";
  return "abends";
}

function SupplementDayOverview({ items }) {
  const timed = items.filter((it) => (it.times || []).length > 0);
  const untimed = items.filter((it) => (it.times || []).length === 0);
  const cellBorder = `1px solid ${C.tealPale}`;

  return (
    <div style={cardStyle}>
      <h3 style={{ ...sectionTitle, fontSize: 15 }}>
        💊 Deine Supplemente im Tagesüberblick
      </h3>

      {timed.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 54px 54px 54px",
            alignItems: "stretch",
          }}
        >
          {/* Kopfzeile: Tageszeit-Emojis */}
          <span />
          {OVERVIEW_COLS.map((col) => (
            <span
              key={col.id}
              title={col.label}
              aria-label={col.label}
              style={{
                textAlign: "center",
                fontSize: 14,
                paddingBottom: 6,
                whiteSpace: "nowrap",
              }}
            >
              {col.emoji}
            </span>
          ))}

          {timed.map((item) => (
            <Fragment key={item.id}>
              <span
                style={{
                  borderTop: cellBorder,
                  padding: "8px 6px 8px 0",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: C.text,
                    lineHeight: 1.35,
                  }}
                >
                  {item.name}
                </span>
                {item.dosis && (
                  <span
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.textSoft,
                      marginTop: 1,
                    }}
                  >
                    {item.dosis}
                  </span>
                )}
                {(item.days_of_week || []).length > 0 && (
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.tealSoft,
                      marginTop: 1,
                    }}
                  >
                    nur {fmtWeekdays(item.days_of_week)}
                  </span>
                )}
              </span>
              {OVERVIEW_COLS.map((col) => {
                const times = (item.times || []).filter(
                  (t) => overviewColForTime(t) === col.id
                );
                return (
                  <span
                    key={col.id}
                    style={{
                      borderTop: cellBorder,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                      padding: "8px 2px",
                    }}
                  >
                    {times.length > 0 ? (
                      times.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: C.tealDeep,
                            background: C.tealPale,
                            borderRadius: 999,
                            padding: "2px 7px",
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{ fontSize: 12, color: C.line, fontWeight: 700 }}
                      >
                        –
                      </span>
                    )}
                  </span>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}

      {untimed.length > 0 && (
        <div
          style={{
            fontSize: 12.5,
            color: C.textSoft,
            lineHeight: 1.55,
            marginTop: timed.length > 0 ? 10 : 0,
            paddingTop: timed.length > 0 ? 8 : 0,
            borderTop: timed.length > 0 ? cellBorder : "none",
          }}
        >
          <strong style={{ color: C.tealSoft }}>Nach Bedarf:</strong>{" "}
          {untimed
            .map((it) => (it.dosis ? `${it.name} (${it.dosis})` : it.name))
            .join(" · ")}
        </div>
      )}

      <div
        style={{
          fontSize: 11.5,
          color: C.textSoft,
          marginTop: 10,
          lineHeight: 1.4,
        }}
      >
        Abhaken kannst du alles im Tab ☀️ Heute.
      </div>
    </div>
  );
}

// Rhythmus-Zeile: Uhrzeiten, Wochentage (leer = "täglich"), Zeitraum, Termin.
// start_date/end_date sind reine Datums-Spalten (fmtDate); event_date ist
// timestamptz und MUSS in Europe/Berlin formatiert werden (fmtBerlinDate),
// sonst rutscht ein 00:00–01:59-Termin auf den Vortag.
function MetaLine({ item }) {
  const parts = [];
  if ((item.times || []).length) parts.push(`🕐 ${fmtTimes(item.times)}`);
  parts.push(`📅 ${fmtWeekdays(item.days_of_week)}`);
  if (item.start_date) parts.push(`ab ${fmtDate(item.start_date)}`);
  if (item.end_date) parts.push(`bis ${fmtDate(item.end_date)}`);
  if (item.event_date) parts.push(`Termin: ${fmtBerlinDate(item.event_date)}`);
  return (
    <div
      style={{
        fontSize: 12.5,
        color: C.tealSoft,
        fontWeight: 600,
        marginTop: 6,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      {parts.map((p, i) => (
        <span key={i}>{p}</span>
      ))}
    </div>
  );
}
