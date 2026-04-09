"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ClipPathRevealProps {
  children: ReactNode;
  /** clip-path の開始方向 */
  direction?: "bottom" | "top" | "left" | "right";
  /** ScrollTrigger の start */
  start?: string;
  /** ScrollTrigger の end */
  end?: string;
  /** scrub 値 */
  scrub?: number | boolean;
  className?: string;
  as?: keyof HTMLElementTagNameMap;
}

const CLIP_MAP = {
  bottom: { from: "inset(100% 0 0 0)", to: "inset(0% 0 0 0)" },
  top: { from: "inset(0 0 100% 0)", to: "inset(0 0 0% 0)" },
  left: { from: "inset(0 0 0 100%)", to: "inset(0 0 0 0%)" },
  right: { from: "inset(0 100% 0 0)", to: "inset(0 0% 0 0)" },
} as const;

export default function ClipPathReveal({
  children,
  direction = "bottom",
  start = "top 80%",
  end = "top 20%",
  scrub = 0.5,
  className = "",
  as: Tag = "div",
}: ClipPathRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clip = CLIP_MAP[direction];

    gsap.fromTo(
      el,
      { clipPath: clip.from },
      {
        clipPath: clip.to,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start,
          end,
          scrub,
        },
      }
    );

    return () => {
      ScrollTrigger.getAll()
        .filter((st) => st.trigger === el)
        .forEach((st) => st.kill());
    };
  }, [direction, start, end, scrub]);

  return (
    // @ts-expect-error -- dynamic tag element
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
