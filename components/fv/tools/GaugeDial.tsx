import type { CSSProperties } from "react";
import styles from "./GaugeDial.module.css";

/**
 * 計器の文字盤（目盛り＋針）— /tools「淡・金属と計器」の共通部品（2026-09-05）。
 *
 * - 目盛りは SVG（静的）。針は HTML 要素＝transform: rotate だけで動く
 *   （SVG の transform-origin の癖を避け、GSAP／CSS どちらからも同じ作法で回せる）。
 * - 針の角度は CSS 変数 --needle-rest（休止角）で決まる。GSAP がインラインの transform を
 *   置けばそちらが勝ち、prefers-reduced-motion では --needle-end（終端角）に固定される。
 * - quiver=true のとき、針の内側の1枚だけが微かに揺れる（常時ループ）。
 *   既定は paused。囲う側（InViewGate）が gaugeStyles.live を付けた時だけ動き、
 *   gaugeStyles.still（タッチ端末・狭幅）では起動しない。
 * - filter・3D・clip-path は使わない（iOS/WebKit 安全）。
 */

/** 針の振れ幅（±deg）。0 が左端、count が右端 */
export const GAUGE_SWEEP = 100;

const VB_W = 200;
const VB_H = 128;
const CX = 100;
const CY = 104;
const R = 82;

/** 値 value（0..count）に対応する針の角度（deg・上が 0） */
export function gaugeAngle(value: number, count: number): number {
  if (count <= 0) return -GAUGE_SWEEP;
  const t = Math.min(1, Math.max(0, value / count));
  return -GAUGE_SWEEP + t * GAUGE_SWEEP * 2;
}

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

const fmt = (n: number) => n.toFixed(2);

type Props = {
  /** 目盛りの最大値（＝主目盛りの数） */
  count: number;
  /** 主目盛りの間に打つ副目盛りの数（既定 4） */
  minorPerMajor?: number;
  /** 主目盛りに数字を添える */
  numerals?: boolean;
  /** 針の微動（常時ループ）を持たせる。囲う側が .live を付けた時だけ動く */
  quiver?: boolean;
  /** 針の休止角（deg）。既定は左端 */
  restAngle?: number;
  className?: string;
  needleClassName?: string;
  needleStyle?: CSSProperties;
};

export default function GaugeDial({
  count,
  minorPerMajor = 4,
  numerals = false,
  quiver = false,
  restAngle = -GAUGE_SWEEP,
  className,
  needleClassName,
  needleStyle,
}: Props) {
  const per = minorPerMajor + 1;
  const total = Math.max(1, count) * per;
  const [ax, ay] = polar(R, -GAUGE_SWEEP);
  const [bx, by] = polar(R, GAUGE_SWEEP);

  const ticks: { major: boolean; x1: number; y1: number; x2: number; y2: number; value: number }[] = [];
  for (let i = 0; i <= total; i++) {
    const deg = -GAUGE_SWEEP + (i / total) * GAUGE_SWEEP * 2;
    const major = i % per === 0;
    const [x1, y1] = polar(R, deg);
    const [x2, y2] = polar(major ? R - 13 : R - 6, deg);
    ticks.push({ major, x1, y1, x2, y2, value: i / per });
  }

  const rootCls = [styles.dial, className ?? ""].filter(Boolean).join(" ");
  const needleCls = [styles.needle, needleClassName ?? ""].filter(Boolean).join(" ");
  const bladeCls = [styles.blade, quiver ? styles.quiver : ""].filter(Boolean).join(" ");
  const style = {
    ...(needleStyle ?? {}),
    "--needle-rest": `${restAngle}deg`,
  } as CSSProperties;

  return (
    <div className={rootCls} aria-hidden="true">
      <svg className={styles.svg} viewBox={`0 0 ${VB_W} ${VB_H}`} focusable="false">
        <path
          className={styles.arc}
          d={`M${fmt(ax)} ${fmt(ay)} A${R} ${R} 0 1 1 ${fmt(bx)} ${fmt(by)}`}
        />
        {ticks.map((t, i) => (
          <line
            key={i}
            className={t.major ? styles.tickMajor : styles.tick}
            x1={fmt(t.x1)}
            y1={fmt(t.y1)}
            x2={fmt(t.x2)}
            y2={fmt(t.y2)}
          />
        ))}
        {numerals &&
          ticks
            .filter((t) => t.major)
            .map((t) => {
              const deg = gaugeAngle(t.value, count);
              const [nx, ny] = polar(R - 27, deg);
              const edge = t.value === 0 || t.value === count;
              return (
                <text
                  key={`n${t.value}`}
                  className={edge ? styles.num : `${styles.num} ${styles.numMid}`}
                  x={fmt(nx)}
                  y={fmt(ny)}
                  dy="0.35em"
                  textAnchor="middle"
                >
                  {t.value}
                </text>
              );
            })}
      </svg>
      <div className={needleCls} style={style} data-gauge-needle>
        <span className={bladeCls} />
      </div>
      <span className={styles.hub} />
    </div>
  );
}
