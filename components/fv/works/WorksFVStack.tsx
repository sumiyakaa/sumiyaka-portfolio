"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { useFVPhase } from "@/components/fv/useFVPhase";
import { prefersLightVisuals } from "@/lib/device";
import styles from "./WorksFVStack.module.css";

/**
 * /works の FV「紙の束」— 清（せい）・紙（2026-09-05 五彩改修）。
 *
 * 作品数ぶんの紙が画面の端から差し込まれ、束になって落ち着く → 最前の一枚に
 * 題字が押し込まれる。見た目の紙は最大 MAX_SHEETS 枚に間引く（枚数の表示は
 * 呼び出し側が data から出す。ここでは数字を作らない）。
 *
 * 舞台（SubPageFVAnim）との同期：
 *  - 入場はこの部品が持つ（customEntrance）。題字は 0.85s までに読める。
 *  - 収縮（1.0s→1.5s）では、奥の紙を包む層に data-fv-depth を付けてあるので
 *    舞台側の GSAP が奥へ沈める。手前の一枚と題字には付けない＝残る。
 *  - settled になったら隅の索引ラベルを出す（useFVPhase）。
 *
 * 互換：動かすのは transform(2D)・opacity・text-shadow(CSS transition) のみ。
 *  - prefers-reduced-motion：終端値を即置き。
 *  - prefersLightVisuals()（タッチ・狭幅）：端からの差し込みをやめ、手元で
 *    重なるだけの短い入場にする。静止1コマでも「紙の束」に見える。
 */

/** 見た目の紙の上限（手前の1枚＋奥の紙） */
const MAX_SHEETS = 11;

/** 奥→手前の順。回転は ±2.4deg の 2D、オフセットは px。末尾＝手前の1枚は必ず 0 */
const LAYOUT: ReadonlyArray<{ r: number; x: number; y: number }> = [
  { r: -2.2, x: -14, y: 10 },
  { r: 1.8, x: 12, y: -8 },
  { r: -1.2, x: 8, y: 12 },
  { r: 2.4, x: -10, y: -12 },
  { r: -0.8, x: 16, y: 4 },
  { r: 1.4, x: -6, y: -6 },
  { r: -1.9, x: 4, y: 14 },
  { r: 0.9, x: -16, y: -2 },
  { r: -0.5, x: 10, y: -10 },
  { r: 1.1, x: -4, y: 6 },
  { r: 0, x: 0, y: 0 },
];

/** 差し込まれてくる方向（左・右・上・下を巡回） */
const ENTER_DIRS: ReadonlyArray<{ x: number; y: number }> = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
];

/** 手前の1枚を除いた奥の紙の配置。LAYOUT の末尾側から取る（手前ほど回転が小さい） */
function getBackLayout(count: number) {
  const visible = Math.max(1, Math.min(MAX_SHEETS, count));
  return LAYOUT.slice(LAYOUT.length - visible, LAYOUT.length - 1);
}

interface Props {
  /** 作品数（data 由来）。見た目の枚数はここから間引く */
  count: number;
  /** 手前の一枚に載せる内容（題字・サブコピー。文言は呼び出し側が持つ） */
  children: ReactNode;
}

export default function WorksFVStack({ count, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const phase = useFVPhase(rootRef);

  const backLayout = getBackLayout(count);
  const numberWidth = String(count).length;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const host = root.closest<HTMLElement>("[data-fv]") ?? root;

    const backs = Array.from(root.querySelectorAll<HTMLElement>("[data-wk-sheet]"));
    const front = root.querySelector<HTMLElement>("[data-wk-front]");
    const title = root.querySelector<HTMLElement>("[data-wk-title]");
    const sub = root.querySelector<HTMLElement>("[data-wk-sub]");
    const rule = root.querySelector<HTMLElement>("[data-wk-rule]");
    if (!front) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const light = prefersLightVisuals();

    if (reduceMotion) {
      gsap.set([...backs, front], { opacity: 1 });
      if (title) {
        title.style.opacity = "1";
        title.setAttribute("data-wk-pressed", "");
      }
      if (sub) sub.style.opacity = "1";
      if (rule) rule.style.transform = "scaleX(1)";
      return;
    }

    const layout = getBackLayout(count);

    const ctx = gsap.context(() => {
      const W = host.clientWidth || window.innerWidth;
      const H = host.clientHeight || window.innerHeight;
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      // 奥の紙：端から差し込まれる（light 端末は手元で重なるだけ）
      backs.forEach((el, i) => {
        const lay = layout[i] ?? LAYOUT[0];
        const dir = ENTER_DIRS[i % ENTER_DIRS.length];
        const fromX = light ? lay.x : lay.x + dir.x * W * 0.72;
        const fromY = light ? lay.y + 28 : lay.y + dir.y * H * 0.72;
        const fromR = light
          ? lay.r
          : lay.r + (dir.x !== 0 ? -dir.x * 10 : dir.y * 8);
        tl.fromTo(
          el,
          { x: fromX, y: fromY, rotation: fromR, opacity: 0 },
          {
            x: lay.x,
            y: lay.y,
            rotation: lay.r,
            opacity: 1,
            duration: light ? 0.4 : 0.48,
          },
          0.04 + i * (light ? 0.03 : 0.035)
        );
      });

      // 手前の一枚：最後に上から置かれる
      tl.fromTo(
        front,
        {
          x: light ? 0 : W * 0.55,
          y: light ? 34 : -H * 0.22,
          rotation: light ? 0 : -6,
          opacity: 0,
        },
        { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.5 },
        0.3
      );

      // 題字：押し込まれる（縮む＋不透明に。押し跡は CSS の text-shadow transition）
      if (title) {
        tl.fromTo(
          title,
          { opacity: 0, scale: 1.08 },
          { opacity: 1, scale: 1, duration: 0.32, ease: "power3.out" },
          0.56
        );
        tl.call(() => title.setAttribute("data-wk-pressed", ""), undefined, 0.62);
      }

      if (sub) {
        tl.fromTo(
          sub,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.35 },
          0.72
        );
      }

      if (rule) {
        tl.fromTo(
          rule,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.4, ease: "power3.out" },
          0.76
        );
      }
    }, root);

    return () => ctx.revert();
  }, [count]);

  return (
    <div
      ref={rootRef}
      className={`${styles.stage} ${phase === "settled" ? styles.settled : ""}`}
    >
      <div className={styles.stack}>
        {/* 奥の紙＝収縮で沈む層 */}
        <div className={styles.depth} data-fv-depth="1" aria-hidden="true">
          {backLayout.map((lay, i) => (
            <span
              key={i}
              className={styles.sheet}
              data-wk-sheet
              style={
                {
                  "--r": `${lay.r}deg`,
                  "--x": `${lay.x}px`,
                  "--y": `${lay.y}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        {/* 手前の一枚＝題字が押し込まれる。沈まない */}
        <div className={styles.front} data-wk-front>
          {children}
        </div>
      </div>

      {/* 隅の索引（settled で現れる）。数字は data 由来 */}
      <div className={styles.corner}>
        <span className={styles.cornerText}>
          No.&nbsp;{String(1).padStart(numberWidth, "0")}
          &nbsp;–&nbsp;
          {String(count).padStart(numberWidth, "0")}
        </span>
      </div>
    </div>
  );
}
