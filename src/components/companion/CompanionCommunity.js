"use client";

// CompanionCommunity — Container/Router des Community-Tabs (Stufe 6).
// Entscheidet beim Mount über /me zwischen Join-Screen und Feed (nickname +
// community_joined_at kommen dort mit — kein extra Roundtrip nötig), hält
// die schlanke Unter-Navigation (Feed | Chat) und rendert auf JEDEM Sub-View
// den Pflicht-Fußtext "Austausch unter Patienten — ersetzt keine ärztliche
// Beratung." — zusätzlich zum globalen Disclaimer der Shell.
//
// Wie alle Patienten-Komponenten: inline Styles, kein Tailwind, Du-Anrede,
// KEINE Supabase-Imports — nur die /api/companion-Routen über die api-Props.

import { useCallback, useEffect, useState } from "react";
import { C } from "@/components/companion/companionUi";
import { LoadingCard, ErrorCard } from "@/components/companion/CompanionHeute";
import CommunityJoin from "@/components/companion/CommunityJoin";
import CommunityFeed from "@/components/companion/CommunityFeed";
import CommunityPost from "@/components/companion/CommunityPost";
import CommunityChat from "@/components/companion/CommunityChat";

export default function CompanionCommunity({
  api,
  apiUpload,
  unread,
  onUnreadChange,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  // 'feed' | 'chat' | { post } (Detailansicht mit dem Feed-Post-Objekt)
  const [view, setView] = useState("feed");

  const load = useCallback(async () => {
    setError("");
    try {
      const me = await api("/me");
      setJoined(Boolean(me.nickname && me.community_joined_at));
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

  let content = null;
  if (loading) {
    content = <LoadingCard />;
  } else if (error) {
    content = <ErrorCard text={error} onRetry={load} />;
  } else if (!joined) {
    content = (
      <CommunityJoin
        api={api}
        onJoined={() => {
          setJoined(true);
          setView("feed");
        }}
      />
    );
  } else if (view === "chat") {
    content = <CommunityChat api={api} onUnreadChange={onUnreadChange} />;
  } else if (view && typeof view === "object" && view.post) {
    content = (
      <CommunityPost
        api={api}
        post={view.post}
        onBack={() => setView("feed")}
      />
    );
  } else {
    content = (
      <CommunityFeed
        api={api}
        apiUpload={apiUpload}
        onOpenPost={(post) => setView({ post })}
      />
    );
  }

  const showSubNav = !loading && !error && joined && typeof view === "string";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {showSubNav && (
        <div style={{ display: "flex", gap: 8 }}>
          <SubTab
            label="Feed"
            active={view === "feed"}
            onClick={() => setView("feed")}
          />
          <SubTab
            label="Chat"
            active={view === "chat"}
            dot={unread > 0}
            onClick={() => setView("chat")}
          />
        </div>
      )}

      {content}

      {/* Pflicht-Fußtext auf JEDEM Community-Screen (zusätzlich zum globalen
          Disclaimer der Shell). */}
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          lineHeight: 1.5,
          color: C.textSoft,
          padding: "4px 16px 0",
        }}
      >
        Austausch unter Patienten — ersetzt keine ärztliche Beratung.
      </div>
    </div>
  );
}

function SubTab({ label, active, dot, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        flex: 1,
        position: "relative",
        background: active ? C.teal : "#fff",
        color: active ? "#fff" : C.tealDeep,
        border: `1.5px solid ${active ? C.teal : C.line}`,
        borderRadius: 999,
        padding: "9px 12px",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
      {dot && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 12,
            width: 9,
            height: 9,
            borderRadius: 999,
            background: C.red,
          }}
        />
      )}
    </button>
  );
}
