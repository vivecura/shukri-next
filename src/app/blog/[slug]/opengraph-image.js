import { ImageResponse } from "next/og";
import { fetchPostBySlugAndLang } from "@/lib/blogQueries.server";

export const alt = "ViveCura Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }) {
  const { slug } = await params;
  const post = await fetchPostBySlugAndLang(slug, "de");

  if (post?.thumbnail_url) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", position: "relative" }}>
          <img
            src={post.thumbnail_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 60,
              background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
              color: "white",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 56, fontWeight: 700 }}>{post.title}</div>
            {post.description && (
              <div style={{ fontSize: 28, marginTop: 16, opacity: 0.9 }}>
                {post.description.slice(0, 120)}
              </div>
            )}
          </div>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#43a9ab",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            marginBottom: 24,
            letterSpacing: "0.1em",
          }}
        >
          VIVECURA
        </div>
        <div style={{ fontSize: 60, fontWeight: 700, maxWidth: 1000 }}>
          {post?.title || "Blog"}
        </div>
      </div>
    ),
    { ...size }
  );
}
