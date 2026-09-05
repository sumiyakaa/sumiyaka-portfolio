"use client";

import type { CSSProperties } from "react";
import InViewGate from "@/components/animation/InViewGate";
import { useLightVisuals } from "@/lib/useLightVisuals";
import styles from "./InkMotes.module.css";

/**
 * 墨の粒（にじみ）＝FV の手前層（2026-09-05 濃・墨）。
 *
 * 奥の流体（WebGL）よりゆっくり漂う、数点の放射グラデ円。
 *  - 円はブラウザが一度だけ描く静的な radial-gradient。動かすのは transform だけ
 *    （filter・blend 不使用＝iOS/WebKit で安定）。
 *  - 常時ループなので InViewGate で囲い、画面外・背面タブでは
 *    animation-play-state: paused に戻す（本当に止まる）。
 *  - タッチ端末・狭幅（useLightVisuals＝prefersLightVisuals の購読）では起動せず、
 *    初期位置の静止1コマ＝滲みの上に題字が載るポスターとして成立させる。
 *  - prefers-reduced-motion は CSS 側で animation: none。
 */
type Mote = {
  /** 位置（FV 幅・高さに対する %） */
  x: number;
  y: number;
  /** 直径 px */
  size: number;
  /** light＝暖色白の淡い滲み／dark＝墨の溜まり（焦） */
  tone: "light" | "dark";
  /** 漂う周期（秒）と位相のずれ（秒） */
  dur: number;
  phase: number;
  /** 漂う向き（px） */
  dx: number;
  dy: number;
  /** キーフレームの型（3種を回して機械的な同期を避ける） */
  path: 0 | 1 | 2;
};

/* 中央対称を避け、左上と右下に重心を散らす。粒の総量は少なく（にじむ・溜まる・かすれる、の範囲） */
const MOTES: Mote[] = [
  { x: 24, y: 30, size: 300, tone: "light", dur: 26, phase: -6, dx: 34, dy: -22, path: 0 },
  { x: 71, y: 64, size: 340, tone: "light", dur: 31, phase: -14, dx: -28, dy: 18, path: 1 },
  { x: 58, y: 26, size: 180, tone: "light", dur: 22, phase: -3, dx: 18, dy: 26, path: 2 },
  { x: 38, y: 74, size: 220, tone: "dark", dur: 29, phase: -9, dx: 26, dy: -16, path: 1 },
  { x: 82, y: 22, size: 260, tone: "dark", dur: 34, phase: -20, dx: -22, dy: 20, path: 0 },
  { x: 12, y: 66, size: 150, tone: "light", dur: 19, phase: -11, dx: 16, dy: -14, path: 2 },
  { x: 50, y: 88, size: 200, tone: "dark", dur: 24, phase: -5, dx: -20, dy: -12, path: 2 },
];

const PATH_CLASS = [styles.pathA, styles.pathB, styles.pathC] as const;

export default function InkMotes() {
  // タッチ端末・狭幅では静止（hydration 安全な外部ストア購読＝effect 内の setState を使わない）
  const still = useLightVisuals();

  return (
    <div
      className={`${styles.wrap} ${still ? styles.still : ""}`}
      aria-hidden="true"
    >
      <InViewGate
        className={styles.field}
        activeClassName={styles.live}
        threshold={0.05}
      >
        {MOTES.map((m, i) => {
          const style = {
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: `${m.size}px`,
            height: `${m.size}px`,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.phase}s`,
            "--mote-dx": `${m.dx}px`,
            "--mote-dy": `${m.dy}px`,
          } as CSSProperties;
          return (
            <span
              key={i}
              className={`${styles.mote} ${m.tone === "dark" ? styles.dark : styles.light} ${PATH_CLASS[m.path]}`}
              style={style}
            />
          );
        })}
      </InViewGate>
    </div>
  );
}
