"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroFXLayer from "./HeroFXLayer";
import styles from "./Hero.module.css";

gsap.registerPlugin(ScrollTrigger);

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** 文字列を個別spanに分割するヘルパー */
function LetterSpan({ text, className }: { text: string; className?: string }) {
  return (
    <span data-hero-line className={className}>
      {text.split("").map((ch, i) =>
        ch === " " ? (
          <span key={i} className={styles.fvSpace} />
        ) : (
          <span key={i} data-hero-letter className={styles.fvLetter}>
            {ch}
          </span>
        )
      )}
    </span>
  );
}

interface HeroProps {
  openingDone: boolean;
}

export default function Hero({ openingDone }: HeroProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // 入場アニメーション → 完了後にスクロールバインド（旧 revealAndBind → bindScroll 順序を再現）
  useEffect(() => {
    if (!openingDone) return;

    const scrollArea = scrollAreaRef.current;
    const sticky = stickyRef.current;
    if (!scrollArea || !sticky) return;

    // FloatingLogo 表示
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.1, transformOrigin: "left top" },
        { opacity: 1, scale: 1, duration: 0.6, ease: EASE }
      );
    }

    const ctx = gsap.context(() => {
      // 初期表示: visibility visible + opacity 0
      const singleSelectors = [
        "[data-hero-main]", "[data-hero-sub]", "[data-hero-aio]",
        "[data-hero-aio-link]", "[data-hero-hr]",
        "[data-hero-corners-svg]",
      ];
      singleSelectors.forEach((sel) => {
        const el = heroRef.current?.querySelector(sel);
        if (el) gsap.set(el, { visibility: "visible", opacity: 0 });
      });
      // エッジテキスト（複数要素）
      heroRef.current?.querySelectorAll("[data-hero-corner]").forEach((el) => {
        gsap.set(el, { visibility: "visible", opacity: 0 });
      });

      // ===== 入場タイムライン（完了後にbindScrollを呼ぶ） =====
      const tl = gsap.timeline({
        delay: 0.1,
        onComplete() {
          // スクロール連動を入場完了後にバインド
          const stConfig = {
            trigger: scrollArea,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
          };

          // 3D tilt
          gsap.fromTo(
            sticky,
            { rotateX: 0, rotateY: 0, scale: 1, transformPerspective: 800 },
            {
              rotateX: 8, rotateY: -3, scale: 0.9, transformPerspective: 800,
              ease: "power1.in", scrollTrigger: stConfig,
            }
          );

          // メインテキスト — Y: -180px
          gsap.fromTo("[data-hero-main]", { y: 0 }, {
            y: -180, ease: "none", scrollTrigger: stConfig,
          });

          // サブ — Y: -100px
          gsap.fromTo("[data-hero-sub]", { y: 0 }, {
            y: -100, ease: "none", scrollTrigger: stConfig,
          });

          // AIO — Y: -90px
          gsap.fromTo("[data-hero-aio]", { y: 0 }, {
            y: -90, ease: "none", scrollTrigger: stConfig,
          });

          // AIO Link — Y: -85px
          gsap.fromTo("[data-hero-aio-link]", { y: 0 }, {
            y: -85, ease: "none", scrollTrigger: stConfig,
          });

          // フェードアウト
          gsap.fromTo(
            [
              "[data-hero-main]", "[data-hero-sub]", "[data-hero-aio]",
              "[data-hero-aio-link]", "[data-hero-hr]",
              "[data-hero-corner]", "[data-hero-corners-svg]",
            ],
            { opacity: 1 },
            {
              opacity: 0, ease: "power1.in",
              scrollTrigger: {
                trigger: scrollArea,
                start: "30% top",
                end: "bottom bottom",
                scrub: 0.5,
              },
            }
          );
        },
      });

      // メイン文字コンテナ — 即時表示
      tl.to("[data-hero-main]", { opacity: 1, duration: 0.01 }, 0);

      // 文字 — スタガー
      tl.from("[data-hero-letter]", {
        y: 20, opacity: 0, duration: 1.4, stagger: 0.08, ease: EASE,
      }, 0);

      // サブコピー
      tl.from("[data-hero-sub]", {
        y: 15, opacity: 0, duration: 1.2, ease: EASE,
      }, 0.3);

      // AIO テキスト
      tl.from("[data-hero-aio]", {
        y: 10, opacity: 0, duration: 1.0, ease: EASE,
      }, 0.5);

      // AIO リンク
      tl.from("[data-hero-aio-link]", {
        y: 8, opacity: 0, duration: 0.8, ease: EASE,
      }, 0.65);

      // HR
      tl.from("[data-hero-hr]", {
        opacity: 0, scaleX: 0, duration: 0.8, ease: EASE, transformOrigin: "left",
      }, 0.6);

      // エッジテキスト
      tl.from("[data-hero-corner]", {
        opacity: 0, duration: 1.0, ease: "power2.out",
      }, 0.8);

      // コーナーSVGコンテナ — 即時表示
      tl.to("[data-hero-corners-svg]", { opacity: 1, duration: 0.01 }, 1.0);

      // コーナーライン — strokeDashoffset
      tl.from("[data-hero-corner-line]", {
        strokeDashoffset: 80, opacity: 0, duration: 1.0, ease: EASE, stagger: 0.1,
      }, 1.0);
    }, heroRef);

    return () => ctx.revert();
  }, [openingDone]);

  return (
    <div ref={scrollAreaRef} className={styles.scrollArea}>
      <section ref={heroRef} className={styles.hero}>
        <div ref={stickyRef} data-hero-sticky className={styles.stickyInner}>
          {/* Floating Logo */}
          <div ref={logoRef} className={styles.floatingLogo} style={{ opacity: 0 }}>
            <span className={styles.floatingLogoEn}>AKASHIKI</span>
            <span className={styles.floatingLogoSep}>—</span>
            <span className={styles.floatingLogoJp}>灯敷</span>
          </div>

          {/* Background Layers */}
          <div className={styles.bg} aria-hidden="true">
            <div className={styles.radial} />
            <div data-hero-orb className={`${styles.orb} ${styles.orb1}`} />
            <div data-hero-orb className={`${styles.orb} ${styles.orb2}`} />
            <div data-hero-orb className={`${styles.orb} ${styles.orb3}`} />
          </div>

          {/* 3D Container */}
          <div className={styles.container} style={{ visibility: openingDone ? "visible" : "hidden" }}>
            <h1 data-hero-main className={styles.mainText} style={{ visibility: "hidden" }}>
              <LetterSpan text="Web DESIGN" className={styles.fvLine} />
              <LetterSpan text="&" className={`${styles.fvLine} ${styles.fvLineAmp}`} />
              <LetterSpan text="DEVELOPMENT" className={styles.fvLine} />
            </h1>

            <p data-hero-sub className={styles.sub} style={{ visibility: "hidden" }}>
              DESIGNED WITH PRECISION
            </p>

            <p data-hero-aio className={styles.aioText} style={{ visibility: "hidden" }}>
              AIO — AI検索最適化を、全案件に標準搭載。
            </p>

            <Link href="/service#aio" data-hero-aio-link className={styles.aioLink} style={{ visibility: "hidden" }}>
              <span>What we do →</span>
            </Link>

            <div data-hero-hr className={styles.hr} style={{ visibility: "hidden" }} />

            <div data-hero-corner className={styles.edgeBl} style={{ visibility: "hidden" }}>
              <span className={styles.edgeText}>PORTFOLIO 2026</span>
            </div>
            <div data-hero-corner className={styles.edgeBr} style={{ visibility: "hidden" }}>
              <span className={styles.edgeText}>TOKYO, JAPAN</span>
            </div>
          </div>

          {/* Corner Frames SVG */}
          <svg
            data-hero-corners-svg
            className={styles.corners}
            style={{ visibility: "hidden" }}
            aria-hidden="true"
            viewBox="0 0 1920 1080"
            preserveAspectRatio="none"
          >
            <polyline data-hero-corner-line className={styles.corner} points="40,80 40,40 80,40" />
            <polyline data-hero-corner-line className={styles.corner} points="1840,40 1880,40 1880,80" />
            <polyline data-hero-corner-line className={styles.corner} points="40,1000 40,1040 80,1040" />
            <polyline data-hero-corner-line className={styles.corner} points="1840,1040 1880,1040 1880,1000" />
          </svg>

          {/* Scanline Overlay */}
          <div className={styles.scanline} aria-hidden="true" />

          {/* FX Layer */}
          <HeroFXLayer active={openingDone} />
        </div>
      </section>
    </div>
  );
}
