"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";

interface FVTypewriterProps {
  text: string;
  className?: string;
}

/**
 * Contact FVタイトル — マウスホバーでタイプライター再生（旧contact.js移植）
 * デスクトップのみ。文字が消えて1文字ずつ再表示、カーソル点滅付き。
 */
export default function FVTypewriter({ text, className }: FVTypewriterProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const isAnimating = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (isAnimating.current || window.innerWidth <= 768) return;
    const container = containerRef.current;
    if (!container) return;

    isAnimating.current = true;

    const chars = container.querySelectorAll<HTMLSpanElement>("[data-tw-char]");
    const cursor = container.querySelector<HTMLSpanElement>("[data-tw-cursor]");
    if (!chars.length || !cursor) {
      isAnimating.current = false;
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
      },
    });

    // 1. Fade out all characters
    tl.to(chars, {
      opacity: 0,
      duration: 0.15,
      stagger: 0,
    });

    // 2. Cursor appears
    tl.to(cursor, {
      opacity: 1,
      duration: 0.1,
    }, "+=0.2");

    // 3. Typewriter — characters reappear one by one
    chars.forEach((char, i) => {
      tl.to(char, {
        opacity: 1,
        duration: 0.01,
      }, i === 0 ? undefined : `>+${0.06}`);
    });

    // 4. Cursor blink (2 cycles)
    tl.to(cursor, { opacity: 0, duration: 0.1 }, "+=0.2");
    tl.to(cursor, { opacity: 1, duration: 0.1 }, "+=0.4");
    tl.to(cursor, { opacity: 0, duration: 0.1 }, "+=0.4");
    tl.to(cursor, { opacity: 1, duration: 0.1 }, "+=0.4");

    // 5. Cursor fade out
    tl.to(cursor, { opacity: 0, duration: 0.15 }, "+=0.2");
  }, []);

  useEffect(() => {
    return () => {
      isAnimating.current = false;
    };
  }, []);

  return (
    <h1
      ref={containerRef}
      data-fv-title
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {text.split("").map((char, i) => (
        <span
          key={i}
          data-tw-char
          style={{ display: "inline-block" }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
      <span
        data-tw-cursor
        style={{
          display: "inline-block",
          width: 2,
          height: "0.85em",
          background: "#fff",
          marginLeft: 4,
          verticalAlign: "text-bottom",
          opacity: 0,
        }}
      />
    </h1>
  );
}
