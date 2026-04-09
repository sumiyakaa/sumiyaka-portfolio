"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

interface PriceAnimProps {
  children: ReactNode;
  className?: string;
}

/**
 * Priceセクション全体のScrollTriggerアニメーション（旧initPrice移植）
 * セクション出現 / タイトル / カード / CTA を個別タイミングで制御
 */
export default function PriceAnim({ children, className }: PriceAnimProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // セクション全体フェードイン
      gsap.fromTo(
        section,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: EASE,
          scrollTrigger: { trigger: section, start: "top 85%", once: true },
        }
      );

      // タイトルエリア
      const header = section.querySelector("[data-price-header]");
      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0,
            ease: EASE,
            scrollTrigger: { trigger: section, start: "top 80%", once: true },
          }
        );
      }

      // 料金カード — スタガー
      const cards = section.querySelectorAll("[data-price-card]");
      if (cards.length) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0,
            stagger: 0.15,
            ease: EASE,
            scrollTrigger: { trigger: section, start: "top 70%", once: true },
          }
        );
      }

      // CTA リンク
      const cta = section.querySelector("[data-price-cta]");
      if (cta) {
        gsap.fromTo(
          cta,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 1.0,
            ease: "power2.out",
            scrollTrigger: { trigger: section, start: "top 60%", once: true },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={className}>
      {children}
    </section>
  );
}
