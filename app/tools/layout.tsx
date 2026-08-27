import type { ReactNode } from "react";
import "./tools-paper.css";

/**
 * /tools 配下の共通レイアウト。
 *
 * ここでは「紙のテーマ」のグローバルCSS（tools-paper.css）を読み込むだけで、
 * DOM は足さない。紙になるのは各ツールページの <main data-tools-paper data-tool="…"> だけで、
 * カタログ（/tools）はサイト本体と同じ黒のまま＝白い札が黒い棚に並んで映える構造。
 */
export default function ToolsLayout({ children }: { children: ReactNode }) {
  return children;
}
