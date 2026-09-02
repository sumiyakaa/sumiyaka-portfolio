"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 罫が引かれる（墨の一線）— P11・2026-09-03。
 *
 * 見た目（太さ・色・幅・余白）は呼び出し側の className が持つ。この部品は
 * 「左から右へ引かれる」動きだけを足す。
 *  - 動かすのは transform: scaleX だけ＝再レイアウトを起こさない（iOS/WebKit 安全）。
 *  - `prefers-reduced-motion: reduce` では引き終わった状態で置く。
 *  - 読み込み時点で既に視界にある罫は動かさない（後追いで引かれると不自然なため）。
 *  - 装飾なので常に aria-hidden。
 */
type Props = {
  className?: string;
  delay?: number;
  duration?: number;
};

export default function DrawRule({ className = "", delay = 0, duration = 0.9 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    gsap.set(el, { scaleX: 0, transformOrigin: "left center" });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(el, { scaleX: 1, duration, delay, ease: "power3.out" });
      },
    });

    return () => {
      trigger.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, [delay, duration]);

  return <span ref={ref} className={className} aria-hidden="true" />;
}
