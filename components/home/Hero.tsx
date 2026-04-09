"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { gsap } from "gsap";
import styles from "./Hero.module.css";

const OpeningAnimation = dynamic(
  () => import("@/components/webgl/OpeningAnimation"),
  {
    ssr: false,
    loading: () => <div className={styles.webglFallback} />,
  }
);

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      tl.from("[data-hero-line]", {
        y: 80,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "power3.out",
      })
        .from(
          "[data-hero-sub]",
          {
            y: 20,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.5"
        )
        .from(
          "[data-hero-aio]",
          {
            y: 15,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
          },
          "-=0.3"
        )
        .from(
          "[data-hero-corner]",
          {
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          },
          "-=0.3"
        )
        .from(
          "[data-scroll-indicator]",
          {
            opacity: 0,
            y: -10,
            duration: 0.6,
            ease: "power2.out",
          },
          "-=0.2"
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      <OpeningAnimation />

      <div className={styles.copy}>
        <div className={styles.lineWrap}>
          <h1 className={styles.heading}>
            <span data-hero-line className={styles.line}>
              Web DESIGN
            </span>
            <span data-hero-line className={styles.line}>
              &amp; DEVELOPMENT
            </span>
          </h1>
        </div>

        <p data-hero-sub className={styles.sub}>
          DESIGNED WITH PRECISION
        </p>

        <Link href="/service#aio" data-hero-aio className={styles.aio}>
          <span className={styles.aioLabel}>AIO</span>
          <span className={styles.aioDivider} />
          <span className={styles.aioText}>
            AI検索最適化を、全案件に標準搭載。
          </span>
          <span className={styles.aioArrow}>→</span>
        </Link>
      </div>

      <div data-hero-corner className={styles.cornerLeft}>
        PORTFOLIO 2026
      </div>
      <div data-hero-corner className={styles.cornerRight}>
        TOKYO, JAPAN
      </div>

      <div data-scroll-indicator className={styles.scrollIndicator}>
        <span className={styles.scrollText}>SCROLL</span>
        <div className={styles.scrollLine} />
      </div>
    </section>
  );
}
