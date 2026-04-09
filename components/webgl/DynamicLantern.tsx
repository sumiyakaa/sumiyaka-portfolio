"use client";

import dynamic from "next/dynamic";

const LanternScene = dynamic(
  () => import("@/components/webgl/LanternScene"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 30% 40%, rgba(200,169,110,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(200,169,110,0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #111 0%, #0a0a0a 100%)",
        }}
      />
    ),
  }
);

export default function DynamicLantern() {
  return <LanternScene />;
}
