"use client";

import { useEffect, useRef, useCallback, type RefObject } from "react";
import { gsap } from "gsap";

/**
 * マグネティックホバー hook（旧common.js移植）
 * マウス追従で要素が磁石のように吸い付く → 離れるとelastic.outで復帰
 * SP（768px以下）では無効
 */
export function useMagnetic<T extends HTMLElement>(
  strength: number = 0.3
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    [strength]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // SP では無効
    if (window.innerWidth <= 768) return;

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return ref;
}
