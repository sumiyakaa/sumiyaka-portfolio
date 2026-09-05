"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  FV_DEPTH,
  FV_EASE,
  FV_PHASE_EVENT,
  FV_TIMING,
  type FVPhase,
} from "@/components/fv/contract";

gsap.registerPlugin(ScrollTrigger);

interface SubPageFVAnimProps {
  children: ReactNode;
  className?: string;
  /** FV縮小を有効にするか（デフォルトtrue） */
  shrink?: boolean;
  /** タイトルのletter-spacing目標値（デフォルト0.2em） */
  targetLetterSpacing?: string;
  /**
   * true のとき、既定の入場（data-fv-title / -sub / -hr / -edge）を走らせない。
   * ページ側が独自の入場演出を持つ場合に使う。収縮と位相の通知はそのまま行う。
   */
  customEntrance?: boolean;
}

/**
 * サブページ共通FV「舞台」（2026-09-05 五彩改修で拡張）
 *
 * 旧来の役割（そのまま）：
 * - タイトル: letter-spacing 0.4em→target + opacity 0→1
 * - サブテキスト・HR・エッジ: 順次フェードイン
 * - FV縮小: 100vh→50vh（1.0s 後に開始・0.5s）
 *
 * 追加した役割：
 * - 位相の公開：section[data-fv] の data-fv-phase 属性 ＋ CustomEvent(fvphase)
 *     idle → enter → shrink → settled
 * - 収縮の奥行き：[data-fv-depth] を持つ要素は収縮中に奥へ沈む
 *     （scale 0.94・yPercent -4 を係数倍。題字は手前に残す）
 * - prefers-reduced-motion：終端値を即置きし settled を即通知
 *
 * 子要素に以下のdata属性を付与して使用:
 *   data-fv-title, data-fv-sub, data-fv-hr, data-fv-edge, data-fv-depth[="0..1"]
 */
export default function SubPageFVAnim({
  children,
  className,
  shrink = true,
  targetLetterSpacing = "0.2em",
  customEntrance = false,
}: SubPageFVAnimProps) {
  const fvRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fv = fvRef.current;
    if (!fv) return;

    const setPhase = (phase: FVPhase) => {
      fv.setAttribute("data-fv-phase", phase);
      fv.dispatchEvent(
        new CustomEvent(FV_PHASE_EVENT, { detail: { phase }, bubbles: false })
      );
    };

    const depthEls = Array.from(
      fv.querySelectorAll<HTMLElement>("[data-fv-depth]")
    );
    const depthFactor = (el: HTMLElement) => {
      const raw = parseFloat(el.getAttribute("data-fv-depth") || "1");
      return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
    };

    // prefers-reduced-motion（2026-08-27 P6 検収 audit の指摘）
    // 各ページの CSS は opacity/transform を !important で解除しているが、
    // letter-spacing と height は GSAP のインライン値が勝って動いてしまう。
    // OS の「動きを減らす」が有効なら、終端値を即座に置いてトゥイーンを一切走らせない。
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      if (shrink) {
        fv.style.height = FV_TIMING.shrunkHeight;
        depthEls.forEach((el) => {
          const f = depthFactor(el);
          gsap.set(el, {
            scale: 1 - (1 - FV_DEPTH.scale) * f,
            yPercent: FV_DEPTH.yPercent * f,
          });
        });
      }
      if (!customEntrance) {
        const title = fv.querySelector<HTMLElement>("[data-fv-title]");
        if (title) {
          title.style.opacity = "1";
          title.style.letterSpacing = targetLetterSpacing;
        }
        fv.querySelectorAll<HTMLElement>("[data-fv-sub], [data-fv-edge]").forEach((el) => {
          el.style.opacity = "1";
        });
        fv.querySelectorAll<HTMLElement>("[data-fv-hr]").forEach((el) => {
          el.style.transform = "scaleX(1)";
        });
      }
      setPhase("settled");
      ScrollTrigger.refresh();
      return;
    }

    setPhase("enter");

    const ctx = gsap.context(() => {
      // FV縮小: 1秒後に開始、0.5秒で完了（1.5秒時点）
      if (shrink) {
        gsap.to(fv, {
          height: FV_TIMING.shrunkHeight,
          duration: FV_TIMING.shrinkDuration,
          delay: FV_TIMING.shrinkDelay,
          ease: FV_EASE,
          onStart: () => setPhase("shrink"),
          onComplete: () => {
            fv.style.height = FV_TIMING.shrunkHeight;
            setPhase("settled");
            ScrollTrigger.refresh();
          },
        });
        // 奥行き：背景層だけが奥へ沈む（題字は手前に残る）
        depthEls.forEach((el) => {
          const f = depthFactor(el);
          gsap.to(el, {
            scale: 1 - (1 - FV_DEPTH.scale) * f,
            yPercent: FV_DEPTH.yPercent * f,
            transformOrigin: "50% 50%",
            duration: FV_TIMING.shrinkDuration,
            delay: FV_TIMING.shrinkDelay,
            ease: FV_EASE,
          });
        });
      } else {
        // 収縮なしのページでも位相は流す（入場が落ち着く頃に settled）
        gsap.delayedCall(FV_TIMING.shrinkDelay + FV_TIMING.shrinkDuration, () =>
          setPhase("settled")
        );
      }

      if (customEntrance) return;

      const tl = gsap.timeline({ delay: FV_TIMING.enterDelay });

      // タイトル: letter-spacing アニメーション
      const title = fv.querySelector("[data-fv-title]");
      if (title) {
        tl.fromTo(
          title,
          { opacity: 0, letterSpacing: "0.4em" },
          { opacity: 1, letterSpacing: targetLetterSpacing, duration: 1.2, ease: "power4.out" }
        );
      }

      // サブテキスト
      const sub = fv.querySelector("[data-fv-sub]");
      if (sub) {
        tl.fromTo(
          sub,
          { opacity: 0 },
          { opacity: 1, duration: 0.8, ease: "power4.out" },
          "-=0.8"
        );
      }

      // 水平ライン
      const hr = fv.querySelector("[data-fv-hr]");
      if (hr) {
        tl.fromTo(
          hr,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, ease: "power4.out" },
          "-=0.6"
        );
      }

      // エッジテキスト
      const edges = fv.querySelectorAll("[data-fv-edge]");
      if (edges.length) {
        tl.fromTo(
          edges,
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: "power4.out", stagger: 0.1 },
          "-=0.4"
        );
      }
    }, fv);

    return () => ctx.revert();
  }, [shrink, targetLetterSpacing, customEntrance]);

  return (
    <section ref={fvRef} className={className} data-fv data-fv-phase="idle">
      {children}
    </section>
  );
}
