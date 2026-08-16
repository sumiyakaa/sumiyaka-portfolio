"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ルート連動テーマ切替（washi テーマ基盤）。
 *
 * - トップ（/）: html[data-theme="washi"] を付与
 * - サブページ: data-theme を除去（現行のダーク表示のまま＝1pxも変えない）
 *
 * 初期描画は app/layout.tsx の pre-hydration インラインscriptが担い、
 * ルート遷移時の付け外しは本コンポーネントが担う
 * （切替の瞬間は InkTransition の墨が画面を覆っている）。
 */
export default function RouteTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.documentElement;
    if (pathname === "/") {
      el.dataset.theme = "washi";
    } else {
      delete el.dataset.theme;
    }
  }, [pathname]);

  return null;
}
