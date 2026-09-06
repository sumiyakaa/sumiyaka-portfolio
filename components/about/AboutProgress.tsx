"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/components/animation/SmoothScroll";
import styles from "./AboutProgress.module.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * 進捗線（P12・2026-09-06 減量）— /about 濃・墨。
 *
 * ページ左端に細い一線を固定し、セクションの連番（01〜）と現在地を示す。
 * 「いま何番目を読んでいて、あと何節あるか」が見える＝読み進める装置。
 *
 *  - 対象は main 内の [data-about-sec]（連番）と data-about-label（節名）。
 *  - PC（1280 以上・pointer: fine）だけに出す。SP・タブレットは CSS で非表示＋JS も起動しない。
 *  - 動かすのは transform（線の伸び＝scaleY・現在地の点＝scale）/ opacity / box-shadow だけ。
 *  - prefers-reduced-motion では線の伸びを止め、現在地の印だけ即時に切り替える（静的）。
 *  - body 直下へ portal で描く＝template.tsx の PageTransition（transform 付きラッパー）の
 *    影響を受けずに position: fixed が効く。
 *  - 連番は押せる（Lenis の scrollTo・無ければ scrollIntoView）。
 */
type Sec = { index: string; label: string };

const SEC_SELECTOR = "main [data-about-sec]";

export default function AboutProgress() {
  const [secs, setSecs] = useState<Sec[]>([]);
  const [current, setCurrent] = useState(-1);
  // PC 判定（幅とポインタ）。リサイズで跨いだ時も追従する
  const pc = useMediaQuery("(min-width: 1280px) and (pointer: fine)");
  const rootRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();

  // セクションの収集（マウント後・DOM から）
  useEffect(() => {
    // DOM から拾う「描画後の実測」なので次のフレームで行う
    // （effect の中で同期的に state を書かない＝react-hooks/set-state-in-effect）
    const id = requestAnimationFrame(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(SEC_SELECTOR));
      setSecs(
        els.map((el) => ({
          index: el.dataset.aboutSec ?? "",
          label: el.dataset.aboutLabel ?? "",
        }))
      );
    });
    return () => cancelAnimationFrame(id);
  }, []);


  // スクロール連動（PC のみ）
  useEffect(() => {
    if (!pc || secs.length === 0) return;
    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(SEC_SELECTOR));
    if (els.length !== secs.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = els[0];
    const last = els[els.length - 1];

    const ctx = gsap.context(() => {
      // 出す／しまう＝本文のあいだだけ（FV と CTA・フッターでは消える）
      ScrollTrigger.create({
        trigger: first,
        start: "top 78%",
        endTrigger: last,
        end: "bottom 22%",
        onToggle: (self) => root.classList.toggle(styles.show, self.isActive),
      });

      // 線の伸び＝最初の節の頭から最後の節の尻まで
      if (!reduceMotion) {
        ScrollTrigger.create({
          trigger: first,
          start: "top 50%",
          endTrigger: last,
          end: "bottom 50%",
          onUpdate: (self) => {
            fill.style.transform = `scaleY(${self.progress.toFixed(4)})`;
          },
        });
      }

      // 現在地＝画面の 55% の高さにある節
      els.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setCurrent(i);
          },
        });
      });
    });

    return () => {
      ctx.revert();
      root.classList.remove(styles.show);
    };
  }, [pc, secs]);

  if (secs.length === 0) return null;

  const n = secs.length;
  const cur = current >= 0 ? secs[current] : null;

  const go = (i: number) => {
    const el = document.querySelectorAll<HTMLElement>(SEC_SELECTOR)[i];
    if (!el) return;
    if (lenis) {
      lenis.scrollTo(el, { offset: -60 });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return createPortal(
    <nav ref={rootRef} className={styles.rail} aria-label="ページ内の位置">
      <div className={styles.track}>
        <span ref={fillRef} className={styles.fill} aria-hidden="true" />
        <ol className={styles.ticks}>
          {secs.map((s, i) => (
            <li
              key={s.index}
              className={styles.tickItem}
              style={{ top: `${(i / Math.max(1, n - 1)) * 100}%` }}
            >
              <button
                type="button"
                className={i === current ? `${styles.tick} ${styles.on}` : styles.tick}
                onClick={() => go(i)}
                aria-label={`${s.label} へ移動`}
                aria-current={i === current ? "location" : undefined}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.no}>{s.index}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <span className={styles.name}>
        {cur ? (
          <span key={cur.index} className={styles.nameText}>
            {cur.label}
          </span>
        ) : null}
      </span>
    </nav>,
    document.body
  );
}
