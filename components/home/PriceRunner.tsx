"use client";

import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * SVG棒人間が画面左端から走ってきて、価格の数字を所定位置に降ろすアニメーション。
 * data-price-amount 属性がついた要素を検知し、その位置に向かって走る。
 */

const FIGURE_W = 48;
const FIGURE_H = 72;

/* ---------- SVG stick figure (one per price row) ---------- */
function StickFigure({ id }: { id: string }) {
  return (
    <svg
      data-runner={id}
      width={FIGURE_W}
      height={FIGURE_H}
      viewBox="0 0 48 72"
      fill="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      {/* head */}
      <circle data-part="head" cx="24" cy="10" r="7" stroke="#111" strokeWidth="2.5" />
      {/* body */}
      <line data-part="body" x1="24" y1="17" x2="24" y2="42" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* left arm */}
      <line data-part="armL" x1="24" y1="26" x2="12" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* right arm */}
      <line data-part="armR" x1="24" y1="26" x2="36" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* left leg */}
      <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* right leg */}
      <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* feet */}
      <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- SVG tribot figure (三角ロボ) ---------- */
function TribotFigure({ id }: { id: string }) {
  return (
    <svg
      data-runner={id}
      width={FIGURE_W}
      height={FIGURE_H}
      viewBox="0 0 48 72"
      fill="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      {/* triangle head */}
      <polygon data-part="head" points="24,2 38,22 10,22" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="20" cy="16" r="1.5" fill="#111" />
      <circle cx="28" cy="16" r="1.5" fill="#111" />
      {/* body */}
      <line data-part="body" x1="24" y1="22" x2="24" y2="42" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* left arm */}
      <line data-part="armL" x1="24" y1="28" x2="12" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* right arm */}
      <line data-part="armR" x1="24" y1="28" x2="36" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* left leg */}
      <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* right leg */}
      <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      {/* feet */}
      <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Running cycle timeline ---------- */
function createRunCycle(svg: SVGElement): gsap.core.Timeline {
  const legL = svg.querySelector('[data-part="legL"]')!;
  const legR = svg.querySelector('[data-part="legR"]')!;
  const footL = svg.querySelector('[data-part="footL"]')!;
  const footR = svg.querySelector('[data-part="footR"]')!;
  const armL = svg.querySelector('[data-part="armL"]')!;
  const armR = svg.querySelector('[data-part="armR"]')!;

  const tl = gsap.timeline({ repeat: -1, paused: true });
  const dur = 0.2;

  // Stride A: left forward, right back
  tl.to(legL, { attr: { x2: 34, y2: 62 }, duration: dur, ease: "sine.inOut" }, 0)
    .to(footL, { attr: { x1: 34, y1: 62, x2: 38, y2: 68 }, duration: dur, ease: "sine.inOut" }, 0)
    .to(legR, { attr: { x2: 14, y2: 58 }, duration: dur, ease: "sine.inOut" }, 0)
    .to(footR, { attr: { x1: 14, y1: 58, x2: 10, y2: 64 }, duration: dur, ease: "sine.inOut" }, 0)
    .to(armL, { attr: { x2: 36, y2: 34 }, duration: dur, ease: "sine.inOut" }, 0)
    .to(armR, { attr: { x2: 12, y2: 34 }, duration: dur, ease: "sine.inOut" }, 0);

  // Stride B: right forward, left back
  tl.to(legL, { attr: { x2: 14, y2: 58 }, duration: dur, ease: "sine.inOut" }, dur)
    .to(footL, { attr: { x1: 14, y1: 58, x2: 10, y2: 64 }, duration: dur, ease: "sine.inOut" }, dur)
    .to(legR, { attr: { x2: 34, y2: 62 }, duration: dur, ease: "sine.inOut" }, dur)
    .to(footR, { attr: { x1: 34, y1: 62, x2: 38, y2: 68 }, duration: dur, ease: "sine.inOut" }, dur)
    .to(armL, { attr: { x2: 12, y2: 34 }, duration: dur, ease: "sine.inOut" }, dur)
    .to(armR, { attr: { x2: 36, y2: 34 }, duration: dur, ease: "sine.inOut" }, dur);

  return tl;
}

/* ---------- Raise arms (carrying pose) ---------- */
function armsUp(svg: SVGElement, immediate = false) {
  const armL = svg.querySelector('[data-part="armL"]')!;
  const armR = svg.querySelector('[data-part="armR"]')!;
  const dur = immediate ? 0 : 0.3;
  gsap.to(armL, { attr: { x2: 8, y2: 10 }, duration: dur, ease: "power2.out" });
  gsap.to(armR, { attr: { x2: 40, y2: 10 }, duration: dur, ease: "power2.out" });
}

/* ---------- Lower arms (drop pose) ---------- */
function armsDown(svg: SVGElement) {
  const armL = svg.querySelector('[data-part="armL"]')!;
  const armR = svg.querySelector('[data-part="armR"]')!;
  gsap.to(armL, { attr: { x2: 12, y2: 38 }, duration: 0.35, ease: "power2.inOut" });
  gsap.to(armR, { attr: { x2: 36, y2: 38 }, duration: 0.35, ease: "power2.inOut" });
}

/* ---------- Reset limbs to neutral ---------- */
function resetLimbs(svg: SVGElement) {
  const parts: Record<string, Record<string, number>> = {
    armL: { x2: 12, y2: 38 },
    armR: { x2: 36, y2: 38 },
    legL: { x2: 14, y2: 62 },
    legR: { x2: 34, y2: 62 },
    footL: { x1: 14, y1: 62, x2: 10, y2: 68 },
    footR: { x1: 34, y1: 62, x2: 38, y2: 68 },
  };
  Object.entries(parts).forEach(([key, attrs]) => {
    const el = svg.querySelector(`[data-part="${key}"]`);
    if (el) gsap.set(el, { attr: attrs });
  });
}

/* ---------- Wave goodbye ---------- */
function wave(svg: SVGElement): gsap.core.Timeline {
  const armR = svg.querySelector('[data-part="armR"]')!;
  const tl = gsap.timeline();
  tl.to(armR, { attr: { x2: 42, y2: 8 }, duration: 0.2, ease: "power2.out" })
    .to(armR, { attr: { x2: 38, y2: 14 }, duration: 0.15, ease: "sine.inOut" })
    .to(armR, { attr: { x2: 42, y2: 8 }, duration: 0.15, ease: "sine.inOut" })
    .to(armR, { attr: { x2: 38, y2: 14 }, duration: 0.15, ease: "sine.inOut" })
    .to(armR, { attr: { x2: 36, y2: 38 }, duration: 0.2, ease: "power2.in" });
  return tl;
}

/* ================================================================
   Main Component
   ================================================================ */
export default function PriceRunner() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);

  const play = useCallback(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    const overlay = overlayRef.current;
    if (!overlay) return;
    const section = overlay.parentElement;
    if (!section) return;

    const amountEls = section.querySelectorAll<HTMLElement>("[data-price-amount]");
    if (!amountEls.length) return;

    const sectionRect = section.getBoundingClientRect();

    const runners: {
      svg: SVGElement;
      label: HTMLDivElement;
      runCycle: gsap.core.Timeline;
      targetX: number;
      groundY: number;
      amountEl: HTMLElement;
    }[] = [];

    amountEls.forEach((amountEl, i) => {
      const svg = overlay.querySelector<SVGElement>(`[data-runner="r${i}"]`);
      const label = overlay.querySelector<HTMLDivElement>(`[data-cargo="r${i}"]`);
      if (!svg || !label) return;

      // 各価格要素の位置に合わせてターゲット座標を算出
      const amountRect = amountEl.getBoundingClientRect();
      const targetX = amountRect.left - sectionRect.left + amountRect.width / 2 - FIGURE_W / 2;
      const groundY = amountRect.top - sectionRect.top + amountRect.height / 2 - FIGURE_H / 2;

      // Hide real amount
      amountEl.style.opacity = "0";

      // Copy amount text to cargo label
      label.textContent = amountEl.textContent;

      runners.push({
        svg,
        label,
        runCycle: createRunCycle(svg),
        targetX,
        groundY,
        amountEl,
      });
    });

    // Master timeline
    const master = gsap.timeline();

    runners.forEach((r, i) => {
      const offset = i * 0.8; // stagger between runners
      const startX = -120;

      // Initial state: off-screen left, arms up, carrying cargo
      gsap.set(r.svg, { x: startX, y: r.groundY, opacity: 1 });
      gsap.set(r.label, { x: startX, y: r.groundY - 8, opacity: 1 });
      armsUp(r.svg, true);

      // Phase 1: Run in — figure + cargo move together
      const runDuration = 3.0 + i * 0.3;

      // Body bob during run
      const bobTl = gsap.timeline({ repeat: Math.ceil(runDuration / 0.4) * 2 });
      bobTl.to(r.svg, { y: r.groundY - 4, duration: 0.2, ease: "sine.inOut" })
        .to(r.svg, { y: r.groundY, duration: 0.2, ease: "sine.inOut" });

      master
        // Start run cycle
        .call(() => { r.runCycle.play(); }, [], offset)
        // Move figure to target
        .to(r.svg, {
          x: r.targetX,
          duration: runDuration,
          ease: "power1.inOut",
        }, offset)
        // Move cargo label alongside
        .to(r.label, {
          x: r.targetX,
          duration: runDuration,
          ease: "power1.inOut",
        }, offset)
        // Add body bob
        .add(bobTl, offset)

        // Phase 2: Arrive — stop running, drop cargo
        .call(() => {
          r.runCycle.pause();
          resetLimbs(r.svg);
          armsDown(r.svg);
        }, [], offset + runDuration)
        // Cargo drops down and fades
        .to(r.label, {
          y: r.groundY + 16,
          opacity: 0,
          duration: 0.6,
          ease: "bounce.out",
        }, offset + runDuration + 0.2)
        // Reveal real amount
        .to(r.amountEl, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        }, offset + runDuration + 0.5)

        // Phase 3: Wave + run away
        .add(wave(r.svg), offset + runDuration + 0.8)
        .call(() => { r.runCycle.play(); }, [], offset + runDuration + 1.8)
        .to(r.svg, {
          x: sectionRect.width + 80,
          duration: 2.2,
          ease: "power1.in",
        }, offset + runDuration + 1.8)
        .to(r.svg, { opacity: 0, duration: 0.4 }, offset + runDuration + 3.6);
    });

    // Cleanup overlay after all done
    master.call(() => {
      if (overlay) overlay.style.display = "none";
    });
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const section = overlay.parentElement;
    if (!section) return;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top 65%",
      once: true,
      onEnter: play,
    });

    return () => { trigger.kill(); };
  }, [play]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* Runner 0 */}
      <StickFigure id="r0" />
      <div
        data-cargo="r0"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0,
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: "20px",
          letterSpacing: "0.04em",
          color: "#111",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      />
      {/* Runner 1 */}
      <StickFigure id="r1" />
      <div
        data-cargo="r1"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0,
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: "20px",
          letterSpacing: "0.04em",
          color: "#111",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      />
      {/* Runner 2 (tribot) */}
      <TribotFigure id="r2" />
      <div
        data-cargo="r2"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0,
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: "20px",
          letterSpacing: "0.04em",
          color: "#111",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
