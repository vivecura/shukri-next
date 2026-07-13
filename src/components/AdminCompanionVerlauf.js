"use client";

// ============================================================================
// AdminCompanionVerlauf — "📊 So geht es dem Patienten" in der Akte (App-Tab).
//
// Shukris Blick auf das Patienten-Tagebuch: dieselben Charts, dieselben
// Zahlen wie die Patienten-App (Charts aus CompanionCharts, Formeln aus
// companionStats, Daten über getPatientVerlauf aus @/lib/companion — das
// Spiegelbild der verlauf-Route über den Admin-Auth-Client). Einziger
// Admin-Mehrwert: die chronologische Tagebuch-Liste mit den Notiz-Volltexten,
// die der Patient in seiner App so nicht sieht.
//
// Lazy: aufklappbare Karte, die Daten werden erst beim ersten Aufklappen
// geladen (der Akte-Tab lädt sonst drei Tabellen für Patienten, deren
// Verlauf gerade niemand ansieht).
//
// Bewusst REINE Darstellung der Selbsteinträge — keinerlei Bewertungs- oder
// Diagnose-Logik, keine Ampelfarben (§6, kein Medizinprodukt; CompanionCharts
// erzwingt Teal + feste Skalen ohnehin).
// ============================================================================

import { useCallback, useMemo, useRef, useState } from "react";
import { getPatientVerlauf } from "@/lib/companion";
import {
  C,
  CHECKIN_SCALES,
  SYMPTOM_SCALE,
  fmtDate,
  fmtDayLong,
} from "@/components/companion/companionUi";
import {
  TrendChart,
  TrendLegend,
  DeltaBadge,
  RingGauge,
  SegmentedControl,
  TickerRow,
  MiniBars,
  CompanionChartsStyles,
  fmtNum,
} from "@/components/companion/CompanionCharts";
import {
  addDaysIso,
  buildDailySeries,
  deltaWeek,
  lastNonNull,
  listDatesIso,
  rollingAverage,
} from "@/lib/companionStats";

// Haus-Tokens — bewusst wortgleich mit AdminCompanionSection (dort lokal,
// ein Import hierher wäre ein Kreis-Import Section ⇄ Verlauf).
const CARD = "rounded-xl border border-gray-200 p-4";
const H3 = "text-sm font-semibold text-[#1f6e70] mb-1";
const MICRO_LABEL =
  "block text-[10px] font-semibold text-[#515757]/50 uppercase tracking-wider mb-1";
const QUIET = "text-sm text-[#515757]/30 italic py-4";

const RANGE_OPTIONS = [
  { id: "30", label: "30 Tage" },
  { id: "90", label: "90 Tage" },
  { id: "all", label: "Seit Beginn" },
];
const RANGE_LABEL = { 30: "30 Tage", 90: "90 Tage", all: "seit Beginn" };

// Emojis nur fürs Wiederfinden — identisch mit der Patienten-App
// (CompanionVerlauf), die Skalen selbst bleiben kanonisch in CHECKIN_SCALES.
const SCALE_EMOJI = {
  feeling: "🙂",
  energy: "⚡",
  sleep: "😴",
  verdauung: "🍽️",
  stress: "🌊",
  klarheit: "🧠",
};
const SYMPTOM_EMOJI = "📍";
const KIND_EMOJI = { supplement: "💊", todo: "✅" };

// Anzahl Tagebuch-Zeilen pro "Mehr anzeigen"-Klick.
const DIARY_PAGE = 10;

export default function AdminCompanionVerlauf({ submissionId }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("feeling");
  const [diaryCount, setDiaryCount] = useState(DIARY_PAGE);
  // Sequenz-Guard gegen stale Antworten bei schnellen Range-Wechseln —
  // gleiches Muster wie in der Patienten-App (CompanionVerlauf).
  const requestIdRef = useRef(0);

  // Patientenwechsel: kompletten Block-Zustand verwerfen, sonst zeigt die
  // Akte von Patient B kurz die Kurven von Patient A. Heute schützt zwar
  // key={selected.id} am Eltern-Element, aber darauf darf sich diese
  // Komponente nicht verlassen.
  const seenSubmissionRef = useRef(submissionId);
  if (seenSubmissionRef.current !== submissionId) {
    seenSubmissionRef.current = submissionId;
    requestIdRef.current++;
    setOpen(false);
    setData(null);
    setErr("");
    setLoading(false);
    setRange("30");
    setSelectedMetric("feeling");
    setDiaryCount(DIARY_PAGE);
  }

  const load = useCallback(
    async (r) => {
      const requestId = ++requestIdRef.current;
      setErr("");
      setLoading(true);
      try {
        const res = await getPatientVerlauf(submissionId, r);
        if (requestId !== requestIdRef.current) return;
        setData(res);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setErr(e.message || "Konnte den Verlauf nicht laden.");
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [submissionId]
  );

  // Lazy-Gate: erst der Aufklapp-Klick lädt — danach bleibt der Stand stehen
  // (Zuklappen verwirft nichts, erneutes Aufklappen lädt nicht neu).
  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) load(range);
  };

  const onRange = (id) => {
    setRange(id);
    load(id);
  };

  // Alle Metrik-Serien aus den geladenen Check-ins — rechnerisch identisch
  // mit der Patienten-App (CompanionVerlauf): 7 Vortage als Anlauf für den
  // gleitenden Schnitt, danach abgeschnitten; Lücken bleiben Lücken.
  // "Heute" kommt aus dem Fetch (data.today), damit Lade-Fenster und
  // Chart-Achse nie auseinanderlaufen.
  const model = useMemo(() => {
    if (!data) return null;
    const today = data.today;
    const checkins = data.checkins || [];
    const earliestLoaded = checkins.length
      ? String(checkins[checkins.length - 1].checkin_date).slice(0, 10)
      : today;
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

    const buildMetric = ({ id, emoji, label, domain, low, high, getter, forceMuted }) => {
      const fullValues = buildDailySeries(fullDays, checkins, getter);
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
        label: sym.active ? sym.name : `${sym.name} (nicht mehr erfasst)`,
        domain: [SYMPTOM_SCALE.min, SYMPTOM_SCALE.max],
        low: SYMPTOM_SCALE.low,
        high: SYMPTOM_SCALE.high,
        getter: (c) => (c.symptom_scores || {})[sym.id],
        forceMuted: !sym.active,
      });
      if (sym.active || m.nonNull > 0) metrics.push(m);
    }

    // Kopfzeile: wann kam der letzte Eintrag? (checkins sind absteigend
    // sortiert, Zeile 0 ist der neueste.)
    const lastEntryDate = checkins.length
      ? String(checkins[0].checkin_date).slice(0, 10)
      : null;
    const daysAgo = lastEntryDate
      ? Math.round(
          (Date.parse(`${today}T00:00:00Z`) -
            Date.parse(`${lastEntryDate}T00:00:00Z`)) /
            86400000
        )
      : null;

    const symptomNames = new Map(
      (data.symptoms || []).map((s) => [s.id, s.name])
    );

    return {
      metrics,
      startDate,
      entryCount: checkins.length,
      lastEntryDate,
      daysAgo,
      symptomNames,
    };
  }, [data, range]);

  const metrics = model?.metrics || [];
  const selected =
    metrics.find((m) => m.id === selectedMetric) || metrics[0] || null;
  const treue = data?.treue || null;
  const streakByItem = new Map(
    (data?.serien || []).map((s) => [s.itemId, s.streak])
  );
  const checkins = data?.checkins || [];
  const hasCheckins = checkins.length > 0;

  const lastLabel =
    model?.daysAgo == null
      ? null
      : model.daysAgo === 0
      ? "heute"
      : model.daysAgo === 1
      ? "gestern"
      : `vor ${model.daysAgo} Tagen`;

  return (
    <div className={CARD}>
      {/* Keyframes companion-draw/companion-fade: der Admin hat keine
          Companion-Shell — ohne diesen Baustein bleiben die Chart-Linien
          unsichtbar (animation both + fehlende Keyframes). */}
      <CompanionChartsStyles />

      {/* Aufklapp-Kopf: ganze Zeile klickbar. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={toggleOpen}
        className="w-full flex items-start justify-between gap-2 text-left"
      >
        <span>
          <span className={`block ${H3}`}>📊 So geht es dem Patienten</span>
          <span className="block text-xs text-[#515757]/50">
            Tagebuch, Trends und Einnahme-Treue aus der App — die eigenen
            Einträge des Patienten, unbewertet dargestellt.
          </span>
        </span>
        <span
          aria-hidden
          className={`text-[#515757]/40 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
      </button>

      {open && (
        <div className="mt-4">
          {err && (
            <p className="text-red-500 text-xs mb-3">
              {err}{" "}
              <button
                type="button"
                onClick={() => load(range)}
                className="underline hover:text-red-600"
              >
                Erneut versuchen
              </button>
            </p>
          )}

          {!data && loading && (
            <p className="text-sm text-[#515757]/40 py-4">Lädt Verlauf…</p>
          )}

          {data && (
            <div
              className="space-y-4"
              style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}
            >
              {/* Kopfzeile: letzter Eintrag + Tagebuch-Serie */}
              <p className="text-sm text-[#515757]">
                {hasCheckins ? (
                  <>
                    Zuletzt eingetragen:{" "}
                    <span className="font-semibold text-[#1f6e70]">
                      {lastLabel}
                    </span>
                    {data.checkinStreak > 0 && (
                      <>
                        {" "}
                        · 📖 {data.checkinStreak}{" "}
                        {data.checkinStreak === 1 ? "Tag" : "Tage"} in Folge
                      </>
                    )}
                    {range === "all" && model && (
                      <span className="text-[#515757]/60">
                        {" "}
                        · seit Start am {fmtDate(model.startDate)}:{" "}
                        {model.entryCount}{" "}
                        {model.entryCount === 1 ? "Eintrag" : "Einträge"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[#515757]/60">
                    Noch keine Einträge — die Ansicht füllt sich, sobald der
                    Patient sein Tagebuch nutzt.
                  </span>
                )}
              </p>

              {/* Zeitraum-Umschalter */}
              <div className="max-w-sm">
                <SegmentedControl
                  options={RANGE_OPTIONS}
                  value={range}
                  onChange={onRange}
                />
              </div>

              {hasCheckins && selected && (
                <>
                  {/* Detail-Chart der gewählten Metrik */}
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1f6e70] truncate">
                          {selected.emoji} {selected.label}
                        </p>
                        <p className="text-[11px] text-[#515757]/50">
                          {selected.domain[0]} = {selected.low} ·{" "}
                          {selected.domain[1]} = {selected.high}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: C.tealDeep,
                          }}
                        >
                          {fmtNum(selected.current)}
                        </span>
                        <DeltaBadge
                          delta={selected.delta}
                          labelBelow="Vorwoche"
                        />
                      </div>
                    </div>
                    {selected.nonNull < 2 ? (
                      <p className={QUIET}>
                        Noch zu wenige Einträge für eine Kurve in diesem
                        Zeitraum.
                      </p>
                    ) : (
                      <div className="mt-2">
                        <TrendChart
                          days={selected.days}
                          values={selected.values}
                          trend={selected.trend}
                          domain={selected.domain}
                          height={200}
                          ariaLabel={`Verlauf ${selected.label}: Tageswerte und 7-Tage-Schnitt`}
                          drawKey={`${selected.id}-${range}`}
                        />
                        <TrendLegend />
                      </div>
                    )}
                  </div>

                  {/* Ticker-Liste: alle Skalen + Symptome, Klick wählt das
                      Detail-Chart */}
                  <div className="rounded-lg border border-gray-200 px-2 py-1">
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
                        onPress={() => setSelectedMetric(m.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Einnahme-Treue — auch ohne Tagebuch-Einträge sinnvoll,
                  solange im Zeitraum etwas fällig war */}
              {treue && treue.gesamt?.soll > 0 && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-[#1f6e70]">
                    Einnahmen &amp; To-dos
                  </p>
                  <p className="text-xs text-[#515757]/50 mb-3">
                    Zeitraum: {RANGE_LABEL[range] || range}, bis gestern —
                    gezählt ab Aufnahme in den Plan.
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <RingGauge
                      percent={treue.gesamt.prozent}
                      size={80}
                      strokeWidth={8}
                    >
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: C.tealDeep,
                        }}
                      >
                        {treue.gesamt.prozent != null
                          ? `${treue.gesamt.prozent} %`
                          : ""}
                      </span>
                    </RingGauge>
                    <p className="text-sm text-[#515757]">
                      {treue.gesamt.ist} von {treue.gesamt.soll} Einnahmen und
                      Aufgaben erfasst
                    </p>
                  </div>

                  {(treue.proItem || []).map((item) => {
                    const streak = streakByItem.get(item.itemId) || 0;
                    const dosis = data.dosisByItem?.[item.itemId] || "";
                    return (
                      <div
                        key={item.itemId}
                        className="flex items-start gap-3 border-t border-gray-100 pt-3 mt-3"
                      >
                        <RingGauge
                          percent={item.prozent}
                          size={44}
                          strokeWidth={5}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: C.tealDeep,
                            }}
                          >
                            {item.prozent != null ? `${item.prozent}%` : ""}
                          </span>
                        </RingGauge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#515757] truncate">
                            {KIND_EMOJI[item.kind] || "•"} {item.name}
                            {dosis && (
                              <span className="text-[#515757]/60">
                                {" "}
                                · {dosis}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[#515757]/60">
                            {item.ist} von {item.soll} erfasst
                            {streak >= 2 && ` · ${streak} Tage in Folge`}
                          </p>
                          <div className="mt-1.5">
                            <MiniBars days={item.letzte14 || []} />
                            <p className="text-[10px] text-[#515757]/40 mt-0.5">
                              Die letzten 14 Tage, bis gestern
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tagebuch-Liste — nur hier im Admin: Notiz-Volltexte der
                  letzten Einträge (der Patient sieht diese Listenform in
                  seiner App nicht) */}
              {hasCheckins && (
                <div>
                  <p className={MICRO_LABEL}>Tagebuch — letzte Einträge</p>
                  <div className="space-y-2">
                    {checkins.slice(0, diaryCount).map((row) => (
                      <DiaryRow
                        key={row.id}
                        row={row}
                        symptomNames={model?.symptomNames || new Map()}
                      />
                    ))}
                  </div>
                  {checkins.length > diaryCount && (
                    <button
                      type="button"
                      onClick={() => setDiaryCount((n) => n + DIARY_PAGE)}
                      className="mt-2 text-xs text-[#43a9ab] hover:underline"
                    >
                      Mehr anzeigen ({checkins.length - diaryCount} weitere)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiaryRow — ein Tagebuch-Eintrag: Datum, Skalenwerte kompakt, Symptomwerte,
// Notiz im Volltext. Reine Wiedergabe der Selbsteinträge, keine Hervorhebung
// einzelner Werte (§6) — nur die Rückruf-Bitte des Patienten wird als
// Ereignis des Tages mit angezeigt (sie ist eine Handlung, kein Messwert).
// ---------------------------------------------------------------------------
function DiaryRow({ row, symptomNames }) {
  const scaleParts = CHECKIN_SCALES.filter(
    (s) => typeof row[s.key] === "number"
  ).map((s) => `${s.label} ${row[s.key]}`);
  const symParts = Object.entries(row.symptom_scores || {})
    .filter(([, v]) => typeof v === "number")
    .map(([id, v]) => `${symptomNames.get(id) || "Symptom"} ${v}`);

  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-[#515757]">
          {fmtDayLong(row.checkin_date)}
        </span>
        {row.help_flag && (
          <span className="text-[10px] font-semibold text-[#1f6e70] bg-[#43a9ab]/10 rounded-full px-2 py-0.5">
            🆘 Rückruf-Bitte an diesem Tag
          </span>
        )}
      </div>
      {scaleParts.length > 0 && (
        <p className="mt-1 text-xs text-[#515757]/70">
          {scaleParts.join(" · ")}
        </p>
      )}
      {symParts.length > 0 && (
        <p className="mt-0.5 text-xs text-[#515757]/70">
          {SYMPTOM_EMOJI} {symParts.join(" · ")}
        </p>
      )}
      {row.notes ? (
        <p className="mt-2 text-sm text-[#515757] whitespace-pre-wrap break-words border-l-2 border-[#43a9ab]/40 pl-2">
          {row.notes}
        </p>
      ) : null}
    </div>
  );
}
