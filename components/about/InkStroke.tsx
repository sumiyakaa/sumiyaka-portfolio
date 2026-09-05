"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 筆の一線（縦・横）— /about 濃・墨（2026-09-05）。
 * DrawRule（横・左から）の縦版。見た目（太さ・色・かすれ）は呼び出し側の className が持ち、
 * ここは「上から下へ（または左から右へ）引かれる」動きだけを足す。
 *  - 動かすのは transform: scale だけ（再レイアウトなし・iOS/WebKit 安全）
 *  - reduced-motion では引き終わった状態で置く
 *  - 読み込み時点で既に視界にある線は動かさない
 *  - 装飾なので常に aria-hidden
 */
type Props = {
  className?: string;
  axis?: "x" | "y";
  delay?: number;
  duration?: number;
};

export default function InkStroke({
  className = "",
  axis = "y",
  delay = 0,
  duration = 1.4,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const vertical = axis === "y";
    gsap.set(el, {
      scaleX: vertical ? 1 : 0,
      scaleY: vertical ? 0 : 1,
      transformOrigin: vertical ? "center top" : "left center",
    });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(el, {
          scaleX: 1,
          scaleY: 1,
          duration,
          delay,
          ease: "power3.out",
        });
      },
    });

    return () => {
      trigger.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, [axis, delay, duration]);

  return <span ref={ref} className={className} aria-hidden="true" />;
}
