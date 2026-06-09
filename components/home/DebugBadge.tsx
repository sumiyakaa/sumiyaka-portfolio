"use client";

import { useEffect, useState } from "react";
import { describeDeviceSignals } from "@/lib/device";

/**
 * 端末判定のデバッグ表示。URL に ?debug が含まれる時だけ画面下部に出る。
 * 検証用の一時コンポーネント（確認後に削除する）。
 */
export default function DebugBadge() {
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!window.location.search.includes("debug")) return;
    setInfo(describeDeviceSignals());
  }, []);

  if (!info) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.88)",
        color: "#0f0",
        font: "11px/1.5 monospace",
        padding: "6px 8px",
        wordBreak: "break-all",
        pointerEvents: "none",
      }}
    >
      {info}
    </div>
  );
}
