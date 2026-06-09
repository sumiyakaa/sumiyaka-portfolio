import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
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
