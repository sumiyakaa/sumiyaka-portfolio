"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersLightVisuals } from "@/lib/device";
import DrawLine from "./DrawLine";
import styles from "./StageSteps.module.css";

gsap.registerPlugin(ScrollTrigger);

export type Stage = {
  /** 丸数字（①②③） */
  mark: string;
  title: string;
  sub: string;
  tag?: string;
  /** 「私がすること」（一文。強調の JSX を含んでよい） */
  mine: ReactNode;
};

type Props = {
  stages: Stage[];
  /** 「私がすること」のラベル（文言は page.tsx が持つ） */
  mineLabel: string;
};

/**
 * 3段階（①②③）＝縦の母線に端子が並ぶ。読み進めると現在地の段が灯る（P12・2026-09-06）。
 *
 *  - 各段は ScrollTrigger の区間判定で `lit` が付く（端子と題字が明るくなる＝CSS の
 *    opacity / text-shadow の遷移だけ）
 *  - 「私がすること」は段が最初に灯った時に一度だけ着地する（x -12→0・opacity 0→1）
 *  - タッチ端末・狭幅・reduced-motion（prefersLightVisuals）と、読み込み時点で既に視界に
 *    ある場合は静的（全段が最初から灯り、着地もしない）
 *  - 文言はすべて props（page.tsx）から。ここは並べ方と動きだけ
 */
export default function StageSteps({ stages, mineLabel }: Props) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ol = ref.current;
    if (!ol) return;
    if (prefersLightVisuals()) return;
    if (ol.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const rows = Array.from(ol.querySelectorAll<HTMLElement>("[data-row]"));
    if (!rows.length) return;
    ol.classList.add(styles.anim);

    const triggers: ScrollTrigger[] = [];
    rows.forEach((row) => {
      const mine = row.querySelector<HTMLElement>("[data-mine]");
      if (mine) gsap.set(mine, { opacity: 0, x: -12 });

      // 画面中央の帯（36〜64%）に掛かっている段だけが灯る（段の高さ≈画面の 2 割＝多くて 2 段）
      triggers.push(
        ScrollTrigger.create({
          trigger: row,
          start: "top 64%",
          end: "bottom 36%",
          onToggle: (self) => row.classList.toggle(styles.lit, self.isActive),
        })
      );
      if (mine) {
        triggers.push(
          ScrollTrigger.create({
            trigger: row,
            start: "top 72%",
            once: true,
            onEnter: () => {
              gsap.to(mine, { opacity: 1, x: 0, duration: 0.7, ease: "expo.out", delay: 0.12 });
            },
          })
        );
      }
    });

    return () => {
      triggers.forEach((t) => t.kill());
      ol.classList.remove(styles.anim);
      rows.forEach((row) => {
        row.classList.remove(styles.lit);
        const mine = row.querySelector<HTMLElement>("[data-mine]");
        if (mine) gsap.set(mine, { clearProps: "opacity,transform" });
      });
    };
  }, [stages]);

  return (
    <div className={styles.wrap}>
      <DrawLine axis="y" className={styles.rail} duration={1.2} />
      <ol ref={ref} className={styles.list}>
        {stages.map((s) => (
          <li key={s.mark} className={styles.row} data-row>
            <span className={styles.mark}>{s.mark}</span>
            <div className={styles.body}>
              <p className={styles.head}>
                <span className={styles.name}>{s.title}</span>
                {s.tag && <span className={styles.tag}>{s.tag}</span>}
              </p>
              <p className={styles.sub}>{s.sub}</p>
              <p className={styles.mine} data-mine>
                <span className={styles.mineLabel}>{mineLabel}</span>
                {s.mine}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
