"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Highlight.module.css";

interface HighlightProps {
  children: ReactNode;
  className?: string;
  /** 表示から引かれ始めるまでの遅れ（秒） */
  delay?: number;
  /** 見た目：marker＝墨のマーカー（地を塗る）／under＝下線が引かれる */
  variant?: "marker" | "under";
}

/**
 * 墨のマーカー（P12・2026-09-06 減量）
 *
 * 要点の語句に、画面に入ったとき左から右へ「引かれる」強調を付ける。
 * - background-size の遷移だけで描く（transform/filter 不使用・iOS 安全）
 * - 一度引かれたら戻らない（IntersectionObserver は once）
 * - prefers-reduced-motion では最初から引かれた状態
 * - 色はページ側で --hl-ink（マーカーの色）を上書きして合わせる
 */
export default function Highlight({
  children,
  className,
  delay = 0,
  variant = "marker",
}: HighlightProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add(styles.on);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add(styles.on);
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={[styles.hl, variant === "under" ? styles.under : styles.marker, className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </span>
  );
}
