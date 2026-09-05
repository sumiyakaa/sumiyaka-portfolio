"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 線が引かれる（縦横どちらでも）— /service 図面用。
 * components/animation/DrawRule と同じ作法（scaleX/scaleY のみ・reduced-motion は終端・
 * 読み込み時点で視界にある線は動かさない）に、axis="y"（上から下へ）を足したもの。
 * 見た目（太さ・色・位置）は呼び出し側の className が持つ。装飾なので常に aria-hidden。
 */
type Props = {
  className?: string;
  axis?: "x" | "y";
  delay?: number;
  duration?: number;
};

export default function DrawLine({ className = "", axis = "x", delay = 0, duration = 0.9 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const from = axis === "x" ? { scaleX: 0 } : { scaleY: 0 };
    const to = axis === "x" ? { scaleX: 1 } : { scaleY: 1 };
    gsap.set(el, { ...from, transformOrigin: axis === "x" ? "left center" : "center top" });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(el, { ...to, duration, delay, ease: "power3.out" });
      },
    });

    return () => {
      trigger.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, [axis, delay, duration]);

  return <span ref={ref} className={className} aria-hidden="true" />;
}
