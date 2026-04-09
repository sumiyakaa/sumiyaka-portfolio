"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * スクロール連動CSS変数をバインド（旧common.js initScrollProgress移植）
 * - --scroll-progress: ページ全体の進捗（0〜1）
 * - --section-progress: data-scroll-section 付き要素ごとのローカル進捗（0〜1）
 *
 * layout.tsx の SmoothScroll 内で1回だけレンダリングする。
 */
export default function ScrollProgress() {
  useEffect(() => {
    // グローバルスクロール進捗
    const globalTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        document.documentElement.style.setProperty(
          "--scroll-progress",
          self.progress.toFixed(4)
        );
      },
    });

    // セクションごとのローカル進捗
    const sectionTriggers: ScrollTrigger[] = [];
    document
      .querySelectorAll<HTMLElement>("[data-scroll-section]")
      .forEach((section) => {
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            section.style.setProperty(
              "--section-progress",
              self.progress.toFixed(4)
            );
          },
        });
        sectionTriggers.push(st);
      });

    return () => {
      globalTrigger.kill();
      sectionTriggers.forEach((st) => st.kill());
    };
  }, []);

  return null;
}
