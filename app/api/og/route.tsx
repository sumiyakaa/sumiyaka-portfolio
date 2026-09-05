import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

// ---- フォント ----
// @vercel/og は `fonts` を渡すと既定の Geist を丸ごと置き換える仕様（options.fonts || defaultFonts）。
// 英字の見た目を従来どおり Geist に保ちつつ日本語を出すため、Geist と Noto Sans JP の両方を渡す。
// Satori はグリフ単位で「先に並べたフォントから順に」探すので、Geist → Noto Sans JP の順にすると
// 英数字は Geist、日本語（Geist に無いグリフ）だけが Noto Sans JP で描かれる。
// ファイルは外部（Google Fonts 等）へ取りに行かず、リポジトリ内の public/ から読む。
// Vercel の関数バンドルには next.config.ts の outputFileTracingIncludes で同梱させている。
const FONT_FILES = {
  geist: path.join(process.cwd(), "public", "og", "Geist-Regular.ttf"),
  notoJp: path.join(process.cwd(), "public", "tools", "fonts", "NotoSansJP-Regular.ttf"),
} as const;

type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400;
  style: "normal";
};

let fontsPromise: Promise<SatoriFont[] | undefined> | null = null;

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

// 1プロセスにつき1回だけ読み込んでキャッシュする（Noto Sans JP は約5.4MB）。
// 読み込みに失敗した場合は undefined を返し、@vercel/og の既定（Geist のみ）で描画を続行する。
function loadFonts(): Promise<SatoriFont[] | undefined> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fs.readFile(FONT_FILES.geist),
      fs.readFile(FONT_FILES.notoJp),
    ])
      .then(([geist, notoJp]) => [
        { name: "Geist", data: toArrayBuffer(geist), weight: 400 as const, style: "normal" as const },
        { name: "Noto Sans JP", data: toArrayBuffer(notoJp), weight: 400 as const, style: "normal" as const },
      ])
      .catch((err) => {
        console.error("[api/og] font load failed; falling back to default font", err);
        fontsPromise = null; // 次のリクエストで再試行できるようにする
        return undefined;
      });
  }
  return fontsPromise;
}

// SSRF対策: img は自ドメインのサムネイルのみ許可（@vercel/og がサーバー側で fetch するため）
// 実際に配信されている本番ホストも許可に含める（独自ドメイン紐付け時に自動追随）
const RUNTIME_HOST =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL;

const ALLOWED_IMG_HOSTS = new Set(
  [
    "akashiki.com",
    "www.akashiki.com",
    "sumiyaka-portfolio.vercel.app",
    RUNTIME_HOST,
  ].filter(Boolean) as string[]
);

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
  const fonts = await loadFonts();

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
          background: "#1f1c1c",
          position: "relative",
          fontFamily: "Geist, 'Noto Sans JP'",
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
      ...(fonts ? { fonts } : {}),
    }
  );
}
