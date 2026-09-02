"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * 画面に入っているあいだだけクラスを付ける器（P11・2026-09-03）。
 *
 * 常時走る演出を「見えている時だけ」に限定するための最小の部品。
 * CSS 側は既定を `animation-play-state: paused` にしておき、このクラスが付いた時だけ
 * running にする＝**見えていない間は本当に止まる**（表示を消すだけでは負荷は減らない）。
 *
 * ⚠ 背面タブでも止める。IntersectionObserver だけだと、タブを裏に回しても
 *   「画面内」のままなのでアニメが回り続ける（PickUpWorks で実際にあった不具合）。
 * ⚠ 動きの中身はここでは持たない。クラスを付け外しするだけ。
 */
type Props = {
  children: ReactNode;
  /** 描画するタグ（既定 div） */
  as?: "div" | "ol" | "ul" | "section" | "figure";
  className?: string;
  /** 画面に入っているあいだだけ付くクラス */
  activeClassName: string;
  /** 交差判定のしきい値（既定 0.12＝1割ちょっと見えたら） */
  threshold?: number;
  /** 交差判定の余白（既定 0px） */
  rootMargin?: string;
};

export default function InViewGate({
  children,
  as: Tag = "div",
  className = "",
  activeClassName,
  threshold = 0.12,
  rootMargin = "0px",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let inView = false;

    const sync = () => {
      const live = inView && document.visibilityState === "visible";
      el.classList.toggle(activeClassName, live);
    };

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        sync();
      },
      { threshold, rootMargin },
    );
    io.observe(el);

    document.addEventListener("visibilitychange", sync);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      el.classList.remove(activeClassName);
    };
  }, [activeClassName, threshold, rootMargin]);

  return (
    // @ts-expect-error -- dynamic tag element
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
