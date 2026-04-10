"use client";

import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./BeliefFigures.module.css";

gsap.registerPlugin(ScrollTrigger);

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ================================================================
   Animations
   ================================================================ */

/** 01: magnifying glass — peek & nod */
function animateMagnify(svg: SVGElement) {
  const armR = svg.querySelector('[data-part="armR"]')!;
  const lens = svg.querySelector('[data-part="lens"]')!;
  const handle = svg.querySelector('[data-part="handle"]')!;
  const head = svg.querySelector('[data-part="head"]')!;

  const tl = gsap.timeline();
  tl.to(svg, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0);
  tl.to(armR, { attr: { x2: 40, y2: 22 }, duration: 0.4, ease: EASE }, 0.3);
  tl.to([lens, handle], { opacity: 1, duration: 0.3 }, 0.5);
  tl.to(svg, { rotation: 8, transformOrigin: "50% 80%", duration: 0.5, ease: EASE }, 0.7);
  // nod
  tl.to(head, { attr: { cy: 16 }, duration: 0.15, ease: "sine.inOut" }, 1.4);
  tl.to(head, { attr: { cy: 12 }, duration: 0.15, ease: "sine.inOut" }, 1.55);
  tl.to(head, { attr: { cy: 16 }, duration: 0.15, ease: "sine.inOut" }, 1.8);
  tl.to(head, { attr: { cy: 12 }, duration: 0.15, ease: "sine.inOut" }, 1.95);
  tl.to(svg, { rotation: 0, duration: 0.4, ease: EASE }, 2.2);
  return tl;
}

/** 02: gear — place & spin */
function animateGear(svg: SVGElement) {
  const armR = svg.querySelector('[data-part="armR"]')!;
  const armL = svg.querySelector('[data-part="armL"]')!;
  const gear = svg.querySelector('[data-part="gear"]')!;

  const tl = gsap.timeline();
  tl.to(svg, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0);
  tl.to(armR, { attr: { x2: 42, y2: 18 }, duration: 0.4, ease: EASE }, 0.3);
  tl.to(armL, { attr: { x2: 42, y2: 18 }, duration: 0.4, ease: EASE }, 0.3);
  tl.to(gear, { opacity: 1, duration: 0.3 }, 0.5);
  tl.to(armR, { attr: { x2: 36, y2: 40 }, duration: 0.4, ease: EASE }, 1.2);
  tl.to(armL, { attr: { x2: 12, y2: 40 }, duration: 0.4, ease: EASE }, 1.2);
  tl.to(gear, { rotation: 360, transformOrigin: "48px 18px", duration: 3, ease: "none", repeat: -1 }, 1.0);
  return tl;
}

/** 03: hammer — strike & thumbs up */
function animateHammer(svg: SVGElement) {
  const armR = svg.querySelector('[data-part="armR"]')!;
  const hammer = svg.querySelector('[data-part="hammer"]')!;

  const tl = gsap.timeline();
  tl.to(svg, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0);
  tl.to(armR, { attr: { x2: 40, y2: 14 }, duration: 0.3, ease: EASE }, 0.3);
  tl.to(hammer, { opacity: 1, duration: 0.2 }, 0.4);
  for (let i = 0; i < 3; i++) {
    const t = 0.8 + i * 0.4;
    tl.to(armR, { attr: { x2: 40, y2: 24 }, duration: 0.1, ease: "power2.in" }, t);
    tl.to(hammer, { y: 8, duration: 0.1, ease: "power2.in" }, t);
    tl.to(armR, { attr: { x2: 40, y2: 14 }, duration: 0.15, ease: "power2.out" }, t + 0.1);
    tl.to(hammer, { y: 0, duration: 0.15, ease: "power2.out" }, t + 0.1);
  }
  tl.to(hammer, { opacity: 0, duration: 0.2 }, 2.2);
  tl.to(armR, { attr: { x2: 42, y2: 8 }, duration: 0.3, ease: EASE }, 2.3);
  return tl;
}

/* ================================================================
   Component — renders inside .beliefGrid, positions to each card
   ================================================================ */
export default function BeliefFigures() {
  const ref = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  const play = useCallback(() => {
    if (played.current) return;
    played.current = true;

    const el = ref.current;
    if (!el) return;

    const grid = el.closest("[data-belief-grid]");
    if (!grid) return;

    const cards = grid.querySelectorAll("[data-belief-card]");
    const svgs = el.querySelectorAll<SVGElement>("[data-belief-fig]");
    const animators = [animateMagnify, animateGear, animateHammer];

    svgs.forEach((svg, i) => {
      const card = cards[i] as HTMLElement | undefined;
      if (!card) return;

      // position svg at bottom-right of card
      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const x = cardRect.right - gridRect.left - 56;
      const y = cardRect.bottom - gridRect.top - 68;

      gsap.set(svg, { x, y });
      const tl = animators[i](svg);
      tl.delay(i * 0.6);
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const section = el.closest("section");
    if (!section) return;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      once: true,
      onEnter: play,
    });

    return () => { trigger.kill(); };
  }, [play]);

  return (
    <div ref={ref} className={styles.overlay}>
      {/* 01: magnify */}
      <svg data-belief-fig="0" className={styles.figure} viewBox="0 0 64 80" fill="none">
        <circle data-part="head" cx="24" cy="12" r="7" stroke="#fff" strokeWidth="2" />
        <line data-part="body" x1="24" y1="19" x2="24" y2="44" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="armL" x1="24" y1="28" x2="12" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="armR" x1="24" y1="28" x2="36" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="legL" x1="24" y1="44" x2="16" y2="62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="legR" x1="24" y1="44" x2="32" y2="62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle data-part="lens" cx="46" cy="20" r="8" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0" />
        <line data-part="handle" x1="40" y1="26" x2="36" y2="32" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0" />
      </svg>

      {/* 02: gear */}
      <svg data-belief-fig="1" className={styles.figure} viewBox="0 0 64 80" fill="none">
        <circle data-part="head" cx="24" cy="12" r="7" stroke="#fff" strokeWidth="2" />
        <line data-part="body" x1="24" y1="19" x2="24" y2="44" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="armL" x1="24" y1="28" x2="12" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="armR" x1="24" y1="28" x2="36" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="legL" x1="24" y1="44" x2="16" y2="62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="legR" x1="24" y1="44" x2="32" y2="62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <g data-part="gear" opacity="0">
          <circle cx="48" cy="18" r="7" stroke="#fff" strokeWidth="1.5" fill="none" />
          <circle cx="48" cy="18" r="3" stroke="#fff" strokeWidth="1" fill="none" />
          <line x1="48" y1="9" x2="48" y2="11" stroke="#fff" strokeWidth="1.5" />
          <line x1="48" y1="25" x2="48" y2="27" stroke="#fff" strokeWidth="1.5" />
          <line x1="39" y1="18" x2="41" y2="18" stroke="#fff" strokeWidth="1.5" />
          <line x1="55" y1="18" x2="57" y2="18" stroke="#fff" strokeWidth="1.5" />
        </g>
      </svg>

      {/* 03: hammer */}
      <svg data-belief-fig="2" className={styles.figure} viewBox="0 0 64 80" fill="none">
        <circle data-part="head" cx="24" cy="12" r="7" stroke="#fff" strokeWidth="2" />
        <line data-part="body" x1="24" y1="19" x2="24" y2="44" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="armL" x1="24" y1="28" x2="12" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="armR" x1="24" y1="28" x2="36" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="legL" x1="24" y1="44" x2="16" y2="62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line data-part="legR" x1="24" y1="44" x2="32" y2="62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <g data-part="hammer" opacity="0">
          <line x1="40" y1="14" x2="40" y2="28" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="36" y="10" width="8" height="5" rx="1" stroke="#fff" strokeWidth="1.5" fill="none" />
        </g>
      </svg>
    </div>
  );
}
