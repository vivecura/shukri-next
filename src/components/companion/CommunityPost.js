"use client";

// CommunityPost — Detailansicht eines Beitrags: die volle Post-Karte (gleiche
// PostCard wie im Feed), darunter die Kommentare (Nickname + relative Zeit,
// je fremdem Kommentar ein ⋯-"Melden"), unten eine fixierte Antwort-Box
// (oberhalb der Tab-Bar). Antworten werden optimistisch angehängt und danach
// leise re-fetcht (Zähler/Sortierung serverseitig korrekt).

import { useCallback, useEffect, useState } from "react";
import { C, cardStyle, inputStyle, primaryBtn } from "@/components/companion/companionUi";
import { LoadingCard, ErrorCard } from "@/components/companion/CompanionHeute";
import { PostCard, relTime } from "@/components/companion/CommunityFeed";

export default function CommunityPost({ api, post, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setError("");
      try {
        const data = await api(`/community/comments?postId=${post.id}`);
        setComments(data.comments || []);
        setLoading(false);
      } catch (err) {
        if (!quiet) {
          setError(err.message);
          setLoading(false);
        }
      }
    },
    [api, post.id]
  );

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const send = async () => {
    const bodyText = text.trim();
    if (!bodyText || sending) return;
    setSending(true);
    setSendError("");
    try {
      const data = await api("/community/comments", {
        method: "POST",
        body: { postId: post.id, body: bodyText },
      });
      // Optimistisch anhängen, dann leise re-fetchen.
      setComments((prev) => [...prev, data.comment]);
      setText("");
      load({ quiet: true });
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Zurück zum Feed */}
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          padding: "2px 0",
          textAlign: "left",
          fontSize: 14.5,
          fontWeight: 700,
          color: C.tealDeep,
          cursor: "pointer",
        }}
      >
        ← Zurück zum Feed
      </button>

      <PostCard post={post} api={api} onOpenComments={null} />

      {loading ? (
        <LoadingCard />
      ) : error ? (
        <ErrorCard text={error} onRetry={() => load()} />
      ) : comments.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            color: C.textSoft,
            fontSize: 14,
          }}
        >
          Noch keine Antworten — schreib die erste!
        </div>
      ) : (
        <div style={cardStyle}>
          {comments.map((comment, idx) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              api={api}
              first={idx === 0}
            />
          ))}
        </div>
      )}

      {sendError && (
        <p
          style={{
            fontSize: 13,
            color: C.red,
            fontWeight: 600,
            margin: 0,
            textAlign: "center",
          }}
        >
          {sendError}
        </p>
      )}

      {/* Platzhalter, damit die fixierte Antwort-Box nichts verdeckt */}
      <div style={{ height: 56 }} />

      {/* Fixierte Antwort-Box oberhalb der Tab-Bar */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(58px + env(safe-area-inset-bottom))",
          zIndex: 40,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(8px)",
          borderTop: `1px solid ${C.line}`,
          padding: "8px 12px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            type="text"
            value={text}
            maxLength={1000}
            placeholder="Deine Antwort …"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            style={{ ...inputStyle, flex: 1, padding: "11px 13px", fontSize: 16 }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            style={{
              ...primaryBtn,
              width: "auto",
              padding: "0 18px",
              fontSize: 15,
              opacity: sending || !text.trim() ? 0.55 : 1,
              cursor: sending || !text.trim() ? "default" : "pointer",
              flexShrink: 0,
            }}
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}

// Ein Kommentar: Nickname + relative Zeit + Text, ⋯-"Melden" bei fremden.
function CommentRow({ comment, api, first }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState("");

  const report = async () => {
    setMenuOpen(false);
    setReportError("");
    try {
      await api("/community/report", {
        method: "POST",
        body: { kind: "comment", targetId: comment.id },
      });
      setReported(true);
    } catch (err) {
      setReportError(err.message);
    }
  };

  return (
    <div
      style={{
        padding: "10px 0",
        borderTop: first ? "none" : `1px solid ${C.tealPale}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: C.tealDeep,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {comment.nickname}
          {comment.isMine && (
            <span
              style={{
                marginLeft: 6,
                background: C.tealPale,
                color: C.tealDeep,
                borderRadius: 999,
                padding: "1px 7px",
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              Du
            </span>
          )}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11.5, color: C.textSoft }}>
            {relTime(comment.createdAt)}
          </span>
          {!comment.isMine && (
            <span style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Mehr Optionen"
                onClick={() => setMenuOpen((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 4px",
                  fontSize: 16,
                  fontWeight: 800,
                  color: C.textSoft,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ⋯
              </button>
              {menuOpen && (
                <button
                  type="button"
                  onClick={report}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    zIndex: 20,
                    background: "#fff",
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    boxShadow: "0 4px 12px rgba(31, 110, 112, 0.15)",
                    padding: "9px 14px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: C.red,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Melden
                </button>
              )}
            </span>
          )}
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          color: C.text,
          lineHeight: 1.5,
          marginTop: 4,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {comment.body}
      </div>
      {reported && (
        <div
          style={{
            marginTop: 4,
            fontSize: 12.5,
            fontWeight: 600,
            color: C.tealDeep,
          }}
        >
          Danke, wir schauen uns das an.
        </div>
      )}
      {reportError && (
        <div
          style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: C.red }}
        >
          {reportError}
        </div>
      )}
    </div>
  );
}
