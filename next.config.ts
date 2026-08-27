import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // /api/og はサーバー側で public/ のフォントを fs で読む。Vercel の関数バンドルに確実に同梱させる。
  outputFileTracingIncludes: {
    "/api/og": ["./public/og/**", "./public/tools/fonts/**"],
  },
  // 正規ドメインは akashiki.com。www と旧 vercel.app は 308 で集約する。
  // ※プレビュー用の sumiyaka-portfolio-<hash>.vercel.app はホスト名が一致しないため対象外。
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.akashiki.com" }],
        destination: "https://akashiki.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "sumiyaka-portfolio.vercel.app" }],
        destination: "https://akashiki.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // /tools＝自社ツール。テキスト・データマイニングの権利留保（TDM Reservation Protocol）と、
        // AI学習・画像学習の拒否を機械可読にしておく。index/follow は維持（AI検索の流入は歓迎）。
        // ⚠ 防御ではなく権利表示。完全な複製防止は技術的に不可能（app/tools/layout.tsx 参照）
        source: "/tools/:path*",
        headers: [
          { key: "tdm-reservation", value: "1" },
          { key: "tdm-policy", value: "https://akashiki.com/tools/terms" },
          { key: "X-Robots-Tag", value: "index, follow, noai, noimageai" },
        ],
      },
      {
        source: "/tools",
        headers: [
          { key: "tdm-reservation", value: "1" },
          { key: "tdm-policy", value: "https://akashiki.com/tools/terms" },
          { key: "X-Robots-Tag", value: "index, follow, noai, noimageai" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/webp"],
  },
  turbopack: {
    rules: {
      "*.glsl": { loaders: ["raw-loader"], as: "*.js" },
      "*.frag": { loaders: ["raw-loader"], as: "*.js" },
      "*.vert": { loaders: ["raw-loader"], as: "*.js" },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|frag|vert)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
