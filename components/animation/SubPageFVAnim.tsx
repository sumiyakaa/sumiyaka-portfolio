"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

interface SubPageFVAnimProps {
  children: ReactNode;
  className?: string;
  /** FV縮小を有効にするか（デフォルトtrue） */
  shrink?: boolean;
  /** タイトルのletter-spacing目標値（デフォルト0.2em） */
  targetLetterSpacing?: string;
}

/**
 * サブページ共通FV入場アニメーション（旧about.js/service.js/contact.js/works.js移植）
 * - タイトル: letter-spacing 0.4em→0.2em + opacity 0→1
 * - サブテキスト・HR・エッジ: 順次フェードイン
 * - FV縮小: 100vh→50vh（オプション）
 *
 * 子要素に以下のdata属性を付与して使用:
 *   data-fv-title, data-fv-sub, data-fv-hr, data-fv-edge
 */
export default function SubPageFVAnim({
  children,
  className,
  shrink = true,
  targetLetterSpacing = "0.2em",
}: SubPageFVAnimProps) {
  const fvRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fv = fvRef.current;
    if (!fv) return;

    const ctx = gsap.context(() => {
      // FV縮小: 1秒後に開始、0.5秒で完了（1.5秒時点）
      if (shrink) {
        gsap.to(fv, {
          height: "50vh",
          duration: 0.5,
          delay: 1,
          ease: EASE,
          onComplete: () => {
            fv.style.height = "50vh";
            ScrollTrigger.refresh();
          },
        });
      }

      const tl = gsap.timeline({ delay: 0.2 });

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
  }, [shrink, targetLetterSpacing]);

  return (
    <section ref={fvRef} className={className} data-fv>
      {children}
    </section>
  );
}
