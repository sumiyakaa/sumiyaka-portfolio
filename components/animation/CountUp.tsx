"use client";

import { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 数字が書き入れられる（カウントアップ）— P11・2026-09-03。
 *
 * 設計の前提：
 *  - **SSR では最終値をそのまま出す**。JS が無い環境・クローラ・OG生成でも数字は読める。
 *  - 画面に入っていない数字だけを 0 に戻してから数える。**読み込み時点で既に見えている
 *    数字は動かさない**（いきなり数字が 0 に飛ぶのを防ぐ）。
 *  - `prefers-reduced-motion: reduce` では何もしない＝最終値のまま。
 *  - 動かすのはテキストの中身だけ。filter / 3D / blend は使わない（iOS/WebKit 安全）。
 *  - 桁が動いても幅が暴れないよう、呼び出し側で `font-variant-numeric: tabular-nums` を当てる。
 */
type Props = {
  /** 最終値（例：60.8） */
  value: number;
  /** 小数点以下の桁数（既定 0） */
  decimals?: number;
  /** 数字の前に付ける文字（例：「約」） */
  prefix?: string;
  /** 数字の後に付ける文字（例：「%」「割」） */
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
};

export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.6,
  delay = 0,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = useCallback(
    (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`,
    [prefix, decimals, suffix],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // すでに視界に入っている数字は触らない（0 へ巻き戻して見せない）
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    const counter = { n: 0 };
    el.textContent = format(0);

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          n: value,
          duration,
          delay,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = format(counter.n);
          },
          onComplete: () => {
            el.textContent = format(value);
          },
        });
      },
    });

    return () => {
      trigger.kill();
      gsap.killTweensOf(counter);
      el.textContent = format(value);
    };
  }, [value, duration, delay, format]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
