"use client";

import dynamic from "next/dynamic";

const InkFluidScene = dynamic(
  () => import("@/components/webgl/InkFluidScene"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(60,60,60,0.3) 0%, transparent 60%), radial-gradient(ellipse at 20% 70%, rgba(200,169,110,0.03) 0%, transparent 40%), var(--color-background)",
        }}
      />
    ),
  }
);

export default function DynamicInkFluid() {
  return <InkFluidScene />;
}
