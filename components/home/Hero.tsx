"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroInkLight from "./HeroInkLight";
import HeroRunner from "./HeroRunner";
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
          <span key={i} data-hero-letter data-hero-mag className={styles.fvLetter} style={{ display: "inline-block", willChange: "transform", opacity: 0 }}>
            {ch}
          </span>
        )
      )}
    </span>
  );
}

/** マグネティック反発用に文字列を個別inline-block spanに分割 */
function magChars(text: string) {
  return text.split("").map((ch, i) => (
    <span
      key={i}
      data-hero-mag=""
      style={{ display: "inline-block", willChange: "transform" }}
    >
      {ch === " " ? "\u00A0" : ch}
    </span>
  ));
}

interface HeroProps {
  openingDone: boolean;
}

export default function Hero({ openingDone }: HeroProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [runnerDone, setRunnerDone] = useState(false);
  const entryDoneRef = useRef(false);
  const scrollBoundRef = useRef(false);

  const handleRunnerComplete = useCallback(() => {
    setRunnerDone(true);
  }, []);

  // 入場アニメーション（タイトル以外）→ 肩書き/サブ/HR/エッジ/コーナー
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
        "[data-hero-main]", "[data-hero-sub]", "[data-hero-sub2]",
        "[data-hero-hr]",
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

      // ===== 入場タイムライン =====
      const tl = gsap.timeline({
        delay: 0.1,
        onComplete() {
          entryDoneRef.current = true;
        },
      });

      // メイン文字コンテナ — 即時表示（文字自体はRunnerが配置する）
      tl.to("[data-hero-main]", { opacity: 1, duration: 0.01 }, 0);

      // 肩書き行
      tl.fromTo("[data-hero-sub]",
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: EASE },
      0);

      // サブコピー
      tl.fromTo("[data-hero-sub2]",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: EASE },
      0);

      // HR
      tl.fromTo("[data-hero-hr]",
        { opacity: 0, scaleX: 0, transformOrigin: "left" },
        { opacity: 1, scaleX: 1, duration: 0.8, ease: EASE },
      0.2);

      // エッジテキスト
      tl.fromTo("[data-hero-corner]",
        { opacity: 0 },
        { opacity: 1, duration: 1.0, ease: "power2.out" },
      0.15);

      // コーナーSVGコンテナ
      tl.to("[data-hero-corners-svg]", { opacity: 1, duration: 0.01 }, 0.2);

      // コーナーライン
      tl.from("[data-hero-corner-line]", {
        strokeDashoffset: 80, opacity: 0, duration: 1.0, ease: EASE, stagger: 0.1,
      }, 0.2);
    }, heroRef);

    return () => ctx.revert();
  }, [openingDone]);

  // スクロール連動 — Runner完了後にバインド
  useEffect(() => {
    if (!runnerDone || scrollBoundRef.current) return;
    scrollBoundRef.current = true;

    const scrollArea = scrollAreaRef.current;
    const sticky = stickyRef.current;
    if (!scrollArea || !sticky) return;

    const stConfig = {
      trigger: scrollArea,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
    };

    const ctx = gsap.context(() => {
      // ===== スクロール退場「墨に沈む」 =====
      // 3Dチルト（rotateX/rotateY/transformPerspective）は廃止。
      // FVコンテンツがスクロール量に応じてわずかに沈み（translateY）、
      // H1 が行単位の時差で墨がにじむように静かに消える。
      // 使用プロパティは transform / opacity のみ（filter・blend・3D 不使用）。
      const exitTl = gsap.timeline({ scrollTrigger: stConfig });

      // 沈み — 下の要素ほど深く沈む（3Dなしの奥行き感）
      exitTl.fromTo("[data-hero-main]", { y: 0 }, { y: 36, ease: "power1.in", duration: 1 }, 0);
      exitTl.fromTo("[data-hero-sub]", { y: 0 }, { y: 52, ease: "power1.in", duration: 1 }, 0);
      exitTl.fromTo("[data-hero-sub2]", { y: 0 }, { y: 68, ease: "power1.in", duration: 1 }, 0);
      exitTl.fromTo("[data-hero-hr]", { y: 0 }, { y: 80, ease: "power1.in", duration: 1 }, 0);

      // H1 — 行単位の時差フェード（上の行から順ににじみ消え、軸コピーの行が最後まで残る）
      exitTl.fromTo(
        "[data-hero-line]",
        { opacity: 1, y: 0 },
        { opacity: 0, y: 14, ease: "sine.in", duration: 0.5, stagger: 0.18 },
        0.15
      );

      // 周辺要素のフェード（肩書き・サブ・HR・エッジ・コーナー）
      exitTl.fromTo(
        [
          "[data-hero-sub]", "[data-hero-sub2]", "[data-hero-hr]",
          "[data-hero-corner]", "[data-hero-corners-svg]",
        ],
        { opacity: 1 },
        { opacity: 0, ease: "power1.in", duration: 0.6 },
        0.35
      );
    }, heroRef);

    return () => ctx.revert();
  }, [runnerDone]);

  // マグネティック反発エフェクト（PC only）— Runner完了後に有効化
  useEffect(() => {
    if (!runnerDone) return;
    if (typeof window !== "undefined" && window.innerWidth <= 768) return;

    const hero = heroRef.current;
    if (!hero) return;

    const chars = Array.from(
      hero.querySelectorAll<HTMLSpanElement>("[data-hero-mag]")
    );
    if (!chars.length) return;

    const MAG_RADIUS = 160;
    const MAG_STRENGTH = 70;
    let pending = false;
    let mx = 0;
    let my = 0;

    const tick = () => {
      pending = false;
      chars.forEach((char) => {
        const rect = char.getBoundingClientRect();
        const tx = (gsap.getProperty(char, "x") as number) || 0;
        const ty = (gsap.getProperty(char, "y") as number) || 0;
        const ox = rect.left + rect.width / 2 - tx;
        const oy = rect.top + rect.height / 2 - ty;

        const dx = ox - mx;
        const dy = oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAG_RADIUS) {
          const force = ((1 - dist / MAG_RADIUS) ** 2) * MAG_STRENGTH;
          const angle = Math.atan2(dy, dx);
          gsap.to(char, {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
        } else {
          gsap.to(char, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "elastic.out(1, 0.4)",
            overwrite: "auto",
          });
        }
      });
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!pending) {
        pending = true;
        requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      chars.forEach((char) => {
        gsap.to(char, {
          x: 0,
          y: 0,
          duration: 1.2,
          ease: "elastic.out(1, 0.3)",
          overwrite: true,
        });
      });
    };

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
    };
  }, [runnerDone]);

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

          {/* Background — 複合常時アニメ「墨 × 灯」（旧 .bg オーブ＋HeroFXLayer を置換）
              ignite: HeroRunner 完走で H1 の真上に灯がともる（未完走でも常時アニメ単独成立） */}
          <HeroInkLight active={openingDone} ignite={runnerDone} />

          {/* Content Container */}
          <div className={styles.container} style={{ visibility: openingDone ? "visible" : "hidden" }}>
            <h1 data-hero-main className={styles.mainText} style={{ visibility: "hidden" }}>
              <LetterSpan text="バラバラな事務作業を、" className={styles.fvLine} />
              <LetterSpan text="ひとりでに回る" className={styles.fvLine} />
              <LetterSpan text="仕組みに変えます。" className={styles.fvLine} />
            </h1>

            <p data-hero-sub className={styles.sub} style={{ visibility: "hidden" }}>
              {magChars("業務効率化の設計と実装 — 墨家 / SUMIYAKA")}
            </p>

            <p data-hero-sub2 className={styles.sub2} style={{ visibility: "hidden" }}>
              {magChars("設計から実装・公開まで、すべて一人で。")}
            </p>

            <div data-hero-hr className={styles.hr} style={{ visibility: "hidden" }} />

            <div data-hero-corner className={styles.edgeBl} style={{ visibility: "hidden" }}>
              <span className={styles.edgeText}>{magChars("PORTFOLIO 2026")}</span>
            </div>
            <div data-hero-corner className={styles.edgeBr} style={{ visibility: "hidden" }}>
              <span className={styles.edgeText}>{magChars("TOKYO, JAPAN")}</span>
            </div>
          </div>

          {/* HeroRunner — 文字運搬アニメーション */}
          <HeroRunner active={openingDone} onComplete={handleRunnerComplete} />

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
        </div>
      </section>
    </div>
  );
}
