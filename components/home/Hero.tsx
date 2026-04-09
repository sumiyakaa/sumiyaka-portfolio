"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import styles from "./Hero.module.css";

interface HeroProps {
  openingDone: boolean;
}

export default function Hero({ openingDone }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openingDone) return;

    // FloatingLogo 表示
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.1, transformOrigin: "left top" },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "cubic-bezier(0.16, 1, 0.3, 1)",
        }
      );
    }

    // FVメインコピー entrance
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });
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
  }, [openingDone]);

  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={logoRef} className={styles.floatingLogo} style={{ opacity: 0 }}>
        <span className={styles.floatingLogoEn}>AKASHIKI</span>
        <span className={styles.floatingLogoSep}>—</span>
        <span className={styles.floatingLogoJp}>灯敷</span>
      </div>

      <div
        className={styles.copy}
        style={{ visibility: openingDone ? "visible" : "hidden" }}
      >
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

      <div
        data-hero-corner
        className={styles.cornerLeft}
        style={{ visibility: openingDone ? "visible" : "hidden" }}
      >
        PORTFOLIO 2026
      </div>
      <div
        data-hero-corner
        className={styles.cornerRight}
        style={{ visibility: openingDone ? "visible" : "hidden" }}
      >
        TOKYO, JAPAN
      </div>

      <div
        data-scroll-indicator
        className={styles.scrollIndicator}
        style={{ visibility: openingDone ? "visible" : "hidden" }}
      >
        <span className={styles.scrollText}>SCROLL</span>
        <div className={styles.scrollLine} />
      </div>
    </section>
  );
}
