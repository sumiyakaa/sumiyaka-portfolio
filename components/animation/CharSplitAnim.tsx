"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

interface CharSplitAnimProps {
  children: ReactNode;
  /** スタガー間隔（秒） */
  stagger?: number;
  /** 1文字あたりのアニメーション時間（秒） */
  duration?: number;
  /** ScrollTrigger の start 位置 */
  start?: string;
  /** FV内など ScrollTrigger を使わず即時再生する場合 true */
  immediate?: boolean;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
}

export default function CharSplitAnim({
  children,
  stagger = 0.03,
  duration = 0.6,
  start = "top 85%",
  immediate = false,
  className = "",
  as: Tag = "div",
}: CharSplitAnimProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // テキストを1文字ずつspanに分割
    const text = el.textContent || "";
    const ariaLabel = text;
    el.innerHTML = "";
    el.setAttribute("aria-label", ariaLabel);

    // 元のchildNodesからBRを保持しつつchar分割
    const chars: HTMLSpanElement[] = [];
    for (const char of text) {
      if (char === "\n") {
        el.appendChild(document.createElement("br"));
        continue;
      }
      const span = document.createElement("span");
      span.textContent = char === " " ? "\u00A0" : char;
      span.style.display = "inline-block";
      span.classList.add("char");
      el.appendChild(span);
      chars.push(span);
    }

    // GSAP アニメーション
    const animConfig = {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      ease: EASE,
    };

    gsap.set(chars, { opacity: 0, y: 20 });

    if (immediate) {
      gsap.to(chars, animConfig);
    } else {
      gsap.to(chars, {
        ...animConfig,
        scrollTrigger: {
          trigger: el,
          start,
          once: true,
        },
      });
    }

    return () => {
      ScrollTrigger.getAll()
        .filter((st) => st.trigger === el)
        .forEach((st) => st.kill());
    };
  }, [stagger, duration, start, immediate]);

  return (
    // @ts-expect-error -- dynamic tag element
    <Tag ref={containerRef} className={className}>
      {children}
    </Tag>
  );
}
