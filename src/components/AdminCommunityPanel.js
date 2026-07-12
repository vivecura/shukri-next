"use client";

// ============================================================================
// AdminCommunityPanel — Moderations-Sicht der Patienten-Community
// (ViveCura Companion, Stufe 6) im Admin unter dem Tab "Community".
//
// Zwei Abschnitte, Aktions-Warteschlange zuerst:
//   1 🚩 Meldungen             — offene companion_reports als Karten mit
//                                aufgelöstem Ziel-Preview; "Ausblenden"
//                                (Beitrag/Kommentar) + "Erledigt".
//   2 📝 Beiträge & Kommentare — die neuesten Beiträge INKL. ausgeblendeter
//                                (gedimmt), Autor als Nickname + VC-Nummer
//                                (die Klarname↔Nickname-Zuordnung bleibt im
//                                Admin), Medien als signierte Thumbnails,
//                                je Zeile Ausblenden/Einblenden.
//
// Moderation = hidden-Flag, NIE Hard-Delete (Nachweisbarkeit). Reine UI —
// alle Queries kommen aus @/lib/companion (Single Source of Truth).
// Nur Shukri sieht diesen Tab (Admin.js rendert ihn !isCaller-gegated).
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import {
  fmtDate,
  REPORT_KIND_LABELS,
  listCommunityPosts,
  setPostHidden,
  setCommentHidden,
  listReports,
  resolveReport,
  communitySignedUrl,
} from "@/lib/companion";

// ---- Haus-Tokens (gleiche Klassen-Strings wie AdminCompanionSection) -------
const CARD = "rounded-xl border border-gray-200 p-4";
const H3 = "text-sm font-semibold text-[#1f6e70] mb-1";
const HINT = "text-xs text-[#515757]/50 mb-4";
const BADGE =
  "text-[10px] font-semibold text-[#515757]/40 uppercase tracking-wider";
const PILL_PRIMARY =
  "text-xs px-3 py-1.5 rounded-full bg-[#43a9ab] text-white hover:bg-[#3a9597] transition-colors disabled:opacity-40";
const QUIET = "text-sm text-[#515757]/30 italic py-4";

// Text-Auszug für Ziel-Previews und Kommentar-Zeilen (80 Zeichen reichen,
// der volle Beitrag steht in Abschnitt 2).
function excerpt(text, n = 120) {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…" : t;
}

// Nickname + VC-Nummer eines Autors — die Admin-interne Doppel-Identität.
function authorLabel(author) {
  if (!author) return "unbekannt";
  const nick = author.nickname || "ohne Nickname";
  return author.patient_number ? `${nick} (${author.patient_number})` : nick;
}

// ---------------------------------------------------------------------------
// MediaThumb — EIN Medium aus dem privaten 'community'-Bucket. Holt sich die
// signierte URL (1 h) selbst beim Mount; Bild als Thumbnail, Video klein mit
// Controls. Fehler bleiben still (kaputtes Medium blockiert die Moderation
// nicht) — es erscheint nur der Pfad-Platzhalter.
// ---------------------------------------------------------------------------
function MediaThumb({ item }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const signed = await communitySignedUrl(item.path);
        if (alive) setUrl(signed);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [item.path]);

  if (failed || (!url && !item.path)) {
    return (
      <span className="text-[10px] text-[#515757]/40 border border-gray-100 rounded-lg px-2 py-1">
        Medium nicht ladbar
      </span>
    );
  }
  if (!url) {
    return (
      <span className="inline-block w-20 h-20 rounded-lg bg-gray-100 animate-pulse" />
    );
  }
  if (item.type === "video") {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="h-24 rounded-lg border border-gray-200"
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {/* Signierte, kurzlebige Storage-URL — next/image bringt hier nichts. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Community-Bild"
        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
      />
    </a>
  );
}

// ---------------------------------------------------------------------------
// ReportCard — eine Meldung mit Ziel-Preview + Aktionen.
// ---------------------------------------------------------------------------
function ReportCard({ report, busy, onHideTarget, onResolve }) {
  const t = report.target;
  const kind = report.target_kind;
  const canHide = (kind === "post" || kind === "comment") && !!t;

  // Preview-Text des gemeldeten Ziels je Art.
  let preview = null;
  if (!t) {
    preview = "Ziel existiert nicht mehr (z. B. gelöscht).";
  } else if (kind === "post") {
    preview = excerpt(t.body) || "(Beitrag ohne Text — nur Medien)";
  } else if (kind === "comment") {
    preview = excerpt(t.body);
  } else if (kind === "message") {
    preview = excerpt(t.body);
  } else {
    preview = `Mitglied: ${authorLabel(report.targetAuthor)}`;
  }

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        report.resolved
          ? "border-gray-100 bg-gray-50/50"
          : "border-red-200 bg-red-50/40"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`${BADGE} ${report.resolved ? "" : "text-red-500/70"}`}>
          {REPORT_KIND_LABELS[kind] || kind}
        </span>
        <span className="text-xs text-[#515757]/50">
          gemeldet von {authorLabel(report.reporter)} ·{" "}
          {fmtDate(report.created_at)}
        </span>
        {t && t.hidden && (
          <span className={BADGE}>bereits ausgeblendet</span>
        )}
      </div>

      {report.reason && (
        <p className="mt-1.5 text-xs text-[#515757] whitespace-pre-wrap">
          Begründung: {report.reason}
        </p>
      )}

      <p className="mt-1.5 text-xs text-[#515757]/70 whitespace-pre-wrap">
        {kind !== "member" && t && (
          <span className="font-medium text-[#515757]">
            {authorLabel(report.targetAuthor)}:{" "}
          </span>
        )}
        {preview}
      </p>

      {!report.resolved && (
        <div className="mt-2.5 flex items-center gap-3 flex-wrap">
          {canHide && !t.hidden && (
            <button
              type="button"
              onClick={() => onHideTarget(report)}
              disabled={busy}
              className="text-xs text-red-500 hover:underline disabled:opacity-40"
            >
              Ausblenden
            </button>
          )}
          <button
            type="button"
            onClick={() => onResolve(report.id)}
            disabled={busy}
            className={PILL_PRIMARY}
          >
            {busy ? "Speichert…" : "Erledigt"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export default function AdminCommunityPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [reports, setReports] = useState([]); // offene Meldungen
  const [resolvedReports, setResolvedReports] = useState(null); // lazy geladen
  const [showResolved, setShowResolved] = useState(false);
  const [posts, setPosts] = useState([]);
  const [busyId, setBusyId] = useState(null); // Meldung/Beitrag/Kommentar in Arbeit

  const load = useCallback(async () => {
    setErr("");
    try {
      const [openReports, postRows] = await Promise.all([
        listReports({ resolved: false }),
        listCommunityPosts({ limit: 50 }),
      ]);
      setReports(openReports);
      setPosts(postRows);
    } catch (e) {
      setErr(e.message || "Konnte Community-Daten nicht laden.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await load();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  // Erledigte Historie lazy nachladen (erst beim Aufklappen).
  const toggleResolved = async () => {
    const next = !showResolved;
    setShowResolved(next);
    if (next && resolvedReports === null) {
      setErr("");
      try {
        setResolvedReports(await listReports({ resolved: true }));
      } catch (e) {
        setErr(e.message || "Konnte erledigte Meldungen nicht laden.");
        setResolvedReports([]);
      }
    }
  };

  // Gemeldeten Beitrag/Kommentar ausblenden — danach Meldungen + Beiträge
  // neu laden, damit beide Abschnitte synchron sind.
  const hideReportTarget = async (report) => {
    setBusyId(report.id);
    setErr("");
    try {
      if (report.target_kind === "post") {
        await setPostHidden(report.target_id, true);
      } else {
        await setCommentHidden(report.target_id, true);
      }
      await load();
    } catch (e) {
      setErr(e.message || "Ausblenden fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  };

  const onResolve = async (id) => {
    setBusyId(id);
    setErr("");
    try {
      const done = await resolveReport(id);
      setReports((rows) => rows.filter((r) => r.id !== id));
      // Frisch Erledigtes vorne in die (bereits geladene) Historie schieben.
      setResolvedReports((rows) =>
        rows === null
          ? rows
          : [
              { ...(reports.find((r) => r.id === id) || {}), ...done },
              ...rows,
            ]
      );
    } catch (e) {
      setErr(e.message || "Konnte die Meldung nicht abschließen.");
    } finally {
      setBusyId(null);
    }
  };

  // Beitrag/Kommentar aus Abschnitt 2 heraus umschalten — optimistisch im
  // State patchen (hidden ist reversibel, kein Zwei-Schritt nötig).
  const togglePost = async (post) => {
    setBusyId(post.id);
    setErr("");
    try {
      const saved = await setPostHidden(post.id, !post.hidden);
      setPosts((rows) =>
        rows.map((p) => (p.id === post.id ? { ...p, hidden: saved.hidden } : p))
      );
    } catch (e) {
      setErr(e.message || "Konnte den Beitrag nicht umschalten.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleComment = async (postId, comment) => {
    setBusyId(comment.id);
    setErr("");
    try {
      const saved = await setCommentHidden(comment.id, !comment.hidden);
      setPosts((rows) =>
        rows.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === comment.id ? { ...c, hidden: saved.hidden } : c
                ),
              }
            : p
        )
      );
    } catch (e) {
      setErr(e.message || "Konnte den Kommentar nicht umschalten.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#515757]/40 py-4">Lädt…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {err && <p className="text-red-500 text-xs mb-3">{err}</p>}

      {/* ================= 1 — Meldungen (Aktions-Warteschlange) ============ */}
      <div className={CARD}>
        <h3 className={H3}>🚩 Meldungen</h3>
        <p className={HINT}>
          Was Patienten über den Melden-Button gemeldet haben. Ausblenden nimmt
          den Beitrag/Kommentar sofort aus der App — gelöscht wird nie
          (Nachweisbarkeit).
        </p>

        {reports.length === 0 ? (
          <p className={QUIET}>Keine offenen Meldungen.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                busy={busyId === r.id}
                onHideTarget={hideReportTarget}
                onResolve={onResolve}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={toggleResolved}
          className="mt-4 text-xs text-[#515757]/40 hover:text-[#43a9ab] transition-colors"
        >
          {showResolved ? "Erledigte ausblenden" : "Erledigte anzeigen"}
        </button>
        {showResolved && (
          <div className="mt-2 space-y-2">
            {resolvedReports === null ? (
              <p className="text-xs text-[#515757]/40">Lädt…</p>
            ) : resolvedReports.length === 0 ? (
              <p className={QUIET}>Noch keine erledigten Meldungen.</p>
            ) : (
              resolvedReports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={{ ...r, resolved: true }}
                  busy={false}
                  onHideTarget={hideReportTarget}
                  onResolve={onResolve}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ================= 2 — Beiträge & Kommentare ======================== */}
      <div className={CARD}>
        <h3 className={H3}>📝 Beiträge &amp; Kommentare</h3>
        <p className={HINT}>
          Die neuesten Beiträge der Community — auch ausgeblendete (gedimmt).
          Autor = Nickname + Patientennummer; die Zuordnung bleibt hier im
          Admin.
        </p>

        {posts.length === 0 ? (
          <p className={QUIET}>Noch keine Beiträge.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`rounded-lg border p-3 text-sm ${
                  post.hidden
                    ? "border-gray-100 bg-gray-50/50 opacity-60"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#515757]">
                    {authorLabel(post.author)}
                  </span>
                  <span className="text-xs text-[#515757]/50">
                    · {fmtDate(post.created_at)}
                  </span>
                  {post.hidden && (
                    <span className={`ml-auto ${BADGE}`}>Ausgeblendet</span>
                  )}
                </div>

                {post.body && (
                  <p className="mt-1.5 text-sm text-[#515757] whitespace-pre-wrap">
                    {post.body}
                  </p>
                )}

                {Array.isArray(post.media) && post.media.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {post.media.map((m, i) => (
                      <MediaThumb key={m.path || i} item={m} />
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => togglePost(post)}
                    disabled={busyId === post.id}
                    className={`text-xs transition-colors disabled:opacity-40 ${
                      post.hidden
                        ? "text-[#43a9ab] hover:underline"
                        : "text-[#515757]/40 hover:text-red-500"
                    }`}
                  >
                    {post.hidden ? "Einblenden" : "Ausblenden"}
                  </button>
                </div>

                {post.comments.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-2">
                    {post.comments.map((c) => (
                      <div
                        key={c.id}
                        className={c.hidden ? "opacity-50" : undefined}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-[#515757]">
                            {authorLabel(c.author)}
                          </span>
                          <span className="text-[10px] text-[#515757]/40">
                            · {fmtDate(c.created_at)}
                          </span>
                          {c.hidden && (
                            <span className={BADGE}>Ausgeblendet</span>
                          )}
                        </div>
                        <p className="text-xs text-[#515757]/80 whitespace-pre-wrap">
                          {c.body}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleComment(post.id, c)}
                          disabled={busyId === c.id}
                          className={`text-[10px] transition-colors disabled:opacity-40 ${
                            c.hidden
                              ? "text-[#43a9ab] hover:underline"
                              : "text-[#515757]/40 hover:text-red-500"
                          }`}
                        >
                          {c.hidden ? "Einblenden" : "Ausblenden"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
