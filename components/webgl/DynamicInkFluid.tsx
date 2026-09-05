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
            "radial-gradient(ellipse at 50% 40%, rgba(70,64,66,0.35) 0%, transparent 60%), var(--sumi-koge, var(--color-background))",
        }}
      />
    ),
  }
);

export default function DynamicInkFluid() {
  return <InkFluidScene />;
}
