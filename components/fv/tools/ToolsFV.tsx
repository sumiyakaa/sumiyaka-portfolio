"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import InViewGate from "@/components/animation/InViewGate";
import ToolMark from "@/components/tools/_marks/ToolMark";
import { useFVPhase } from "@/components/fv/useFVPhase";
import { useLightVisuals } from "@/lib/useLightVisuals";
import type { ToolMarkKey } from "@/types/tool";
import GaugeDial, { GAUGE_SWEEP, gaugeAngle } from "./GaugeDial";
import gaugeStyles from "./GaugeDial.module.css";
import styles from "./ToolsFV.module.css";

/**
 * /tools FV「淡（たん）＝金属と計器」（2026-09-05 五彩改修）。
 *
 * 舞台は SubPageFVAnim（customEntrance）。ここは独自の入場だけを持つ：
 *   0.00 鋼板が上から降りて据わる（y と scale の settle）
 *   0.44 「TOOLS」が打刻される（scale 1.12→1・0.15s）＋板が沈んで戻る（打撃の反動）
 *   0.58 サブコピーが一文字ずつ刻まれる
 *   0.60 針が振れてツール本数の位置で止まる（カウンタも回る）
 *   0.75 6つの印が順に浮き彫りで現れる
 *   1.00 収縮（SubPageFVAnim）：地の暗い層と目盛りの外周＝data-fv-depth が沈み、
 *        鋼板と題字は手前に残る
 *
 * - 位相は useFVPhase で受ける。"enter" で入場開始。prefers-reduced-motion や
 *   マウント時点で "settled" なら終端値を即置き（トゥイーンなし）。
 * - 常時ループは針の微動だけ。InViewGate で囲い、prefersLightVisuals() では起動しない
 *   （静止1コマ＝鋼板に刻印された TOOLS・目盛りと針・6つの印＝ポスター判定）。
 * - 件数は props（data/tools.ts 由来）から。数字のハードコードなし。
 */

export type ToolsFVItem = {
  slug: string;
  /** 型番（T-01 形式・既存文言） */
  no: string;
  /** 日本語名（リンクの読み上げ名に使う・既存文言） */
  title: string;
  mark: ToolMarkKey;
};

type Props = {
  /** 題字（既存文言） */
  title: string;
  /** サブコピー（既存文言） */
  sub: string;
  items: ToolsFVItem[];
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 目盛りの外周（地に沈む層）。5° 刻み・30° ごとに長い目盛り */
const RING_TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const RING_CX = 500;
const RING_CY = 500;
const RING_R = 470;

function ringPoint(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [RING_CX + r * Math.sin(a), RING_CY - r * Math.cos(a)];
}

export default function ToolsFV({ title, sub, items }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const ctxRef = useRef<gsap.Context | null>(null);
  const phase = useFVPhase(rootRef);
  const still = useLightVisuals();

  const count = items.length;
  const endAngle = gaugeAngle(count, count);


  useEffect(() => {
    if (startedRef.current || phase === "idle") return;
    const root = rootRef.current;
    if (!root) return;
    startedRef.current = true;

    const q = (sel: string) => root.querySelector<HTMLElement>(sel);
    const qa = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
    const plate = q("[data-plate]");
    const shadow = q("[data-plate-shadow]");
    const heading = q("[data-title]");
    const chars = qa("[data-ch]");
    const needle = q("[data-gauge-needle]");
    const counter = q("[data-counter]");
    const keys = qa("[data-key]");
    const ring = q("[data-ring]");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || phase === "settled") {
      const finals = [plate, shadow, heading, ring, ...chars, ...keys].filter(
        (el): el is HTMLElement => el !== null
      );
      gsap.set(finals, { opacity: 1, clearProps: "transform" });
      if (needle) gsap.set(needle, { rotation: endAngle });
      if (counter) counter.textContent = pad2(count);
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // 地：目盛りの外周が浮かぶ（収縮で沈むのは SubPageFVAnim の data-fv-depth）
      if (ring) tl.fromTo(ring, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: "power2.out" }, 0);

      // 鋼板が降りて据わる
      if (plate) {
        tl.fromTo(
          plate,
          { opacity: 0, y: -64, scale: 1.035 },
          { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "power3.out" },
          0
        );
      }
      // 落ち影は着地点で待ち、板が近づくにつれて濃くなる
      if (shadow) tl.fromTo(shadow, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0.18);

      // 打刻：題字が 1.12→1 で打たれ、板が沈んで戻る
      if (heading) {
        tl.fromTo(
          heading,
          { opacity: 0, scale: 1.12 },
          { opacity: 1, scale: 1, duration: 0.15, ease: "power4.out" },
          0.44
        );
      }
      if (plate) {
        tl.to(plate, { y: 5, duration: 0.06, ease: "power2.out" }, 0.46);
        tl.to(plate, { y: 0, duration: 0.26, ease: "power2.inOut" }, 0.52);
      }

      // サブコピーが一文字ずつ刻まれる
      if (chars.length) {
        tl.fromTo(
          chars,
          { opacity: 0, scale: 1.3, y: 2 },
          { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: "power3.out", stagger: 0.02 },
          0.58
        );
      }

      // 針が振れて本数の位置で止まる（わずかに行き過ぎて戻る）
      if (needle) {
        tl.fromTo(
          needle,
          { rotation: -GAUGE_SWEEP },
          { rotation: endAngle, duration: 1.0, ease: "back.out(1.3)" },
          0.6
        );
      }
      if (counter) {
        const o = { n: 0 };
        counter.textContent = pad2(0);
        tl.to(
          o,
          {
            n: count,
            duration: 0.85,
            ease: "power2.out",
            snap: "n",
            onUpdate: () => {
              counter.textContent = pad2(Math.round(o.n));
            },
            onComplete: () => {
              counter.textContent = pad2(count);
            },
          },
          0.62
        );
      }

      // 6つの印が順に浮き彫りで現れる
      if (keys.length) {
        tl.fromTo(
          keys,
          { opacity: 0, y: 8, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out", stagger: 0.07 },
          0.75
        );
      }
    }, root);
    ctxRef.current = ctx;
  }, [phase, count, endAngle]);

  useEffect(() => {
    return () => {
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
  }, []);

  const stageCls = [styles.stage, still ? gaugeStyles.still : ""].filter(Boolean).join(" ");
  const needleStyle = { "--needle-end": `${endAngle}deg` } as CSSProperties;

  return (
    <div ref={rootRef} className={stageCls} data-phase={phase}>
      {/* ---- 地：暗い層と目盛りの外周（収縮で奥へ沈む） ---- */}
      <div className={styles.ground} aria-hidden="true">
        <div className={styles.vignette} data-fv-depth="0.5" />
        <div className={styles.ringPos}>
          <svg
            className={styles.ring}
            viewBox="0 0 1000 1000"
            focusable="false"
            data-fv-depth="1"
            data-ring
          >
            <circle className={styles.ringArc} cx={RING_CX} cy={RING_CY} r={RING_R} />
            <circle className={styles.ringArcInner} cx={RING_CX} cy={RING_CY} r={RING_R - 96} />
            {RING_TICKS.map((deg) => {
              const major = deg % 30 === 0;
              const [x1, y1] = ringPoint(RING_R, deg);
              const [x2, y2] = ringPoint(major ? RING_R - 28 : RING_R - 12, deg);
              return (
                <line
                  key={deg}
                  className={major ? styles.ringTickMajor : styles.ringTick}
                  x1={x1.toFixed(1)}
                  y1={y1.toFixed(1)}
                  x2={x2.toFixed(1)}
                  y2={y2.toFixed(1)}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* ---- 鋼板（手前に残る） ---- */}
      <div className={styles.plateWrap}>
        <div className={styles.plateShadow} aria-hidden="true" data-plate-shadow />
        <div className={styles.plate} data-plate>
          <span className={`${styles.rivet} ${styles.rivetTl}`} aria-hidden="true" />
          <span className={`${styles.rivet} ${styles.rivetTr}`} aria-hidden="true" />
          <span className={`${styles.rivet} ${styles.rivetBl}`} aria-hidden="true" />
          <span className={`${styles.rivet} ${styles.rivetBr}`} aria-hidden="true" />

          {/* 題字＝刻印（凹） */}
          <h1 className={styles.title} data-title>
            {title}
          </h1>

          {/* サブコピー＝白入れの刻印。読み上げは aria-label で一文、字は装飾扱い */}
          <p className={styles.sub} aria-label={sub}>
            {Array.from(sub).map((ch, i) => (
              <span key={i} className={styles.ch} aria-hidden="true" data-ch>
                {ch}
              </span>
            ))}
          </p>

          {/* 計器：目盛りと針＝本数の位置で止まる。微動は画面内でだけ */}
          <InViewGate className={styles.gauge} activeClassName={gaugeStyles.live}>
            <GaugeDial
              count={count}
              numerals
              quiver
              className={styles.dial}
              needleClassName={styles.needle}
              needleStyle={needleStyle}
            />
            <span className={styles.counter} data-counter aria-hidden="true">
              {pad2(count)}
            </span>
          </InViewGate>

          {/* 6つの印＝浮き彫りの鍵。各ツールへの入口 */}
          <ol className={styles.keys}>
            {items.map((item) => (
              <li key={item.slug} className={styles.key} data-key>
                <Link href={`/tools/${item.slug}`} className={styles.keyLink} aria-label={item.title}>
                  <span className={styles.keyFace}>
                    <ToolMark tool={item.mark} size={22} className={styles.keyMark} />
                  </span>
                  <span className={styles.keyNo} aria-hidden="true">
                    {item.no}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
