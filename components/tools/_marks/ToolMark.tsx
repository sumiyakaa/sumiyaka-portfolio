import type { ToolMarkKey } from "@/types/tool";
import styles from "./ToolMark.module.css";

/**
 * ツールの図像（6点・モノライン）。
 *
 * 6点で「同じ一族」に見えるよう、骨格を揃えてある：
 *   viewBox 48×48／線幅 1.6／角も端も丸／塗りは使わない／色は currentColor
 * 置き場所＝ツールページの見出し（大）・ツール本体のステータス欄（小）・カタログのカード（小）。
 *
 * animate=true のとき、線が引かれていく描画アニメ（stroke-dashoffset）を1回だけ再生する。
 * ⚠ filter・3D・blur は使わない（iOS/WebKit で安定する手法だけ）。
 * ⚠ prefers-reduced-motion では最初から描き終わった状態で出す（ToolMark.module.css）。
 */
type Props = {
  tool: ToolMarkKey;
  /** 一辺のピクセル数（既定 24） */
  size?: number;
  /** 描画アニメを1回再生する（見出しでだけ true にする） */
  animate?: boolean;
  className?: string;
  /** 読み上げさせたいときだけ渡す。省略時は装飾（aria-hidden） */
  title?: string;
};

/**
 * 各図像のパス。順番＝描かれる順（アニメの stagger は nth-child で付く）。
 * pathLength="1" を付けて、CSS 側の dasharray/dashoffset を 1 で統一している。
 */
const MARKS: Record<ToolMarkKey, string[]> = {
  // T-01 請求書＝紙（右上に折り）・3本の罫・右下の丸い印
  invoice: [
    "M14 6h15l7 7v29H14z",
    "M29 6v7h7",
    "M19.5 22h13",
    "M19.5 28h13",
    "M19.5 34h6",
    "M32 31.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7",
  ],
  // T-02 消込＝二つの円が重なり、重なりの中に一致の印
  reconcile: [
    "M9 24a10 10 0 1 0 20 0a10 10 0 1 0-20 0",
    "M19 24a10 10 0 1 0 20 0a10 10 0 1 0-20 0",
    "M21.5 24.2l2.3 2.3l4.7-5",
  ],
  // T-03 証憑＝荷札（穴つき）と、名前を書く1本の線
  evidence: [
    "M8.5 28.5L27 10h11.5v11.5L20 40z",
    "M32 15.5a2 2 0 1 1 0 4a2 2 0 1 1 0-4",
    "M16.5 29l7.5-7.5",
    "M12 40.5h12",
  ],
  // T-04 統合＝左の3点と右の3点を線で結ぶ（1本は入れ替わる）
  unify: [
    "M11 13.5a2.2 2.2 0 1 0 0.01 0",
    "M11 24a2.2 2.2 0 1 0 0.01 0",
    "M11 34.5a2.2 2.2 0 1 0 0.01 0",
    "M37 13.5a2.2 2.2 0 1 0 0.01 0",
    "M37 24a2.2 2.2 0 1 0 0.01 0",
    "M37 34.5a2.2 2.2 0 1 0 0.01 0",
    "M13.5 13.5C22 13.5 26 24 34.5 24",
    "M13.5 24C22 24 26 13.5 34.5 13.5",
    "M13.5 34.5h21",
  ],
  // T-05 名簿＝水滴（洗う）と、その下で整った2本の行
  cleanup: [
    "M24 7c-5.5 7.2-10 12.6-10 18.2a10 10 0 0 0 20 0C34 19.6 29.5 14.2 24 7z",
    "M18.5 26.5a5.5 5.5 0 0 0 3.6 4.8",
    "M12 41h24",
    "M16 36h16",
  ],
  // T-06 報告＝3本の棒と、その上を走る折れ線
  report: [
    "M9 41h30",
    "M14 41V29h6v12",
    "M22 41V23h6v12",
    "M30 41V33h6v12",
    "M14 20l8-6 8 3 8-8",
    "M38 7.5a1.6 1.6 0 1 0 0.01 0",
  ],
};

export default function ToolMark({ tool, size = 24, animate = false, className, title }: Props) {
  const paths = MARKS[tool];
  const cls = [styles.mark, animate ? styles.animate : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      data-tool-mark={tool}
    >
      {title ? <title>{title}</title> : null}
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength={1} />
      ))}
    </svg>
  );
}
