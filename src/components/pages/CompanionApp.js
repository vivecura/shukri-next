"use client";

// CompanionApp — die Client-Shell der Patienten-App (ViveCura Companion,
// Stufe 2). Eine Route, vier Tabs, Zustand komplett clientseitig.
//
// Architektur-Invarianten:
//   * Diese Komponente (und alles unter components/companion/) importiert
//     NIEMALS supabaseClient oder companionServer — der Patient spricht
//     ausschließlich mit den eigenen /api/companion-Routen (Cookie-Session,
//     same-origin fetch).
//   * Auth-State-Machine: loading → login → app. Jede 401-Antwort einer
//     Datenroute wirft zurück auf den Login (Session abgelaufen, Zugang
//     deaktiviert oder Einwilligung widerrufen — requireSession prüft das
//     serverseitig bei JEDEM Request).
//   * Styling: helle Teal-Töne der Anamnese, inline Styles + ein kleiner
//     <style>-Tag (Pop-Animation, Slider) — kein Tailwind (Haus-Idiom der
//     Patienten-Formulare). Durchgehend Du-Anrede.

import { useCallback, useEffect, useRef, useState } from "react";
import CompanionLogin from "@/components/companion/CompanionLogin";
import CompanionHeute, {
  LoadingCard,
  ErrorCard,
} from "@/components/companion/CompanionHeute";
import CompanionCheckin from "@/components/companion/CompanionCheckin";
import CompanionPlan from "@/components/companion/CompanionPlan";
import CompanionVerlauf from "@/components/companion/CompanionVerlauf";
import CompanionCommunity from "@/components/companion/CompanionCommunity";
import {
  C,
  cardStyle,
  sectionTitle,
  Disclaimer,
  fmtDate,
  CHECKIN_SCALES,
} from "@/components/companion/companionUi";

const FALLBACK_ERROR =
  "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.";

// Ein fetch-Helfer für alle Datenrouten: same-origin (Cookie fährt mit),
// JSON rein/raus, deutsche Fehlertexte der API wörtlich nach oben.
async function apiFetch(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api/companion${path}`, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // kein JSON — generischer Fehler unten
  }
  if (!res.ok) {
    const err = new Error(data?.error || FALLBACK_ERROR);
    err.status = res.status;
    throw err;
  }
  return data || {};
}

const TABS = [
  { id: "heute", label: "Heute", emoji: "☀️" },
  { id: "tagebuch", label: "Tagebuch", emoji: "📖" },
  { id: "plan", label: "Mein Plan", emoji: "📋" },
  { id: "verlauf", label: "Verlauf", emoji: "📈" },
  { id: "community", label: "Community", emoji: "👥" },
];

export default function CompanionApp() {
  const [phase, setPhase] = useState("loading"); // loading | login | app
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("heute");
  const [unreadChat, setUnreadChat] = useState(0); // Badge am Community-Tab
  const bootRef = useRef(false); // Strict-Mode-Doppel-Effekt abfangen

  // Datenrouten-Helfer: 401 (Session weg / Zugang gesperrt / Widerruf) →
  // sauber zurück auf den Login.
  const api = useCallback(async (path, opts) => {
    try {
      return await apiFetch(path, opts);
    } catch (err) {
      if (err.status === 401) {
        setMe(null);
        setPhase("login");
      }
      throw err;
    }
  }, []);

  // Upload-Helfer für multipart (Community-Beiträge mit Fotos/Videos):
  // identisch zu apiFetch, aber body = FormData und OHNE Content-Type-Header —
  // die multipart-Boundary setzt der Browser selbst.
  const apiUpload = useCallback(async (path, formData) => {
    const res = await fetch(`/api/companion${path}`, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // kein JSON (z. B. 413 vom Edge) — generischer Fehler unten
    }
    if (!res.ok) {
      if (res.status === 401) {
        setMe(null);
        setPhase("login");
      }
      const err = new Error(data?.error || FALLBACK_ERROR);
      err.status = res.status;
      throw err;
    }
    return data || {};
  }, []);

  // Ungelesen-Badge: alle 20s die Inbox pollen, aber nur solange die App
  // sichtbar ist. 403 (noch nicht beigetreten) und alle Fehler → still 0.
  useEffect(() => {
    if (phase !== "app") return;
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const data = await apiFetch("/community/inbox");
        if (!cancelled) setUnreadChat(data.totalUnread || 0);
      } catch {
        if (!cancelled) setUnreadChat(0);
      }
    };
    tick();
    const timer = setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [phase]);

  // Boot: Session-Probe über /me — gibt es ein gültiges Cookie, geht es
  // direkt in die App, sonst zum Login.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    (async () => {
      try {
        const data = await apiFetch("/me");
        setMe(data);
        setPhase("app");
      } catch {
        setPhase("login");
      }
    })();
  }, []);

  // Ruhiger Teal-Verlauf als Body-Hintergrund (Anamnese-Idiom), mit Cleanup.
  useEffect(() => {
    const body = document.body;
    const prev = {
      backgroundColor: body.style.backgroundColor,
      backgroundImage: body.style.backgroundImage,
      backgroundAttachment: body.style.backgroundAttachment,
    };
    body.style.backgroundColor = C.bg;
    body.style.backgroundImage = `radial-gradient(ellipse at 50% 0%, ${C.tealPale} 0%, ${C.bg} 55%)`;
    body.style.backgroundAttachment = "fixed";
    return () => {
      body.style.backgroundColor = prev.backgroundColor;
      body.style.backgroundImage = prev.backgroundImage;
      body.style.backgroundAttachment = prev.backgroundAttachment;
    };
  }, []);

  const handleLoggedIn = useCallback(async () => {
    try {
      const data = await apiFetch("/me");
      setMe(data);
      setTab("heute");
      setPhase("app");
    } catch {
      setPhase("login");
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch("/logout", { method: "POST", body: {} });
    } catch {
      // Cookie löschen scheitert praktisch nie — Login zeigen wir trotzdem.
    }
    setMe(null);
    setTab("heute");
    setPhase("login");
  }, []);

  return (
    <div style={{ minHeight: "100vh", color: C.text, fontSize: 16 }}>
      <GlobalStyles />

      {phase === "loading" && (
        <div
          className="companion-pulse"
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.tealSoft,
            fontWeight: 700,
          }}
        >
          ViveCura Companion lädt …
        </div>
      )}

      {phase === "login" && <CompanionLogin onSuccess={handleLoggedIn} />}

      {phase === "app" && me && (
        <>
          <div
            style={{
              maxWidth: 480,
              margin: "0 auto",
              padding:
                "14px 16px calc(96px + env(safe-area-inset-bottom))",
            }}
          >
            {/* Kopf */}
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "6px 2px 16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    color: C.tealSoft,
                    fontWeight: 800,
                  }}
                >
                  ViveCura Companion
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.tealDeep }}>
                  Hallo {me.vorname || "du"}!
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: `1.5px solid ${C.line}`,
                  borderRadius: 10,
                  color: C.textSoft,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "7px 11px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Abmelden
              </button>
            </header>

            {/* Tab-Inhalt: nur der aktive Tab ist gemountet und lädt frisch */}
            {tab === "heute" && <CompanionHeute api={api} />}
            {tab === "tagebuch" && <TagebuchTab api={api} />}
            {tab === "plan" && <CompanionPlan api={api} />}
            {tab === "verlauf" && <CompanionVerlauf api={api} />}
            {tab === "community" && (
              <CompanionCommunity
                api={api}
                apiUpload={apiUpload}
                unread={unreadChat}
                onUnreadChange={setUnreadChat}
              />
            )}

            <Disclaimer />
          </div>

          {/* Feste Tab-Bar unten (safe-area-fähig) */}
          <nav
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(8px)",
              borderTop: `1px solid ${C.line}`,
              zIndex: 50,
            }}
          >
            <div
              style={{
                maxWidth: 480,
                margin: "0 auto",
                display: "flex",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={active ? "page" : undefined}
                    style={{
                      flex: 1,
                      position: "relative",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "9px 4px 10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      color: active ? C.tealDeep : C.textSoft,
                      fontWeight: active ? 800 : 600,
                      fontSize: 11.5,
                      borderTop: active
                        ? `2.5px solid ${C.teal}`
                        : "2.5px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{t.emoji}</span>
                    {t.label}
                    {t.id === "community" && unreadChat > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: "calc(50% + 8px)",
                          background: C.red,
                          color: "#fff",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 800,
                          minWidth: 16,
                          height: 16,
                          lineHeight: "16px",
                          padding: "0 4px",
                          textAlign: "center",
                        }}
                      >
                        {unreadChat > 99 ? "99+" : unreadChat}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tagebuch-Tab: heutiger Eintrag (edit-today) + Vorschau der letzten Einträge.
// Lokal in der Shell, weil er nur zwei bestehende Routen kombiniert.
// ---------------------------------------------------------------------------

function TagebuchTab({ api }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkin, setCheckin] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [recent, setRecent] = useState([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [today, verlauf] = await Promise.all([
        api("/today"),
        api("/verlauf"),
      ]);
      setCheckin(today.checkin);
      setSymptoms(today.symptoms || []);
      setRecent((verlauf.checkins || []).slice(0, 7));
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
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Dein Eintrag für heute</h3>
        <CompanionCheckin
          api={api}
          initial={checkin}
          symptoms={symptoms}
          onSaved={(c) => {
            setCheckin(c);
            // Vorschau lokal nachziehen (heutiger Eintrag nach oben).
            setRecent((prev) => {
              const rest = prev.filter(
                (r) => r.checkin_date !== c.checkin_date
              );
              return [c, ...rest].slice(0, 7);
            });
          }}
        />
      </div>

      {recent.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ ...sectionTitle, fontSize: 15 }}>Letzte Einträge</h3>
          {recent.map((c, idx) => (
            <div
              key={c.id || c.checkin_date}
              style={{
                padding: "10px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${C.tealPale}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tealDeep }}>
                  {fmtDate(c.checkin_date)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: C.textSoft,
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  {CHECKIN_SCALES.map((s) =>
                    c[s.key] != null ? `${s.label} ${c[s.key]}` : null
                  )
                    .filter(Boolean)
                    .join(" · ") || "ohne Werte"}
                </span>
              </div>
              {String(c.notes || "").trim() && (
                <div
                  style={{
                    fontSize: 13.5,
                    color: C.text,
                    marginTop: 4,
                    lineHeight: 1.5,
                    whiteSpace: "pre-line",
                  }}
                >
                  {String(c.notes).trim()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Globale Kleinstyles: Pop-Animation fürs Abhaken, Lade-Puls, Slider-Feinschliff.
// Bewusst ein einziger kleiner <style>-Tag statt Tailwind (Patienten-Idiom).
// ---------------------------------------------------------------------------

function GlobalStyles() {
  return (
    <style>{`
      @keyframes companionPop {
        0% { transform: scale(1); }
        45% { transform: scale(1.22); }
        100% { transform: scale(1); }
      }
      .companion-pop { animation: companionPop 0.32s ease; }

      @keyframes companionPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }
      .companion-pulse { animation: companionPulse 1.4s ease-in-out infinite; }

      input.companion-slider {
        -webkit-appearance: none;
        appearance: none;
        height: 26px;
        background: transparent;
        margin: 4px 0 2px;
      }
      input.companion-slider::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 3px;
        background: ${C.tealPale};
      }
      input.companion-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${C.teal};
        border: 3px solid #fff;
        box-shadow: 0 1px 4px rgba(31, 110, 112, 0.35);
        margin-top: -9px;
      }
      input.companion-slider::-moz-range-track {
        height: 6px;
        border-radius: 3px;
        background: ${C.tealPale};
      }
      input.companion-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${C.teal};
        border: 3px solid #fff;
        box-shadow: 0 1px 4px rgba(31, 110, 112, 0.35);
      }
    `}</style>
  );
}
