"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 年表の「一本の筆致」（2026-09-05 濃・墨）。
 *
 * <ol> の中列に SVG path を1本重ね、最初の点から最後の点まで上から下へ引く
 * （stroke-dashoffset）。各年代の点（[data-tl-dot]）は視界に入った時、
 * 線が届く頃合いで「滲む」（scale + opacity）。
 *
 *  - 線の形は実測から作る（点の中心 y を getBoundingClientRect で取り、
 *    ResizeObserver で追従）。pathLength="1" で dash の値を長さ非依存にする。
 *  - SSR／JS なし／reduced-motion では線も点も最初から見えている
 *    （隠すのは JS が動いてから・DrawRule と同じ規律）。
 *  - 読み込み時点で既に視界にある場合は動かさない。
 *  - 動かすのは SVG stroke-dashoffset と transform/opacity だけ。
 */
type Props = {
  children: ReactNode;
  className?: string;
  /** 線を置く SVG のクラス（位置と幅は呼び出し側の CSS が持つ） */
  strokeClassName?: string;
};

export default function InkTimeline({
  children,
  className = "",
  strokeClassName = "",
}: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const ol = listRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!ol || !svg || !path) return;

    const dots = Array.from(ol.querySelectorAll<HTMLElement>("[data-tl-dot]"));
    // 各点の「線の上での割合」（0〜1）。線の到達と点の滲みを揃えるために持つ
    const fractions: number[] = dots.map(() => 0);

    // 線の形＝最初の点の中心から最後の点の中心まで。手の揺れをわずかに入れる（±1.2px）
    const build = () => {
      const w = svg.clientWidth || 32;
      const h = ol.clientHeight;
      if (!h) return;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

      const olTop = ol.getBoundingClientRect().top;
      const ys = dots.map((d) => {
        const r = d.getBoundingClientRect();
        return r.top - olTop + r.height / 2;
      });
      const y0 = ys.length ? ys[0] : 0;
      const y1 = ys.length ? ys[ys.length - 1] : h;
      const len = Math.max(1, y1 - y0);
      ys.forEach((y, i) => {
        fractions[i] = Math.min(1, Math.max(0, (y - y0) / len));
      });

      const x = w / 2;
      const n = 4;
      const seg = len / n;
      let d = `M ${x} ${y0}`;
      for (let i = 0; i < n; i++) {
        const ya = y0 + seg * i;
        const yb = y0 + seg * (i + 1);
        const sway = (i % 2 === 0 ? 1 : -1) * 1.2;
        d += ` C ${x + sway} ${ya + seg * 0.33}, ${x - sway} ${ya + seg * 0.66}, ${x} ${yb}`;
      }
      path.setAttribute("d", d);
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(ol);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const alreadyInView =
      ol.getBoundingClientRect().top < window.innerHeight * 0.85;

    if (reduceMotion || alreadyInView) {
      return () => ro.disconnect();
    }

    const ctx = gsap.context(() => {
      gsap.set(path, { strokeDashoffset: 1 });
      gsap.set(dots, { scale: 0.2, opacity: 0, transformOrigin: "50% 50%" });

      // 線の所要＝高さに比例（600px で 1.4s 程度）。到達時刻を点の遅延に使う
      const lineDuration = Math.max(1.2, ol.clientHeight / 430);
      let lineStartedAt = -1;

      ScrollTrigger.create({
        trigger: ol,
        start: "top 80%",
        once: true,
        onEnter: () => {
          lineStartedAt = performance.now();
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: lineDuration,
            ease: "power1.inOut",
          });
        },
      });

      dots.forEach((dot, i) => {
        ScrollTrigger.create({
          trigger: dot,
          start: "top 88%",
          once: true,
          onEnter: () => {
            // 線がこの点へ届く時刻まで待ってから滲む（既に届いていれば即）
            let delay = 0;
            if (lineStartedAt >= 0) {
              const arrive = lineStartedAt + lineDuration * 1000 * fractions[i];
              delay = Math.max(0, (arrive - performance.now()) / 1000);
            }
            gsap.to(dot, {
              scale: 1,
              opacity: 1,
              duration: 0.9,
              delay,
              ease: "power3.out",
            });
          },
        });
      });
    }, ol);

    return () => {
      ro.disconnect();
      ctx.revert();
    };
  }, []);

  return (
    <ol ref={listRef} className={className}>
      <svg
        ref={svgRef}
        className={strokeClassName}
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="none"
      >
        <path ref={pathRef} pathLength={1} />
      </svg>
      {children}
    </ol>
  );
}
