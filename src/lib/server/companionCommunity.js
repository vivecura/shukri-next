// SERVER ONLY — nie in Client-Komponenten importieren (nutzt den Service-Key
// über companionServer!).
// ============================================================================
// companionCommunity.js — komplette Server-Logik der Companion-Community
// (Stufe 6): Beitritt (Nickname), Feed, Beiträge mit Fotos/Videos,
// Kommentare, Melden, Mitgliederliste, 1:1-Chat, Inbox.
//
// SICHERHEITS-GRENZE: der Service-Key umgeht RLS — deshalb gelten hier zwei
// harte Invarianten:
//   1. JEDE Query trägt .eq('practice_id', PRACTICE_ID); jede Lese-/Schreib-
//      Operation ist auf die submission_id der Session gescoped ODER wird
//      durch einen practice-gescopten Existenz-/Ownership-SELECT abgesichert
//      (parseSymptomScores-Muster aus checkin/route.js).
//   2. KLARNAMEN-VERBOT nach außen: Antworten enthalten NUR nickname +
//      submission_id (opake UUID) — nie vorname/nachname/email/patient_number.
//
// Medien liegen im PRIVATEN Bucket 'community' unter
// community/<submissionId>/<uuid>.<ext>; Patienten bekommen ausschließlich
// serverseitig signierte URLs (1h TTL).
// ============================================================================

import crypto from "node:crypto";
import {
  assertActionRateLimit,
  berlinToday,
  companionAdmin,
  insertCompanionAlert,
  jsonError,
  PRACTICE_ID,
} from "./companionServer";

const ERR_500 =
  "Da ist etwas schiefgelaufen. Bitte versuche es später erneut.";

const BUCKET = "community";
const SIGNED_URL_TTL_S = 3600;
const FEED_PAGE_SIZE = 20;
const CHAT_LIMIT = 200;
const INBOX_SCAN_LIMIT = 200;

// ---------------------------------------------------------------------------
// AKTIONS-BUDGETS — Best-Effort-Limiter aus companionServer (Map pro
// Lambda-Instanz, leer nach Cold Start; dokumentierte Einschränkung dort).
// Key ist IMMER die submission_id der Session. Beiträge und Kommentare
// teilen sich EIN Budget (gleicher Key), damit Spammer nicht einfach auf
// Kommentare ausweichen.
// ---------------------------------------------------------------------------
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const CONTENT_LIMIT_MSG =
  "Du hast in der letzten Stunde sehr viele Beiträge und Antworten geschrieben. Bitte mach eine kleine Pause und versuche es später erneut.";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// MEDIEN-WHITELIST — Server ist die Wahrheit, der Client spiegelt sie nur.
// Fotos: JPEG/PNG/WebP/HEIC bis 10 MB; Videos: MP4/MOV/WebM bis 60 MB;
// maximal 4 Dateien pro Beitrag.
// ---------------------------------------------------------------------------
const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};
const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 60 * 1024 * 1024;
const MAX_FILES_PER_POST = 4;
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "heic"]);
const VIDEO_EXTS = new Set(["mp4", "mov", "webm"]);

// MIME + Größe prüfen → { kind: 'image'|'video', ext } oder 400 (deutsch).
function validateMediaSpec(type, size) {
  const mime = String(type || "").toLowerCase();
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw jsonError(400, "Ungültige Anfrage.");
  }
  if (IMAGE_TYPES[mime]) {
    if (bytes > IMAGE_MAX_BYTES) {
      throw jsonError(400, "Fotos dürfen maximal 10 MB groß sein.");
    }
    return { kind: "image", ext: IMAGE_TYPES[mime] };
  }
  if (VIDEO_TYPES[mime]) {
    if (bytes > VIDEO_MAX_BYTES) {
      throw jsonError(400, "Videos dürfen maximal 60 MB groß sein.");
    }
    return { kind: "video", ext: VIDEO_TYPES[mime] };
  }
  throw jsonError(
    400,
    "Dieses Dateiformat wird nicht unterstützt (Fotos: JPG, PNG, WebP, HEIC — Videos: MP4, MOV, WebM)."
  );
}

// ---------------------------------------------------------------------------
// GEMEINSAME HELFER (intern)
// ---------------------------------------------------------------------------

function assertUuid(value) {
  if (!UUID_REGEX.test(String(value || ""))) {
    throw jsonError(400, "Ungültige Anfrage.");
  }
  return String(value);
}

// Batched Nickname-Auflösung: submission_id → nickname. Bewusst NUR diese
// beiden Spalten (Klarnamen-Verbot). Zugänge ohne Nickname (theoretisch nach
// Datenlöschung) erscheinen als "Ehemaliges Mitglied".
async function nicknameMap(submissionIds) {
  const unique = [...new Set(submissionIds)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await companionAdmin
    .from("companion_access")
    .select("submission_id, nickname")
    .eq("practice_id", PRACTICE_ID)
    .in("submission_id", unique);
  if (error) throw jsonError(500, ERR_500);
  const map = new Map();
  for (const row of data || []) {
    map.set(row.submission_id, row.nickname || "Ehemaliges Mitglied");
  }
  return map;
}

// Signierte URLs für Storage-Pfade (1h). Best effort: nicht signierbare
// Pfade (z. B. nach Löschung) fallen still aus der Map — der Feed soll an
// einem fehlenden Bild nie komplett scheitern.
async function signedUrlMap(paths) {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await companionAdmin.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_S);
  if (error) {
    console.error("companionCommunity: createSignedUrls fehlgeschlagen:", error);
    return new Map();
  }
  const map = new Map();
  for (const entry of data || []) {
    if (entry?.signedUrl && !entry.error) map.set(entry.path, entry.signedUrl);
  }
  return map;
}

// media-jsonb ([{path,type,size}]) → API-Form [{url,type}] über die URL-Map.
function mediaForClient(media, urlMap) {
  const out = [];
  for (const item of Array.isArray(media) ? media : []) {
    const url = urlMap.get(item?.path);
    if (url) out.push({ url, type: item.type === "video" ? "video" : "image" });
  }
  return out;
}

// Sichtbaren, practice-gescopten Beitrag laden — 404, wenn es ihn nicht gibt
// oder er ausgeblendet wurde (Moderation wirkt sofort).
async function getVisiblePost(postId) {
  assertUuid(postId);
  const { data, error } = await companionAdmin
    .from("companion_posts")
    .select("id, submission_id, body, media, created_at")
    .eq("practice_id", PRACTICE_ID)
    .eq("id", postId)
    .eq("hidden", false)
    .maybeSingle();
  if (error) throw jsonError(500, ERR_500);
  if (!data) throw jsonError(404, "Beitrag nicht gefunden.");
  return data;
}

// Chat-/Melde-Gegenüber prüfen: beigetreten + aktiv + kein Widerruf, gleiche
// Praxis. Gibt {submission_id, nickname} zurück oder wirft 404.
async function requireMemberTarget(otherId) {
  assertUuid(otherId);
  const { data, error } = await companionAdmin
    .from("companion_access")
    .select("submission_id, nickname")
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", otherId)
    .eq("active", true)
    .is("consent_revoked_at", null)
    .not("community_joined_at", "is", null)
    .maybeSingle();
  if (error) throw jsonError(500, ERR_500);
  if (!data || !data.nickname) {
    throw jsonError(404, "Dieses Mitglied ist nicht (mehr) in der Community.");
  }
  return data;
}

// ---------------------------------------------------------------------------
// MITGLIEDSCHAFTS-WÄCHTER — jede Community-Route außer /join ruft ihn direkt
// nach requireSession auf. requireSession garantiert bereits active=true und
// consent_revoked_at=null pro Request; hier kommt nur der Beitritt dazu.
// ---------------------------------------------------------------------------
export function requireCommunityMember(session) {
  const access = session?.access;
  if (!access?.community_joined_at || !access?.nickname) {
    throw jsonError(403, "Du bist der Community noch nicht beigetreten.");
  }
}

// ---------------------------------------------------------------------------
// BEITRITT — Nickname (2-24 druckbare Zeichen, keine Steuerzeichen) setzen
// und community_joined_at stempeln. Idempotent: wer schon Mitglied ist,
// bekommt seinen bestehenden Stand zurück. Unique-Index (practice, lower())
// → 23505 wird zur freundlichen 409.
//
// Härtung: der Nickname wird VOR allen Prüfungen NFKC-normalisiert (sonst
// unterläuft "Ｓhukri"/"ﬁ"-Tricks sowohl die Blockliste als auch den
// Unique-Check), und Praxis-/Rollen-Namen sind gesperrt (Impersonations-
// Schutz — niemand chattet als "Praxis" oder "Dr Shukri" mit Patienten).
// ---------------------------------------------------------------------------
const BLOCKED_NICKNAMES = [
  "shukri",
  "vivecura",
  "praxis",
  "admin",
  "arzt",
  "doktor",
  "dr",
  "moderator",
  "team",
  "support",
];

// Case-insensitiv NACH NFKC-Normalisierung: gesperrt ist der exakte Name
// ("Admin") ODER das Wort im Namen ("Dr Meier", "team-vivecura") — NICHT
// der bloße Substring ("Adrian" bleibt erlaubt).
function assertNicknameAllowed(nick) {
  const lower = nick.toLowerCase();
  const words = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const blocked of BLOCKED_NICKNAMES) {
    if (lower === blocked || words.includes(blocked)) {
      throw jsonError(
        400,
        "Diesen Namen kannst du nicht wählen — such dir bitte einen anderen aus."
      );
    }
  }
}

export async function joinCommunity(session, nickname) {
  const access = session.access;
  if (access.community_joined_at && access.nickname) {
    return {
      nickname: access.nickname,
      communityJoinedAt: access.community_joined_at,
    };
  }

  const nick = String(nickname ?? "").normalize("NFKC").trim();
  // \p{C} = Steuer-/Format-/unsichtbare Zeichen — alles andere ist erlaubt
  // (Umlaute, Emojis, Leerzeichen in der Mitte).
  if (nick.length < 2 || nick.length > 24 || /\p{C}/u.test(nick)) {
    throw jsonError(
      400,
      "Bitte wähle einen Nickname mit 2 bis 24 Zeichen (ohne Steuerzeichen)."
    );
  }
  assertNicknameAllowed(nick);

  const { data, error } = await companionAdmin
    .from("companion_access")
    .update({
      nickname: nick,
      community_joined_at: new Date().toISOString(),
    })
    .eq("practice_id", PRACTICE_ID)
    .eq("submission_id", session.submissionId)
    .select("nickname, community_joined_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw jsonError(
        409,
        "Dieser Nickname ist schon vergeben. Bitte wähle einen anderen."
      );
    }
    throw jsonError(500, ERR_500);
  }
  return {
    nickname: data.nickname,
    communityJoinedAt: data.community_joined_at,
  };
}

// ---------------------------------------------------------------------------
// FEED — 20 sichtbare Beiträge pro Seite (neueste zuerst), Autoren-Nicknames
// über EINEN batched Lookup, Kommentar-Zähler über EIN batched Select,
// Medien als signierte URLs. Rückgabe { posts, hasMore }.
// ---------------------------------------------------------------------------
export async function getFeed(session, page) {
  const p = Number.isInteger(page) && page > 0 ? page : 0;
  const from = p * FEED_PAGE_SIZE;

  // Eine Zeile mehr anfordern als angezeigt wird → hasMore ohne Extra-Count.
  const { data: rows, error } = await companionAdmin
    .from("companion_posts")
    .select("id, submission_id, body, media, created_at")
    .eq("practice_id", PRACTICE_ID)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .range(from, from + FEED_PAGE_SIZE);
  if (error) throw jsonError(500, ERR_500);

  const hasMore = (rows || []).length > FEED_PAGE_SIZE;
  const posts = (rows || []).slice(0, FEED_PAGE_SIZE);
  if (posts.length === 0) return { posts: [], hasMore: false };

  const postIds = posts.map((post) => post.id);
  const [nicknames, urlMap, countRes] = await Promise.all([
    nicknameMap(posts.map((post) => post.submission_id)),
    signedUrlMap(
      posts.flatMap((post) =>
        (Array.isArray(post.media) ? post.media : []).map((m) => m?.path)
      )
    ),
    companionAdmin
      .from("companion_comments")
      .select("post_id")
      .eq("practice_id", PRACTICE_ID)
      .eq("hidden", false)
      .in("post_id", postIds),
  ]);
  if (countRes.error) throw jsonError(500, ERR_500);
  const counts = new Map();
  for (const row of countRes.data || []) {
    counts.set(row.post_id, (counts.get(row.post_id) || 0) + 1);
  }

  return {
    posts: posts.map((post) => ({
      id: post.id,
      nickname: nicknames.get(post.submission_id) || "Ehemaliges Mitglied",
      isMine: post.submission_id === session.submissionId,
      body: post.body || "",
      media: mediaForClient(post.media, urlMap),
      createdAt: post.created_at,
      commentCount: counts.get(post.id) || 0,
    })),
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// BEITRAG ANLEGEN — zwei Wege für Medien:
//   * files:    File-Objekte aus multipart/form-data — Validierung (MIME,
//               Größe, Anzahl) VOR jedem Upload, dann Upload in den privaten
//               Bucket unter community/<submissionId>/<uuid>.<ext>.
//   * prePaths: bereits hochgeladene Storage-Pfade aus dem upload-url-Flow
//               (Vercel-Body-Limit ~4,5 MB) — jeder Pfad MUSS mit dem
//               eigenen Präfix beginnen und wird auf Existenz + Whitelist
//               re-geprüft, bevor er in den Beitrag wandert.
// ---------------------------------------------------------------------------
export async function createPost(session, body, files = [], prePaths = []) {
  const submissionId = session.submissionId;

  // Beiträge + Kommentare teilen sich EIN Budget: 30 pro Stunde.
  assertActionRateLimit(
    `community-content:${submissionId}`,
    30,
    HOUR_MS,
    CONTENT_LIMIT_MSG
  );

  const bodyText = String(body ?? "").trim();
  if (bodyText.length > 2000) {
    throw jsonError(400, "Der Beitrag ist zu lang (maximal 2000 Zeichen).");
  }

  const fileList = (Array.isArray(files) ? files : []).filter(
    (f) => f && typeof f === "object" && typeof f.arrayBuffer === "function"
  );
  const pathList = (Array.isArray(prePaths) ? prePaths : []).map((path) =>
    String(path || "")
  );

  if (bodyText.length === 0 && fileList.length === 0 && pathList.length === 0) {
    throw jsonError(
      400,
      "Bitte schreibe etwas oder füge ein Foto/Video hinzu."
    );
  }
  if (fileList.length + pathList.length > MAX_FILES_PER_POST) {
    throw jsonError(400, "Maximal 4 Fotos/Videos pro Beitrag.");
  }

  // 1) ALLE Datei-Specs prüfen, BEVOR irgendetwas hochgeladen wird — sonst
  //    liegen bei einem Mischfehler schon Teile im Bucket.
  const uploadPlan = fileList.map((file) => {
    const { kind, ext } = validateMediaSpec(file.type, file.size);
    return { file, kind, ext };
  });

  const media = [];
  const uploadedPaths = [];

  // 2) Uploads (multipart-Weg).
  for (const { file, kind, ext } of uploadPlan) {
    const path = `community/${submissionId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await companionAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (error) {
      console.error("companionCommunity: Upload fehlgeschlagen:", error);
      await cleanupPaths(uploadedPaths);
      throw jsonError(500, ERR_500);
    }
    uploadedPaths.push(path);
    media.push({ path, type: kind, size: file.size });
  }

  // 3) Vorab hochgeladene Pfade (upload-url-Weg) verifizieren: eigener
  //    Präfix, genau ein Pfad-Segment, Existenz im Bucket, Whitelist erneut.
  const ownPrefix = `community/${submissionId}/`;
  for (const path of pathList) {
    if (
      !path.startsWith(ownPrefix) ||
      path.includes("..") ||
      path.slice(ownPrefix.length).includes("/") ||
      path.slice(ownPrefix.length).length === 0
    ) {
      throw jsonError(400, "Ungültige Anfrage.");
    }
    const base = path.slice(ownPrefix.length);
    const ext = (base.split(".").pop() || "").toLowerCase();
    let kind;
    if (IMAGE_EXTS.has(ext)) kind = "image";
    else if (VIDEO_EXTS.has(ext)) kind = "video";
    else throw jsonError(400, "Ungültige Anfrage.");

    const { data: entries, error } = await companionAdmin.storage
      .from(BUCKET)
      .list(ownPrefix.slice(0, -1), { search: base, limit: 10 });
    if (error) throw jsonError(500, ERR_500);
    const entry = (entries || []).find((e) => e.name === base);
    if (!entry) throw jsonError(400, "Ungültige Anfrage.");

    // Größe/MIME aus den Storage-Metadaten re-prüfen. Fehlen die Metadaten,
    // wird HART abgelehnt — permissive Defaults würden die Whitelist für
    // direkt hochgeladene Bytes aushebeln (Bucket-Limits sind die zweite
    // Verteidigungslinie, diese Prüfung die erste).
    const size = Number(entry.metadata?.size);
    const mime = String(entry.metadata?.mimetype || "").toLowerCase();
    if (!Number.isFinite(size) || size <= 0 || !mime) {
      throw jsonError(400, "Ungültige Anfrage.");
    }
    validateMediaSpec(mime, size);
    media.push({ path, type: kind, size });
  }

  // 4) Beitrag einfügen.
  const { data: post, error: insErr } = await companionAdmin
    .from("companion_posts")
    .insert({
      practice_id: PRACTICE_ID,
      submission_id: submissionId,
      body: bodyText,
      media,
    })
    .select("id, submission_id, body, media, created_at")
    .single();
  if (insErr) {
    await cleanupPaths(uploadedPaths);
    throw jsonError(500, ERR_500);
  }

  const urlMap = await signedUrlMap(media.map((m) => m.path));
  return {
    id: post.id,
    nickname: session.access.nickname,
    isMine: true,
    body: post.body || "",
    media: mediaForClient(post.media, urlMap),
    createdAt: post.created_at,
    commentCount: 0,
  };
}

// Best-effort-Aufräumen bereits hochgeladener Dateien, wenn der Beitrag
// selbst scheitert — Fehler hier werden nur geloggt.
async function cleanupPaths(paths) {
  if (!paths.length) return;
  try {
    await companionAdmin.storage.from(BUCKET).remove(paths);
  } catch (e) {
    console.error("companionCommunity: Cleanup fehlgeschlagen:", e);
  }
}

// ---------------------------------------------------------------------------
// KOMMENTARE
// ---------------------------------------------------------------------------
export async function getComments(session, postId) {
  // Erst den Beitrag prüfen (sichtbar + practice-gescoped) — Kommentare
  // eines ausgeblendeten Beitrags sind ebenfalls unsichtbar.
  await getVisiblePost(postId);

  const { data: rows, error } = await companionAdmin
    .from("companion_comments")
    .select("id, submission_id, body, created_at")
    .eq("practice_id", PRACTICE_ID)
    .eq("post_id", postId)
    .eq("hidden", false)
    .order("created_at", { ascending: true });
  if (error) throw jsonError(500, ERR_500);

  const nicknames = await nicknameMap((rows || []).map((r) => r.submission_id));
  return (rows || []).map((row) => ({
    id: row.id,
    nickname: nicknames.get(row.submission_id) || "Ehemaliges Mitglied",
    isMine: row.submission_id === session.submissionId,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function addComment(session, postId, body) {
  // Beiträge + Kommentare teilen sich EIN Budget: 30 pro Stunde.
  assertActionRateLimit(
    `community-content:${session.submissionId}`,
    30,
    HOUR_MS,
    CONTENT_LIMIT_MSG
  );

  const bodyText = String(body ?? "").trim();
  if (bodyText.length < 1) {
    throw jsonError(400, "Bitte schreibe eine Antwort.");
  }
  if (bodyText.length > 1000) {
    throw jsonError(400, "Die Antwort ist zu lang (maximal 1000 Zeichen).");
  }

  await getVisiblePost(postId);

  const { data, error } = await companionAdmin
    .from("companion_comments")
    .insert({
      practice_id: PRACTICE_ID,
      post_id: postId,
      submission_id: session.submissionId,
      body: bodyText,
    })
    .select("id, body, created_at")
    .single();
  if (error) throw jsonError(500, ERR_500);

  return {
    id: data.id,
    nickname: session.access.nickname,
    isMine: true,
    body: data.body,
    createdAt: data.created_at,
  };
}

// ---------------------------------------------------------------------------
// MELDEN — polymorphes Ziel (post|comment|message|member). Existenz wird
// practice-gescoped in der jeweiligen Tabelle geprüft (member über
// companion_access, message zusätzlich nur, wenn der Melder selbst an der
// Nachricht beteiligt ist — fremde Konversationen sind nicht abfragbar).
// Nach dem Insert: roter Für-Shukri-Alert, dedupet pro (Melder, Berlin-Tag).
// ---------------------------------------------------------------------------
const REPORT_KINDS = {
  post: "Beitrag",
  comment: "Kommentar",
  message: "Nachricht",
  member: "Mitglied",
};

export async function reportTarget(session, kind, targetId, reason) {
  if (!REPORT_KINDS[kind]) throw jsonError(400, "Ungültige Anfrage.");
  assertUuid(targetId);
  assertActionRateLimit(
    `community-report:${session.submissionId}`,
    10,
    DAY_MS,
    "Du hast heute schon viele Meldungen geschickt. Bitte versuche es morgen erneut."
  );
  const reasonText = String(reason ?? "").trim();
  if (reasonText.length > 500) {
    throw jsonError(400, "Die Begründung ist zu lang (maximal 500 Zeichen).");
  }

  // Existenz-Check des Ziels in seiner Tabelle.
  let exists = false;
  if (kind === "post") {
    const { data, error } = await companionAdmin
      .from("companion_posts")
      .select("id")
      .eq("practice_id", PRACTICE_ID)
      .eq("id", targetId)
      .maybeSingle();
    if (error) throw jsonError(500, ERR_500);
    exists = !!data;
  } else if (kind === "comment") {
    const { data, error } = await companionAdmin
      .from("companion_comments")
      .select("id")
      .eq("practice_id", PRACTICE_ID)
      .eq("id", targetId)
      .maybeSingle();
    if (error) throw jsonError(500, ERR_500);
    exists = !!data;
  } else if (kind === "message") {
    const me = session.submissionId;
    const { data, error } = await companionAdmin
      .from("companion_messages")
      .select("id")
      .eq("practice_id", PRACTICE_ID)
      .eq("id", targetId)
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .maybeSingle();
    if (error) throw jsonError(500, ERR_500);
    exists = !!data;
  } else {
    // member: targetId ist die submission_id des gemeldeten Mitglieds.
    const { data, error } = await companionAdmin
      .from("companion_access")
      .select("submission_id")
      .eq("practice_id", PRACTICE_ID)
      .eq("submission_id", targetId)
      .maybeSingle();
    if (error) throw jsonError(500, ERR_500);
    exists = !!data;
  }
  if (!exists) throw jsonError(404, "Das gemeldete Element wurde nicht gefunden.");

  const { data: report, error: insErr } = await companionAdmin
    .from("companion_reports")
    .insert({
      practice_id: PRACTICE_ID,
      target_kind: kind,
      target_id: targetId,
      reporter_id: session.submissionId,
      reason: reasonText,
    })
    .select("id")
    .single();
  if (insErr) throw jsonError(500, ERR_500);

  // Rote Für-Shukri-Karte — best effort: die Meldung selbst ist gespeichert,
  // ein Alert-Fehler darf sie nicht mehr scheitern lassen. Dedupe-Marker ist
  // der Berlin-Tag ([checkin:<YYYY-MM-DD>|report]) — zusammen mit der
  // submission_id des MELDERS in der Dedupe-Query von insertCompanionAlert
  // entsteht so maximal EINE Karte pro (Melder, Berlin-Tag); eine Karte pro
  // Report-id wäre bei Melde-Spam selbst der Spam. Die einzelnen Meldungen
  // stehen vollständig im Admin unter Community.
  try {
    await insertCompanionAlert({
      submissionId: session.submissionId,
      patientNumber: session.access.patient_number,
      reason: "report",
      checkinId: berlinToday(),
    });
  } catch (e) {
    console.error("companionCommunity: Report-Alert fehlgeschlagen:", e);
  }

  return { id: report.id };
}

// ---------------------------------------------------------------------------
// MITGLIEDER — alle beigetretenen, aktiven, nicht widerrufenen Zugänge der
// Praxis. NUR submission_id + nickname (Klarnamen-Verbot).
// ---------------------------------------------------------------------------
export async function getMembers(session) {
  const { data, error } = await companionAdmin
    .from("companion_access")
    .select("submission_id, nickname")
    .eq("practice_id", PRACTICE_ID)
    .eq("active", true)
    .is("consent_revoked_at", null)
    .not("community_joined_at", "is", null)
    .not("nickname", "is", null)
    .order("nickname", { ascending: true });
  if (error) throw jsonError(500, ERR_500);

  return (data || []).map((row) => ({
    submissionId: row.submission_id,
    nickname: row.nickname,
    isSelf: row.submission_id === session.submissionId,
  }));
}

// ---------------------------------------------------------------------------
// 1:1-CHAT
// ---------------------------------------------------------------------------

// Konversation mit einem Mitglied — nur lesbar, weil ICH auf einer Seite
// jeder Zeile stehe (das OR bindet beide Richtungen an die Session).
// sinceIso = Cursor fürs 5s-Polling (nur neuere Nachrichten anhängen).
//
// Ohne Cursor kommen die NEUESTEN CHAT_LIMIT Nachrichten (absteigend geholt,
// in JS zurück auf aufsteigend gedreht) — aufsteigend + limit zeigte in
// langen Konversationen ewig nur die ältesten 200.
//
// Der Cursor wird NIE durch new Date().toISOString() gedreht: Postgres
// liefert Mikrosekunden, toISOString() nur Millisekunden — der Rundungs-
// verlust ließe .gt() die letzte Nachricht ewig re-fetchen (und den Client
// markRead spammen). Stattdessen: strenges Format prüfen, ORIGINAL-String
// in den Filter.
const SINCE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}T[0-9:.]+([+-]\d{2}:?\d{2}|Z)$/;

export async function getConversation(session, otherId, sinceIso) {
  const me = session.submissionId;
  const other = assertUuid(otherId);
  if (other === me) throw jsonError(400, "Ungültige Anfrage.");
  await requireMemberTarget(other);

  let query = companionAdmin
    .from("companion_messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("practice_id", PRACTICE_ID)
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`
    );
  if (sinceIso) {
    if (!SINCE_ISO_REGEX.test(String(sinceIso))) {
      throw jsonError(400, "Ungültige Anfrage.");
    }
    query = query
      .gt("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(CHAT_LIMIT);
  } else {
    query = query.order("created_at", { ascending: false }).limit(CHAT_LIMIT);
  }
  const { data, error } = await query;
  if (error) throw jsonError(500, ERR_500);

  const rows = data || [];
  if (!sinceIso) rows.reverse();

  return rows.map((row) => ({
    id: row.id,
    fromMe: row.sender_id === me,
    body: row.body || "",
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

// Nachricht senden — Empfänger wird PRO Senden re-validiert (beigetreten +
// aktiv + gleiche Praxis). V1 ist textonly, media bleibt '[]'.
export async function sendMessage(session, otherId, body) {
  const me = session.submissionId;
  const other = assertUuid(otherId);
  if (other === me) throw jsonError(400, "Ungültige Anfrage.");
  assertActionRateLimit(
    `community-chat:${me}`,
    120,
    HOUR_MS,
    "Du hast in der letzten Stunde sehr viele Nachrichten geschickt. Bitte mach eine kleine Pause und versuche es später erneut."
  );
  await requireMemberTarget(other);

  const bodyText = String(body ?? "").trim();
  if (bodyText.length < 1) {
    throw jsonError(400, "Bitte schreibe eine Nachricht.");
  }
  if (bodyText.length > 2000) {
    throw jsonError(400, "Die Nachricht ist zu lang (maximal 2000 Zeichen).");
  }

  const { data, error } = await companionAdmin
    .from("companion_messages")
    .insert({
      practice_id: PRACTICE_ID,
      sender_id: me,
      recipient_id: other,
      body: bodyText,
    })
    .select("id, body, created_at, read_at")
    .single();
  if (error) throw jsonError(500, ERR_500);

  return {
    id: data.id,
    fromMe: true,
    body: data.body,
    createdAt: data.created_at,
    readAt: data.read_at,
  };
}

// Gelesen-Stempel — kann NUR eigene empfangene Nachrichten anfassen
// (recipient_id = ich ist Teil des WHERE, nicht nur Absicht).
export async function markRead(session, otherId) {
  const other = assertUuid(otherId);
  const { error } = await companionAdmin
    .from("companion_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("practice_id", PRACTICE_ID)
    .eq("recipient_id", session.submissionId)
    .eq("sender_id", other)
    .is("read_at", null);
  if (error) throw jsonError(500, ERR_500);
  return true;
}

// Inbox — ungelesen je Partner + letzte Nachricht je Partner (Vorschau,
// 80 Zeichen) + Gesamt-Badge. Zwei batched Selects, Gruppierung in JS.
export async function getInbox(session) {
  const me = session.submissionId;

  const [unreadRes, recentRes] = await Promise.all([
    companionAdmin
      .from("companion_messages")
      .select("sender_id")
      .eq("practice_id", PRACTICE_ID)
      .eq("recipient_id", me)
      .is("read_at", null),
    companionAdmin
      .from("companion_messages")
      .select("sender_id, recipient_id, body, created_at")
      .eq("practice_id", PRACTICE_ID)
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(INBOX_SCAN_LIMIT),
  ]);
  if (unreadRes.error || recentRes.error) throw jsonError(500, ERR_500);

  const unreadByPartner = new Map();
  for (const row of unreadRes.data || []) {
    unreadByPartner.set(
      row.sender_id,
      (unreadByPartner.get(row.sender_id) || 0) + 1
    );
  }

  // Neueste Nachricht je Partner (die Liste kommt absteigend sortiert).
  const latestByPartner = new Map();
  for (const row of recentRes.data || []) {
    const partnerId = row.sender_id === me ? row.recipient_id : row.sender_id;
    if (!latestByPartner.has(partnerId)) latestByPartner.set(partnerId, row);
  }

  const partnerIds = [
    ...new Set([...unreadByPartner.keys(), ...latestByPartner.keys()]),
  ];
  const nicknames = await nicknameMap(partnerIds);

  const partners = partnerIds
    .map((partnerId) => {
      const latest = latestByPartner.get(partnerId);
      const bodyText = String(latest?.body || "");
      return {
        partnerId,
        nickname: nicknames.get(partnerId) || "Ehemaliges Mitglied",
        unread: unreadByPartner.get(partnerId) || 0,
        lastBody:
          bodyText.length > 80 ? `${bodyText.slice(0, 80)}…` : bodyText,
        lastAt: latest?.created_at || null,
        lastFromMe: latest ? latest.sender_id === me : false,
      };
    })
    .sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || "")));

  let totalUnread = 0;
  for (const count of unreadByPartner.values()) totalUnread += count;

  return { partners, totalUnread };
}

// ---------------------------------------------------------------------------
// SIGNIERTE UPLOAD-URLS (upload-url-Route) — für Dateien über dem Vercel-
// Body-Limit: gleiche Whitelist wie createPost, Ziel IMMER unter dem eigenen
// Präfix. Der Client lädt direkt zu Supabase Storage hoch und schickt die
// Pfade danach als JSON an /community/post (dort werden sie re-verifiziert).
// ---------------------------------------------------------------------------
export async function createUploadUrls(session, specs) {
  assertActionRateLimit(
    `community-upload:${session.submissionId}`,
    20,
    HOUR_MS,
    "Du hast in der letzten Stunde sehr viele Dateien hochgeladen. Bitte mach eine kleine Pause und versuche es später erneut."
  );

  const list = Array.isArray(specs) ? specs : [];
  if (list.length < 1 || list.length > MAX_FILES_PER_POST) {
    throw jsonError(400, "Maximal 4 Fotos/Videos pro Beitrag.");
  }

  // Erst ALLE Specs prüfen, dann signieren.
  const plan = list.map((spec) => {
    const { kind, ext } = validateMediaSpec(spec?.type, spec?.size);
    return { kind, ext };
  });

  const uploads = [];
  for (const { kind, ext } of plan) {
    const path = `community/${session.submissionId}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await companionAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) {
      console.error(
        "companionCommunity: createSignedUploadUrl fehlgeschlagen:",
        error
      );
      throw jsonError(500, ERR_500);
    }
    uploads.push({
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      type: kind,
    });
  }
  return uploads;
}
