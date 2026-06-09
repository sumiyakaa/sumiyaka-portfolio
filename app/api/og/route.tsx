import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// SSRF対策: img は自ドメインのサムネイルのみ許可（@vercel/og がサーバー側で fetch するため）
const ALLOWED_IMG_HOSTS = new Set([
  "akashiki.com",
  "www.akashiki.com",
  "sumiyaka-portfolio.vercel.app",
]);

function safeThumb(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_IMG_HOSTS.has(u.hostname)
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") ?? "AKASHIKI";
  const sub = searchParams.get("sub") ?? "Web Design & Development";
  const img = safeThumb(searchParams.get("img")); // 自ドメインのサムネイルのみ

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#0a0a0a",
          position: "relative",
        }}
      >
        {/* Corner frames */}
        <div style={{ position: "absolute", top: 40, left: 40, width: 60, height: 60, borderTop: "1px solid rgba(255,255,255,0.3)", borderLeft: "1px solid rgba(255,255,255,0.3)", display: "flex" }} />
        <div style={{ position: "absolute", top: 40, right: 40, width: 60, height: 60, borderTop: "1px solid rgba(255,255,255,0.3)", borderRight: "1px solid rgba(255,255,255,0.3)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 40, left: 40, width: 60, height: 60, borderBottom: "1px solid rgba(255,255,255,0.3)", borderLeft: "1px solid rgba(255,255,255,0.3)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 40, right: 40, width: 60, height: 60, borderBottom: "1px solid rgba(255,255,255,0.3)", borderRight: "1px solid rgba(255,255,255,0.3)", display: "flex" }} />

        {/* Thumbnail (if provided) */}
        {img && (
          <div style={{ display: "flex", marginBottom: 32 }}>
            <img
              src={img}
              width={400}
              height={225}
              style={{ objectFit: "cover", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        )}

        {/* Logo */}
        <div
          style={{
            display: "flex",
            fontSize: 16,
            letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 24,
          }}
        >
          AKASHIKI — 灯敷
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 20 ? 48 : 64,
            fontWeight: 200,
            color: "#ffffff",
            letterSpacing: "0.06em",
            textAlign: "center",
            maxWidth: "80%",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: 18,
            fontWeight: 300,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.15em",
            marginTop: 20,
          }}
        >
          {sub}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            display: "flex",
            fontSize: 13,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          akashiki.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
