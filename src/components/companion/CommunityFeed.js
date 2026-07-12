"use client";

// CommunityFeed — Composer (Text + bis zu 4 Fotos/Videos) und der Feed der
// Praxis-Community. Autoren erscheinen NUR unter Nickname; eigene Beiträge
// tragen ein "Du"-Chip. Jeder fremde Beitrag hat ein ⋯-Menü mit "Melden".
//
// Medien-Upload, zwei Wege:
//   * klein (Summe ≤ ~3,5 MB): multipart direkt an /community/post
//   * groß ODER 413 vom Vercel-Body-Limit: signierte Direkt-Upload-URLs
//     über /community/upload-url, dann PUT zu Supabase Storage, dann
//     /community/post als JSON mit den Pfaden (Server re-verifiziert alles).
// Die Limits hier SPIEGELN nur den Server (companionCommunity.js) — die
// Wahrheit lebt dort.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  C,
  cardStyle,
  ghostBtn,
  primaryBtn,
  fmtBerlinDate,
} from "@/components/companion/companionUi";
import { LoadingCard, ErrorCard } from "@/components/companion/CompanionHeute";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 60 * 1024 * 1024;
const MAX_FILES = 4;
// Oberhalb dieser Gesamtgröße gar nicht erst multipart versuchen (Vercel-
// Serverless-Bodies enden bei ~4,5 MB) — direkt der upload-url-Zwei-Schritt.
const MULTIPART_TOTAL_MAX = 3.5 * 1024 * 1024;

// Relative deutsche Zeitangabe: "gerade eben" / "vor 12 Min." / "vor 3 Std."
// / sonst Datum (Europe/Berlin). Wird auch von CommunityPost/-Chat genutzt.
export function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `vor ${h} Std.`;
  return fmtBerlinDate(iso);
}

export default function CommunityFeed({ api, apiUpload, onOpenPost }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (p = 0) => {
      setError("");
      if (p > 0) setLoadingMore(true);
      try {
        const data = await api(`/community/feed?page=${p}`);
        // Dedupe beim Anhängen (gleiches Muster wie appendMessages im Chat):
        // kommt zwischen zwei Seiten ein neuer Beitrag oben dazu, verschieben
        // sich die Seitengrenzen — ohne Dedupe stünde derselbe Beitrag doppelt
        // in der Liste (doppelte React-Keys).
        setPosts((prev) => {
          if (p === 0) return data.posts;
          const known = new Set(prev.map((post) => post.id));
          return [
            ...prev,
            ...data.posts.filter((post) => !known.has(post.id)),
          ];
        });
        setHasMore(Boolean(data.hasMore));
        setPage(p);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      } finally {
        setLoadingMore(false);
      }
    },
    [api]
  );

  useEffect(() => {
    (async () => {
      await load(0);
    })();
  }, [load]);

  if (loading) return <LoadingCard />;
  if (error && posts.length === 0)
    return <ErrorCard text={error} onRetry={() => load(0)} />;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Composer
        api={api}
        apiUpload={apiUpload}
        onPosted={(post) => setPosts((prev) => [post, ...prev])}
      />

      {posts.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            color: C.textSoft,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Noch keine Beiträge — teile als Erste oder Erster etwas mit der
          Community!
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            api={api}
            onOpenComments={() => onOpenPost(post)}
          />
        ))
      )}

      {hasMore && (
        <button
          type="button"
          style={{ ...ghostBtn, opacity: loadingMore ? 0.6 : 1 }}
          disabled={loadingMore}
          onClick={() => load(page + 1)}
        >
          {loadingMore ? "Lädt …" : "Mehr laden"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composer — Textarea + Foto/Video-Anhänge mit Vorschau und ✕-Entfernen.
// ---------------------------------------------------------------------------

function Composer({ api, apiUpload, onPosted }) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]); // [{file, url, kind}]
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Objekt-URLs beim Unmount freigeben (beim Entfernen einzeln, s. unten).
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(
    () => () => {
      for (const a of attachmentsRef.current) URL.revokeObjectURL(a.url);
    },
    []
  );

  const addFiles = (fileList) => {
    setError("");
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setAttachments((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          setError("Maximal 4 Fotos/Videos pro Beitrag.");
          break;
        }
        const type = String(file.type || "").toLowerCase();
        if (IMAGE_TYPES.includes(type)) {
          if (file.size > IMAGE_MAX_BYTES) {
            setError("Fotos dürfen maximal 10 MB groß sein.");
            continue;
          }
          next.push({ file, url: URL.createObjectURL(file), kind: "image" });
        } else if (VIDEO_TYPES.includes(type)) {
          if (file.size > VIDEO_MAX_BYTES) {
            setError("Videos dürfen maximal 60 MB groß sein.");
            continue;
          }
          next.push({ file, url: URL.createObjectURL(file), kind: "video" });
        } else {
          setError(
            "Dieses Dateiformat wird nicht unterstützt (Fotos: JPG, PNG, WebP, HEIC — Videos: MP4, MOV, WebM)."
          );
        }
      }
      return next;
    });
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Großer Weg: signierte Upload-URLs holen, Dateien direkt zu Supabase
  // Storage PUTten, dann den Beitrag als JSON mit den Pfaden anlegen.
  const postViaUploadUrls = async (bodyText, items) => {
    const { uploads } = await api("/community/upload-url", {
      method: "POST",
      body: {
        files: items.map((a) => ({ type: a.file.type, size: a.file.size })),
      },
    });
    for (let i = 0; i < uploads.length; i++) {
      const res = await fetch(uploads[i].signedUrl, {
        method: "PUT",
        headers: { "Content-Type": items[i].file.type },
        body: items[i].file,
      });
      if (!res.ok) {
        throw new Error(
          "Da ist etwas schiefgelaufen. Bitte versuche es später erneut."
        );
      }
    }
    return api("/community/post", {
      method: "POST",
      body: { body: bodyText, media: uploads.map((u) => u.path) },
    });
  };

  const submit = async () => {
    const bodyText = text.trim();
    if (!bodyText && attachments.length === 0) return;
    setPosting(true);
    setError("");
    try {
      const totalBytes = attachments.reduce((s, a) => s + a.file.size, 0);
      let data;
      if (attachments.length > 0 && totalBytes > MULTIPART_TOTAL_MAX) {
        data = await postViaUploadUrls(bodyText, attachments);
      } else {
        try {
          const fd = new FormData();
          fd.append("body", bodyText);
          for (const a of attachments) fd.append("files", a.file, a.file.name);
          data = await apiUpload("/community/post", fd);
        } catch (err) {
          // Vercel-Body-Limit → auf den signierten Direkt-Upload umschalten.
          if (err.status === 413 && attachments.length > 0) {
            data = await postViaUploadUrls(bodyText, attachments);
          } else {
            throw err;
          }
        }
      }
      for (const a of attachments) URL.revokeObjectURL(a.url);
      setAttachments([]);
      setText("");
      onPosted(data.post);
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const disabled = posting || (!text.trim() && attachments.length === 0);

  return (
    <div style={cardStyle}>
      <textarea
        value={text}
        maxLength={2000}
        placeholder="Was möchtest du teilen?"
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#fff",
          border: `1.5px solid ${C.line}`,
          borderRadius: 12,
          padding: "12px 13px",
          fontSize: 16,
          color: C.text,
          outline: "none",
          resize: "vertical",
          fontFamily: "inherit",
          lineHeight: 1.5,
        }}
      />

      {attachments.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          {attachments.map((a, idx) => (
            <div key={a.url} style={{ position: "relative" }}>
              {a.kind === "video" ? (
                <video
                  src={a.url}
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    width: 76,
                    height: 76,
                    objectFit: "cover",
                    borderRadius: 10,
                    background: "#000",
                  }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt=""
                  style={{
                    width: 76,
                    height: 76,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              )}
              <button
                type="button"
                aria-label="Anhang entfernen"
                onClick={() => removeAttachment(idx)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: "none",
                  background: C.tealDeep,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: "22px",
                  textAlign: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p
          style={{
            fontSize: 13,
            color: C.red,
            fontWeight: 600,
            lineHeight: 1.5,
            margin: "10px 0 0",
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
        }}
      >
        <label
          style={{
            border: `1.5px solid ${C.line}`,
            borderRadius: 12,
            padding: "9px 13px",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            background: "#fff",
          }}
          aria-label="Foto hinzufügen"
        >
          📷
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              if (photoInputRef.current) photoInputRef.current.value = "";
            }}
          />
        </label>
        <label
          style={{
            border: `1.5px solid ${C.line}`,
            borderRadius: 12,
            padding: "9px 13px",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            background: "#fff",
          }}
          aria-label="Video hinzufügen"
        >
          🎥
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              if (videoInputRef.current) videoInputRef.current.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          style={{
            ...primaryBtn,
            flex: 1,
            width: "auto",
            padding: "11px 16px",
            fontSize: 15,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          {posting ? "Wird gepostet …" : "Posten"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostCard — EIN Rendering für Feed UND Detailansicht (CommunityPost
// importiert sie). Enthält Medien-Grid, Bild-Lightbox und das Melden-Menü.
// ---------------------------------------------------------------------------

export function PostCard({ post, api, onOpenComments }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState("");
  const [lightbox, setLightbox] = useState(null);

  const report = async () => {
    setMenuOpen(false);
    setReportError("");
    try {
      await api("/community/report", {
        method: "POST",
        body: { kind: "post", targetId: post.id },
      });
      setReported(true);
    } catch (err) {
      setReportError(err.message);
    }
  };

  const media = Array.isArray(post.media) ? post.media : [];
  const countLabel =
    post.commentCount === 1 ? "1 Antwort" : `${post.commentCount} Antworten`;

  return (
    <div style={cardStyle}>
      {/* Kopf: Nickname (+ Du-Chip) und relative Zeit */}
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
            fontSize: 14.5,
            fontWeight: 800,
            color: C.tealDeep,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {post.nickname}
          {post.isMine && (
            <span
              style={{
                marginLeft: 6,
                background: C.tealPale,
                color: C.tealDeep,
                borderRadius: 999,
                padding: "1px 8px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Du
            </span>
          )}
        </span>
        <span style={{ fontSize: 12, color: C.textSoft, flexShrink: 0 }}>
          {relTime(post.createdAt)}
        </span>
      </div>

      {/* Text */}
      {String(post.body || "").trim() && (
        <div
          style={{
            fontSize: 15,
            color: C.text,
            lineHeight: 1.55,
            marginTop: 8,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {post.body}
        </div>
      )}

      {/* Medien-Grid (signierte URLs, 1h TTL) */}
      {media.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: media.length === 1 ? "1fr" : "1fr 1fr",
            gap: 6,
            marginTop: 10,
          }}
        >
          {media.map((m, i) =>
            m.type === "video" ? (
              <video
                key={i}
                src={m.url}
                controls
                playsInline
                preload="metadata"
                style={{
                  width: "100%",
                  maxHeight: 260,
                  borderRadius: 10,
                  background: "#000",
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={m.url}
                alt=""
                onClick={() => setLightbox(m.url)}
                style={{
                  width: "100%",
                  height: media.length === 1 ? 240 : 140,
                  objectFit: "cover",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              />
            )
          )}
        </div>
      )}

      {/* Fußzeile: Antworten + ⋯-Menü */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        {onOpenComments ? (
          <button
            type="button"
            onClick={onOpenComments}
            style={{
              background: "none",
              border: "none",
              padding: "4px 0",
              fontSize: 13.5,
              fontWeight: 700,
              color: C.tealSoft,
              cursor: "pointer",
            }}
          >
            💬 {countLabel}
          </button>
        ) : (
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.textSoft }}>
            💬 {countLabel}
          </span>
        )}

        {!post.isMine && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              aria-label="Mehr Optionen"
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                padding: "2px 8px",
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
          </div>
        )}
      </div>

      {reported && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 600,
            color: C.tealDeep,
          }}
        >
          Danke, wir schauen uns das an.
        </div>
      )}
      {reportError && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 600,
            color: C.red,
          }}
        >
          {reportError}
        </div>
      )}

      {/* Vollbild-Lightbox: Tippen schließt */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          role="button"
          aria-label="Bild schließen"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            cursor: "pointer",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
}
