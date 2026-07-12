"use client";

// CommunityChat — 1:1-Chat zwischen Community-Mitgliedern. Zwei Modi:
//   * Liste: Threads aus /community/inbox (Vorschau + Ungelesen-Zähler),
//     darunter "Alle Mitglieder" aus /community/members (ohne sich selbst,
//     ohne bestehende Threads).
//   * Konversation: Bubbles (eigene teal/rechts, fremde weiß/links),
//     Tages-Trenner, 5s-Polling mit since-Cursor (nur Anhängen), markRead
//     beim Öffnen und bei neu eingetroffenen fremden Nachrichten, feste
//     Sende-Box oberhalb der Tab-Bar. ⋯ im Kopf → "Melden" (kind: member).
//
// Der Ungelesen-Stand wird lokal gepflegt und über onUnreadChange in das
// Shell-Badge zurückgespielt (dort läuft zusätzlich der 20s-Poll).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  C,
  cardStyle,
  inputStyle,
  primaryBtn,
  fmtBerlinDate,
} from "@/components/companion/companionUi";
import { LoadingCard, ErrorCard } from "@/components/companion/CompanionHeute";
import { relTime } from "@/components/companion/CommunityFeed";

function fmtBerlinTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function CommunityChat({ api, onUnreadChange }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partners, setPartners] = useState([]);
  const [members, setMembers] = useState([]);
  const [active, setActive] = useState(null); // {id, nickname} | null
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setError("");
      try {
        const [inbox, membersRes] = await Promise.all([
          api("/community/inbox"),
          api("/community/members"),
        ]);
        setPartners(inbox.partners || []);
        setMembers(membersRes.members || []);
        setLoaded(true);
        setLoading(false);
      } catch (err) {
        if (!quiet) {
          setError(err.message);
          setLoading(false);
        }
      }
    },
    [api]
  );

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // Lokalen Ungelesen-Stand in das Shell-Badge zurückspielen.
  useEffect(() => {
    if (!loaded) return;
    onUnreadChange?.(partners.reduce((sum, p) => sum + (p.unread || 0), 0));
  }, [partners, loaded, onUnreadChange]);

  // Nach markRead in der Konversation: Zähler dieses Partners lokal auf 0.
  const handleRead = useCallback((partnerId) => {
    setPartners((prev) =>
      prev.map((p) => (p.partnerId === partnerId ? { ...p, unread: 0 } : p))
    );
  }, []);

  if (active) {
    return (
      <Conversation
        api={api}
        partner={active}
        onRead={handleRead}
        onBack={() => {
          setActive(null);
          load({ quiet: true });
        }}
      />
    );
  }

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard text={error} onRetry={() => load()} />;

  const threadIds = new Set(partners.map((p) => p.partnerId));
  const others = members.filter(
    (m) => !m.isSelf && !threadIds.has(m.submissionId)
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {partners.length === 0 && others.length === 0 && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            color: C.textSoft,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Noch keine anderen Mitglieder in der Community — schau bald wieder
          vorbei.
        </div>
      )}

      {partners.length > 0 && (
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.tealDeep,
              margin: "0 0 4px",
            }}
          >
            Deine Chats
          </h3>
          {partners.map((p, idx) => (
            <button
              key={p.partnerId}
              type="button"
              onClick={() => setActive({ id: p.partnerId, nickname: p.nickname })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                background: "none",
                border: "none",
                borderTop: idx === 0 ? "none" : `1px solid ${C.tealPale}`,
                padding: "11px 0",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 14.5,
                    fontWeight: p.unread > 0 ? 800 : 700,
                    color: C.tealDeep,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.nickname}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: p.unread > 0 ? C.text : C.textSoft,
                    fontWeight: p.unread > 0 ? 600 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {p.lastFromMe ? `Du: ${p.lastBody}` : p.lastBody}
                </span>
              </span>
              <span
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 11.5, color: C.textSoft }}>
                  {relTime(p.lastAt)}
                </span>
                {p.unread > 0 && (
                  <span
                    style={{
                      background: C.red,
                      color: "#fff",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      minWidth: 18,
                      height: 18,
                      lineHeight: "18px",
                      padding: "0 5px",
                      textAlign: "center",
                    }}
                  >
                    {p.unread > 99 ? "99+" : p.unread}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.tealDeep,
              margin: "0 0 4px",
            }}
          >
            Alle Mitglieder
          </h3>
          {others.map((m, idx) => (
            <button
              key={m.submissionId}
              type="button"
              onClick={() =>
                setActive({ id: m.submissionId, nickname: m.nickname })
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                width: "100%",
                background: "none",
                border: "none",
                borderTop: idx === 0 ? "none" : `1px solid ${C.tealPale}`,
                padding: "11px 0",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: C.tealDeep,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.nickname}
              </span>
              <span style={{ fontSize: 13, color: C.textSoft, flexShrink: 0 }}>
                Nachricht schreiben →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Konversation — Bubbles + Tages-Trenner + 5s-Polling + feste Sende-Box.
// ---------------------------------------------------------------------------

function Conversation({ api, partner, onBack, onRead }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const cursorRef = useRef(null);
  const bottomRef = useRef(null);

  // Bekannte Nachrichten-ids als Ref — die Dedupe-Quelle liegt AUSSERHALB
  // des setState-Updaters, damit appendMessages synchron zurückgeben kann,
  // welche Nachrichten wirklich neu waren: der Poll stempelt markRead nur
  // bei ECHTEN neuen Partner-Nachrichten, nicht bei weg-dedupten Re-Fetches.
  const knownIdsRef = useRef(new Set());

  // Neue Nachrichten anhängen (Dedupe über id — der Poll kann die eigene,
  // optimistisch angehängte Nachricht erneut liefern). Gibt die tatsächlich
  // angehängten Nachrichten zurück.
  const appendMessages = useCallback((incoming) => {
    const fresh = (incoming || []).filter(
      (m) => !knownIdsRef.current.has(m.id)
    );
    if (!fresh.length) return [];
    for (const m of fresh) knownIdsRef.current.add(m.id);
    setMessages((prev) => [...prev, ...fresh]);
    return fresh;
  }, []);

  const markRead = useCallback(() => {
    api("/community/chat", {
      method: "PATCH",
      body: { with: partner.id },
    }).catch(() => {
      // still — der nächste Öffnen-/Poll-Zyklus stempelt nach
    });
    onRead(partner.id);
  }, [api, partner.id, onRead]);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api(`/community/chat?with=${partner.id}`);
      const initial = data.messages || [];
      knownIdsRef.current = new Set(initial.map((m) => m.id));
      setMessages(initial);
      cursorRef.current = data.cursor || null;
      setLoading(false);
      markRead();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [api, partner.id, markRead]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // 5s-Polling mit since-Cursor: nur neuere Nachrichten anhängen.
  useEffect(() => {
    if (loading || error) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const since = cursorRef.current;
        const data = await api(
          `/community/chat?with=${partner.id}${
            since ? `&since=${encodeURIComponent(since)}` : ""
          }`
        );
        if (data.messages?.length) {
          const fresh = appendMessages(data.messages);
          cursorRef.current = data.cursor || cursorRef.current;
          // Nur bei WIRKLICH neuen Partner-Nachrichten stempeln — sonst
          // würde jeder re-fetchte Poll ein markRead-PATCH hinterherschicken.
          if (fresh.some((m) => !m.fromMe)) markRead();
        }
      } catch {
        // Poll-Fehler still — nächster Tick versucht es erneut
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [api, partner.id, loading, error, appendMessages, markRead]);

  // Ans Ende scrollen, wenn Nachrichten dazukommen.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const bodyText = text.trim();
    if (!bodyText || sending) return;
    setSending(true);
    setSendError("");
    try {
      const data = await api("/community/chat", {
        method: "POST",
        body: { to: partner.id, body: bodyText },
      });
      appendMessages([data.message]);
      setText("");
      // Cursor NICHT auf die eigene Nachricht vorziehen — dazwischen
      // eingetroffene fremde Nachrichten holt der nächste Poll (Dedupe).
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const report = async () => {
    setMenuOpen(false);
    try {
      await api("/community/report", {
        method: "POST",
        body: { kind: "member", targetId: partner.id },
      });
      setReported(true);
    } catch (err) {
      setSendError(err.message);
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Kopf: zurück + Nickname + ⋯-Melden */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Zurück zur Chat-Liste"
          style={{
            background: "none",
            border: "none",
            padding: "4px 8px 4px 0",
            fontSize: 18,
            fontWeight: 800,
            color: C.tealDeep,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 16,
            fontWeight: 800,
            color: C.tealDeep,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {partner.nickname}
        </span>
        <span style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Mehr Optionen"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              padding: "2px 6px",
              fontSize: 18,
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
                padding: "10px 16px",
                fontSize: 14,
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
      </div>

      {reported && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.tealDeep,
            textAlign: "center",
          }}
        >
          Danke, wir schauen uns das an.
        </div>
      )}

      {loading ? (
        <LoadingCard />
      ) : error ? (
        <ErrorCard text={error} onRetry={load} />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                fontSize: 13.5,
                color: C.textSoft,
                padding: "18px 0",
              }}
            >
              Noch keine Nachrichten — schreib die erste!
            </div>
          )}
          {messages.map((m, idx) => {
            // Tages-Trenner: Berlin-Datum mit dem Vorgänger vergleichen
            // (pur pro Element — keine Mutation während des Renderns).
            const day = fmtBerlinDate(m.createdAt);
            const showDay =
              idx === 0 || day !== fmtBerlinDate(messages[idx - 1].createdAt);
            return (
              <div key={m.id}>
                {showDay && (
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: C.textSoft,
                      margin: "10px 0 6px",
                    }}
                  >
                    {day}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: m.fromMe ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "9px 12px",
                      borderRadius: 14,
                      fontSize: 15,
                      lineHeight: 1.45,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      ...(m.fromMe
                        ? {
                            background: C.teal,
                            color: "#fff",
                            borderBottomRightRadius: 4,
                          }
                        : {
                            background: "#fff",
                            border: `1px solid ${C.line}`,
                            color: C.text,
                            borderBottomLeftRadius: 4,
                          }),
                    }}
                  >
                    {m.body}
                    <div
                      style={{
                        fontSize: 10.5,
                        marginTop: 3,
                        textAlign: "right",
                        color: m.fromMe ? "rgba(255,255,255,0.75)" : C.textSoft,
                      }}
                    >
                      {fmtBerlinTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
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

      {/* Platzhalter, damit die fixierte Sende-Box nichts verdeckt */}
      <div style={{ height: 56 }} />

      {/* Fixierte Sende-Box oberhalb der Tab-Bar */}
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
            maxLength={2000}
            placeholder="Deine Nachricht …"
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
