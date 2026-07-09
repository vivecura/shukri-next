"use client";

// CompanionPlan — "Mein Plan", read-only. Zeigt die aktiven Bausteine aller
// fünf Arten, gruppiert wie vom Server geliefert (/api/companion/plan gibt
// Label + Emoji je Gruppe in kanonischer ITEM_KINDS-Reihenfolge mit).
//
// §9 hart: hier gibt es KEINE Diagnose — nur die Empfehlungen selbst. Jeder
// Baustein trägt das Badge "Empfehlung von Shukri" (die App empfiehlt nie
// selbst etwas).

import { useCallback, useEffect, useState } from "react";
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
