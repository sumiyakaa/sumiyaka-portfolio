"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersLightVisuals } from "@/lib/device";
import styles from "./FigRail.module.css";

gsap.registerPlugin(ScrollTrigger);

export type RailFigure = {
  /** section の id（リンク先） */
  id: string;
  /** 図番 "01".."0N" */
  no: string;
  /** 図のラベル（WHAT I DO など・読み上げと現在地の表示に使う） */
  label: string;
};

type Props = {
  figures: RailFigure[];
};

/**
 * 図番の進捗線（P12・2026-09-06 減量）— /service 図面用の「読み進める装置」。
 *
 * ページ左端に固定した細い縦線に、図番（01…0N）のティックが並ぶ。
 *  - 現在地の図のティックが灯り、ラベルが横に出る（ScrollTrigger の区間判定）
 *  - 進捗の頭（短い横線）が、最初の図の上端〜最後の図の下端をレールの全長に写して滑る
 *    （transform: translateY のみ・スクロール連動）
 *  - 最初の図に入ると現れ、FV へ戻ると消える。最後の図を抜けたら（CTA）消える
 *  - PC のみ（CSS で 1280px 以上かつ pointer:fine）。タッチ端末・狭幅・reduced-motion
 *    （prefersLightVisuals）では出さない＝静的
 *  - ティックは実際のリンク（#id）。キーボードでも図へ飛べる
 */
export default function FigRail({ figures }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    if (prefersLightVisuals()) {
      nav.setAttribute("data-rail", "static");
      return;
    }

    const sections = figures
      .map((f) => document.getElementById(f.id))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length < 2) return;

    const items = Array.from(nav.querySelectorAll<HTMLElement>("[data-fig]"));
    const head = nav.querySelector<HTMLElement>("[data-head]");
    const first = sections[0];
    const last = sections[sections.length - 1];
    const triggers: ScrollTrigger[] = [];

    // 現れる／消える
    triggers.push(
      ScrollTrigger.create({
        trigger: first,
        start: "top 85%",
        onEnter: () => nav.classList.add(styles.on),
        onLeaveBack: () => nav.classList.remove(styles.on),
      })
    );
    triggers.push(
      ScrollTrigger.create({
        trigger: last,
        start: "bottom 45%",
        onEnter: () => nav.classList.add(styles.off),
        onLeaveBack: () => nav.classList.remove(styles.off),
      })
    );

    // 現在地：各図の区間（上端が画面中央を過ぎてから下端が中央を過ぎるまで）で灯る
    sections.forEach((sec, i) => {
      const item = items[i];
      if (!item) return;
      triggers.push(
        ScrollTrigger.create({
          trigger: sec,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => item.classList.toggle(styles.lit, self.isActive),
        })
      );
    });

    // 進捗の頭：最初の図の上端〜最後の図の下端 → 最初のティック〜最後のティック
    if (head && items.length >= 2) {
      const span = () => items[items.length - 1].offsetTop - items[0].offsetTop;
      triggers.push(
        ScrollTrigger.create({
          trigger: first,
          endTrigger: last,
          start: "top 50%",
          end: "bottom 50%",
          onUpdate: (self) => {
            head.style.transform = `translateY(${(self.progress * span()).toFixed(1)}px)`;
          },
        })
      );
    }

    return () => {
      triggers.forEach((t) => t.kill());
      nav.classList.remove(styles.on, styles.off);
      items.forEach((it) => it.classList.remove(styles.lit));
      if (head) head.style.transform = "";
    };
  }, [figures]);

  return (
    <nav ref={ref} className={styles.rail} aria-label="図番で移動">
      <span className={styles.cap} aria-hidden="true">
        FIG.
      </span>
      <div className={styles.track}>
        <span className={styles.line} aria-hidden="true" />
        <span className={styles.head} data-head aria-hidden="true" />
        <ol className={styles.list}>
          {figures.map((f) => (
            <li key={f.id} className={styles.item} data-fig>
              <a href={`#${f.id}`} className={styles.link} aria-label={`FIG. ${f.no} ${f.label}`}>
                <span className={styles.tick} aria-hidden="true" />
                <span className={styles.no} aria-hidden="true">
                  {f.no}
                </span>
                <span className={styles.name} aria-hidden="true">
                  {f.label}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
