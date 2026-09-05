"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { FV_TIMING } from "@/components/fv/contract";
import { prefersLightVisuals } from "@/lib/device";

/**
 * /about FV の舞台「濃（のう）・墨」（2026-09-05 五彩改修）。
 * SubPageFVAnim（customEntrance）の内側に置き、既定の入場の代わりに
 * 「題字が滲みの中から立ち上がる」独自の入場だけを担当する。
 *
 *  - 収縮（1.0s→1.5s）と位相の通知は SubPageFVAnim がそのまま持つ。
 *    奥層（data-fv-depth=1）はそちらで沈み、ここで動かす題字は手前に残る。
 *  - 動かすのは opacity / transform(2D) / letter-spacing / text-shadow のみ
 *    （contract.ts 規則2の範囲。filter・blend・3D は不使用）。
 *  - text-shadow の「滲み→紙から浮く影」のトゥイーンは PC（pointer:fine）だけ。
 *    タッチ端末・狭幅（prefersLightVisuals）では opacity/transform だけにして
 *    静止1コマでも同じ絵になるようにする（ポスター判定）。
 *  - prefers-reduced-motion では終端値を即置きし、トゥイーンを走らせない。
 *
 * 子要素は data-about-fv="title|sub|hr|label|drip" で指定する。
 */
type Props = {
  children: ReactNode;
  className?: string;
  /** prefersLightVisuals() が true のとき root に付くクラス（粒や滲みを静止させる） */
  stillClassName?: string;
};

/* 滲みの中（広く淡い暖色白の暈＋弱い影）→ 紙から浮く（暈ゼロ＋下に落ちる墨の影）。
   影の本数を揃えておく＝GSAP が文字列として補間できる */
const SHADOW_BLEED =
  "0 0 36px rgba(250, 247, 245, 0.42), 0 3px 30px rgba(20, 18, 18, 0.2)";
const SHADOW_SETTLED =
  "0 0 0 rgba(250, 247, 245, 0), 0 3px 18px rgba(20, 18, 18, 0.72)";

export default function AboutFVStage({
  children,
  className = "",
  stillClassName = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const pick = (key: string) =>
      root.querySelector<HTMLElement>(`[data-about-fv="${key}"]`);
    const title = pick("title");
    const sub = pick("sub");
    const hr = pick("hr");
    const label = pick("label");
    const drip = pick("drip");

    const light = prefersLightVisuals();
    if (light && stillClassName) root.classList.add(stillClassName);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // 終端値の即置き（reduced-motion／後片付け共通）
    const settle = () => {
      [title, sub, label, drip].forEach((el) => {
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "";
        el.style.letterSpacing = "";
        el.style.textShadow = "";
      });
      if (hr) hr.style.transform = "scaleX(1)";
    };

    if (reduceMotion) {
      settle();
      return () => {
        if (stillClassName) root.classList.remove(stillClassName);
      };
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: FV_TIMING.enterDelay });

      // 題字：滲みの中から立ち上がる（0.2s 開始・power4.out＝0.65s 頃には読める）
      if (title) {
        tl.fromTo(
          title,
          {
            opacity: 0,
            y: 18,
            letterSpacing: "0.2em",
            ...(light ? {} : { textShadow: SHADOW_BLEED }),
          },
          {
            opacity: 1,
            y: 0,
            letterSpacing: "0.08em",
            ...(light ? {} : { textShadow: SHADOW_SETTLED }),
            duration: 1.1,
            ease: "power4.out",
            onComplete: () => {
              // 終端値は CSS が持つ（インラインを消して CSS と一致させる）
              gsap.set(title, { clearProps: "letterSpacing,textShadow" });
            },
          },
          0
        );
      }

      // 小さな英字ラベル：題字より半歩遅れて
      if (label) {
        tl.fromTo(
          label,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
          0.25
        );
      }

      // サブコピー：題字が読めた頃に
      if (sub) {
        tl.fromTo(
          sub,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power4.out" },
          0.35
        );
      }

      // 筆の一線：左から引かれる
      if (hr) {
        tl.fromTo(
          hr,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, ease: "power4.out" },
          0.5
        );
      }

      // 下端の滴（スクロールの合図・文字なし）
      if (drip) {
        tl.fromTo(
          drip,
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: "power2.out" },
          0.9
        );
      }
    }, root);

    return () => {
      ctx.revert();
      if (stillClassName) root.classList.remove(stillClassName);
    };
  }, [stillClassName]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
