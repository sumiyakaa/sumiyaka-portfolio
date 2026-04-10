"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";

/* =================================================================
   Constants
   ================================================================= */
const FW = 48;
const FH = 72;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* =================================================================
   Character type definitions
   ================================================================= */
type CharType =
  | "stick"
  | "blob"
  | "tribot"
  | "ghost"
  | "ninja"
  | "cat"
  | "pixel"
  | "brush"
  | "worker"
  | "shadow";

/* Letter → character mapping (21 letters) */
const LETTER_CHARS: { letter: string; line: number; char: CharType }[] = [
  // Line 0: "Web DESIGN"
  { letter: "W", line: 0, char: "stick" },
  { letter: "e", line: 0, char: "tribot" },
  { letter: "b", line: 0, char: "ninja" },
  // space
  { letter: "D", line: 0, char: "worker" },
  { letter: "E", line: 0, char: "pixel" },
  { letter: "S", line: 0, char: "blob" },
  { letter: "I", line: 0, char: "ghost" },
  { letter: "G", line: 0, char: "cat" },
  { letter: "N", line: 0, char: "brush" },
  // Line 1: "&"
  { letter: "&", line: 1, char: "shadow" },
  // Line 2: "DEVELOPMENT"
  { letter: "D", line: 2, char: "blob" },
  { letter: "E", line: 2, char: "cat" },
  { letter: "V", line: 2, char: "ghost" },
  { letter: "E", line: 2, char: "brush" },
  { letter: "L", line: 2, char: "shadow" },
  { letter: "O", line: 2, char: "stick" },
  { letter: "P", line: 2, char: "tribot" },
  { letter: "M", line: 2, char: "ninja" },
  { letter: "E", line: 2, char: "worker" },
  { letter: "N", line: 2, char: "pixel" },
  { letter: "T", line: 2, char: "blob" },
];

/* =================================================================
   SVG Character Renderers
   ================================================================= */
function renderCharSVG(type: CharType, id: string) {
  const common: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
    pointerEvents: "none",
  };

  switch (type) {
    /* ---------- 棒人間 ---------- */
    case "stick":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <circle data-part="head" cx="24" cy="10" r="7" stroke="#fff" strokeWidth="2.5" />
          <line data-part="body" x1="24" y1="17" x2="24" y2="42" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armL" x1="24" y1="26" x2="12" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="24" y1="26" x2="36" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    /* ---------- 丸キャラ（スライム風） ---------- */
    case "blob":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <ellipse data-part="head" cx="24" cy="30" rx="16" ry="18" stroke="#fff" strokeWidth="2.5" />
          <circle cx="18" cy="26" r="2" fill="#fff" />
          <circle cx="30" cy="26" r="2" fill="#fff" />
          <line data-part="armL" x1="10" y1="32" x2="2" y2="40" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="38" y1="32" x2="46" y2="40" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legL" x1="18" y1="48" x2="14" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legR" x1="30" y1="48" x2="34" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    /* ---------- 三角ロボ ---------- */
    case "tribot":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <polygon data-part="head" points="24,2 38,22 10,22" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="20" cy="16" r="1.5" fill="#fff" />
          <circle cx="28" cy="16" r="1.5" fill="#fff" />
          <line data-part="body" x1="24" y1="22" x2="24" y2="42" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armL" x1="24" y1="28" x2="12" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="24" y1="28" x2="36" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    /* ---------- 幽霊 ---------- */
    case "ghost":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <path data-part="head" d="M10,30 Q10,6 24,6 Q38,6 38,30 L38,56 Q34,50 30,56 Q26,50 22,56 Q18,50 14,56 Q10,50 10,56 Z" stroke="#fff" strokeWidth="2.5" />
          <circle cx="18" cy="24" r="2.5" fill="#fff" />
          <circle cx="30" cy="24" r="2.5" fill="#fff" />
          <line data-part="armL" x1="10" y1="34" x2="2" y2="42" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="38" y1="34" x2="46" y2="42" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    /* ---------- 忍者 ---------- */
    case "ninja":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <circle data-part="head" cx="24" cy="10" r="7" stroke="#fff" strokeWidth="2.5" />
          <line x1="14" y1="10" x2="34" y2="10" stroke="#fff" strokeWidth="2.5" />
          <circle cx="20" cy="9" r="1.5" fill="#fff" />
          <circle cx="28" cy="9" r="1.5" fill="#fff" />
          <line x1="34" y1="8" x2="44" y2="4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="34" y1="12" x2="44" y2="14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <line data-part="body" x1="24" y1="17" x2="24" y2="42" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armL" x1="24" y1="26" x2="12" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="24" y1="26" x2="36" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    /* ---------- ネコ ---------- */
    case "cat":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <circle data-part="head" cx="24" cy="12" r="8" stroke="#fff" strokeWidth="2.5" />
          <polygon points="16,5 13,0 19,4" fill="#fff" />
          <polygon points="32,5 35,0 29,4" fill="#fff" />
          <circle cx="20" cy="11" r="1.5" fill="#fff" />
          <circle cx="28" cy="11" r="1.5" fill="#fff" />
          <line x1="24" y1="15" x2="24" y2="16" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <line data-part="body" x1="24" y1="20" x2="24" y2="42" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armL" x1="24" y1="28" x2="12" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="24" y1="28" x2="36" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path data-part="tail" d="M24,42 Q40,38 42,28 Q44,22 40,20" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );

    /* ---------- ドット絵 ---------- */
    case "pixel":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <rect data-part="head" x="16" y="2" width="16" height="16" stroke="#fff" strokeWidth="2" />
          <rect x="20" y="8" width="3" height="3" fill="#fff" />
          <rect x="27" y="8" width="3" height="3" fill="#fff" />
          <rect data-part="body" x="18" y="18" width="12" height="16" stroke="#fff" strokeWidth="2" />
          <line data-part="armL" x1="18" y1="22" x2="8" y2="36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="30" y1="22" x2="40" y2="36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legL" x1="20" y1="34" x2="14" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legR" x1="28" y1="34" x2="34" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    /* ---------- 筆文字風棒人間 ---------- */
    case "brush":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <circle data-part="head" cx="24" cy="10" r="7" stroke="#fff" strokeWidth="3.5" strokeDasharray="2 3" />
          <line data-part="body" x1="24" y1="17" x2="24" y2="42" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="4 2" />
          <line data-part="armL" x1="24" y1="26" x2="12" y2="38" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 2" />
          <line data-part="armR" x1="24" y1="26" x2="36" y2="38" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 2" />
          <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="4 2" />
          <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="4 2" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    /* ---------- 作業員 ---------- */
    case "worker":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <line x1="14" y1="4" x2="34" y2="4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14,4 Q14,0 24,0 Q34,0 34,4" stroke="#fff" strokeWidth="2" fill="none" />
          <circle data-part="head" cx="24" cy="12" r="7" stroke="#fff" strokeWidth="2.5" />
          <circle cx="21" cy="11" r="1.5" fill="#fff" />
          <circle cx="27" cy="11" r="1.5" fill="#fff" />
          <line data-part="body" x1="24" y1="19" x2="24" y2="42" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armL" x1="24" y1="26" x2="12" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="armR" x1="24" y1="26" x2="36" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    /* ---------- 影絵人形 ---------- */
    case "shadow":
      return (
        <svg data-runner={id} width={FW} height={FH} viewBox="0 0 48 72" fill="none" style={common}>
          <circle data-part="head" cx="24" cy="10" r="7" fill="#fff" />
          <path data-part="body" d="M24,17 L24,42" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <line data-part="armL" x1="24" y1="24" x2="10" y2="36" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <line data-part="armR" x1="24" y1="24" x2="38" y2="36" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <line data-part="legL" x1="24" y1="42" x2="12" y2="62" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <line data-part="legR" x1="24" y1="42" x2="36" y2="62" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <line data-part="footL" x1="12" y1="62" x2="8" y2="68" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line data-part="footR" x1="36" y1="62" x2="40" y2="68" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
  }
}

/* =================================================================
   Limb helpers (shared across all character types with legs/arms)
   ================================================================= */
function getArmOrigin(type: CharType) {
  switch (type) {
    case "blob": return { lx1: 10, ly1: 32, rx1: 38, ry1: 32 };
    case "ghost": return { lx1: 10, ly1: 34, rx1: 38, ry1: 34 };
    case "pixel": return { lx1: 18, ly1: 22, rx1: 30, ry1: 22 };
    case "cat": return { lx1: 24, ly1: 28, rx1: 24, ry1: 28 };
    case "tribot": return { lx1: 24, ly1: 28, rx1: 24, ry1: 28 };
    case "shadow": return { lx1: 24, ly1: 24, rx1: 24, ry1: 24 };
    default: return { lx1: 24, ly1: 26, rx1: 24, ry1: 26 };
  }
}

function getLegOrigin(type: CharType) {
  switch (type) {
    case "blob": return { lx1: 18, ly1: 48, rx1: 30, ry1: 48 };
    case "pixel": return { lx1: 20, ly1: 34, rx1: 28, ry1: 34 };
    default: return { lx1: 24, ly1: 42, rx1: 24, ry1: 42 };
  }
}

function hasLegs(type: CharType) {
  return type !== "ghost";
}

function createRunCycle(svg: SVGElement, type: CharType): gsap.core.Timeline {
  const armL = svg.querySelector('[data-part="armL"]');
  const armR = svg.querySelector('[data-part="armR"]');

  const tl = gsap.timeline({ repeat: -1, paused: true });
  const dur = 0.2;

  if (hasLegs(type)) {
    const legL = svg.querySelector('[data-part="legL"]')!;
    const legR = svg.querySelector('[data-part="legR"]')!;
    const footL = svg.querySelector('[data-part="footL"]');
    const footR = svg.querySelector('[data-part="footR"]');
    const lo = getLegOrigin(type);

    // Stride A
    tl.to(legL, { attr: { x2: lo.rx1 + 10, y2: 62 }, duration: dur, ease: "sine.inOut" }, 0)
      .to(legR, { attr: { x2: lo.lx1 - 10, y2: 58 }, duration: dur, ease: "sine.inOut" }, 0);
    if (footL) tl.to(footL, { attr: { x1: lo.rx1 + 10, y1: 62, x2: lo.rx1 + 14, y2: 68 }, duration: dur, ease: "sine.inOut" }, 0);
    if (footR) tl.to(footR, { attr: { x1: lo.lx1 - 10, y1: 58, x2: lo.lx1 - 14, y2: 64 }, duration: dur, ease: "sine.inOut" }, 0);

    // Stride B
    tl.to(legL, { attr: { x2: lo.lx1 - 10, y2: 58 }, duration: dur, ease: "sine.inOut" }, dur)
      .to(legR, { attr: { x2: lo.rx1 + 10, y2: 62 }, duration: dur, ease: "sine.inOut" }, dur);
    if (footL) tl.to(footL, { attr: { x1: lo.lx1 - 10, y1: 58, x2: lo.lx1 - 14, y2: 64 }, duration: dur, ease: "sine.inOut" }, dur);
    if (footR) tl.to(footR, { attr: { x1: lo.rx1 + 10, y1: 62, x2: lo.rx1 + 14, y2: 68 }, duration: dur, ease: "sine.inOut" }, dur);
  } else {
    // Ghost: bob up/down instead
    tl.to(svg, { y: "-=4", duration: 0.3, ease: "sine.inOut" }, 0)
      .to(svg, { y: "+=4", duration: 0.3, ease: "sine.inOut" }, 0.3);
  }

  if (armL && armR) {
    const ao = getArmOrigin(type);
    tl.to(armL, { attr: { x2: ao.lx1 + 12, y2: ao.ly1 - 4 }, duration: dur, ease: "sine.inOut" }, 0)
      .to(armR, { attr: { x2: ao.rx1 - 12, y2: ao.ry1 - 4 }, duration: dur, ease: "sine.inOut" }, 0)
      .to(armL, { attr: { x2: ao.lx1 - 12, y2: ao.ly1 - 4 }, duration: dur, ease: "sine.inOut" }, dur)
      .to(armR, { attr: { x2: ao.rx1 + 12, y2: ao.ry1 - 4 }, duration: dur, ease: "sine.inOut" }, dur);
  }

  return tl;
}

function armsUp(svg: SVGElement, type: CharType, immediate = false) {
  const armL = svg.querySelector('[data-part="armL"]');
  const armR = svg.querySelector('[data-part="armR"]');
  if (!armL || !armR) return;
  const ao = getArmOrigin(type);
  const dur = immediate ? 0 : 0.3;
  gsap.to(armL, { attr: { x2: ao.lx1 - 16, y2: ao.ly1 - 20 }, duration: dur, ease: "power2.out" });
  gsap.to(armR, { attr: { x2: ao.rx1 + 16, y2: ao.ry1 - 20 }, duration: dur, ease: "power2.out" });
}

function resetLimbs(svg: SVGElement, type: CharType) {
  const ao = getArmOrigin(type);
  const lo = getLegOrigin(type);
  const parts: Record<string, Record<string, number>> = {
    armL: { x2: ao.lx1 - 12, y2: ao.ly1 + 12 },
    armR: { x2: ao.rx1 + 12, y2: ao.ry1 + 12 },
  };
  if (hasLegs(type)) {
    parts.legL = { x2: lo.lx1 - 10, y2: 62 };
    parts.legR = { x2: lo.rx1 + 10, y2: 62 };
    parts.footL = { x1: lo.lx1 - 10, y1: 62, x2: lo.lx1 - 14, y2: 68 };
    parts.footR = { x1: lo.rx1 + 10, y1: 62, x2: lo.rx1 + 14, y2: 68 };
  }
  Object.entries(parts).forEach(([key, attrs]) => {
    const el = svg.querySelector(`[data-part="${key}"]`);
    if (el) gsap.set(el, { attr: attrs });
  });
}

function wave(svg: SVGElement, type: CharType): gsap.core.Timeline {
  const armR = svg.querySelector('[data-part="armR"]');
  const tl = gsap.timeline();
  if (!armR) return tl;
  const ao = getArmOrigin(type);
  tl.to(armR, { attr: { x2: ao.rx1 + 18, y2: ao.ry1 - 22 }, duration: 0.2, ease: "power2.out" })
    .to(armR, { attr: { x2: ao.rx1 + 14, y2: ao.ry1 - 16 }, duration: 0.15, ease: "sine.inOut" })
    .to(armR, { attr: { x2: ao.rx1 + 18, y2: ao.ry1 - 22 }, duration: 0.15, ease: "sine.inOut" })
    .to(armR, { attr: { x2: ao.rx1 + 14, y2: ao.ry1 - 16 }, duration: 0.15, ease: "sine.inOut" })
    .to(armR, { attr: { x2: ao.rx1 + 12, y2: ao.ry1 + 12 }, duration: 0.2, ease: "power2.in" });
  return tl;
}

/* =================================================================
   Main Component
   ================================================================= */
interface HeroRunnerProps {
  active: boolean;
  onComplete: () => void;
}

export default function HeroRunner({ active, onComplete }: HeroRunnerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const runCyclesRef = useRef<gsap.core.Timeline[]>([]);

  const play = useCallback(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const heroContainer = overlay.closest("[data-hero-sticky]");
    if (!heroContainer) return;

    const letterEls = heroContainer.querySelectorAll<HTMLElement>("[data-hero-letter]");
    if (!letterEls.length) return;

    const containerRect = overlay.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    const figScale = isMobile ? 0.6 : 1;
    const scaledW = FW * figScale;
    const scaledH = FH * figScale;

    runCyclesRef.current = [];
    const master = gsap.timeline({
      onComplete() {
        // Kill all run cycles
        runCyclesRef.current.forEach((rc) => rc.kill());
        runCyclesRef.current = [];
        if (overlay) overlay.style.display = "none";
        onComplete();
      },
    });
    masterRef.current = master;

    // Hide all letters initially
    letterEls.forEach((el) => {
      gsap.set(el, { opacity: 0 });
    });

    // Deterministic random based on index
    const seed = (i: number) => ((i * 7 + 13) % 21) / 21;

    let letterIdx = 0;
    LETTER_CHARS.forEach((item, i) => {
      // Find the matching letter element
      const el = letterEls[letterIdx];
      if (!el) return;
      letterIdx++;

      const svg = overlay.querySelector<SVGElement>(`[data-runner="hr${i}"]`);
      const label = overlay.querySelector<HTMLElement>(`[data-cargo="hr${i}"]`);
      if (!svg || !label) return;

      const elRect = el.getBoundingClientRect();
      const targetX = elRect.left - containerRect.left + elRect.width / 2 - scaledW / 2;
      const targetY = elRect.top - containerRect.top + elRect.height / 2 - scaledH / 2;

      // Random direction: left or right
      const fromLeft = seed(i) > 0.5;
      const exitLeft = seed(i + 7) > 0.5;
      const startX = fromLeft ? -120 : containerRect.width + 80;
      const exitX = exitLeft ? -120 : containerRect.width + 80;

      // Copy letter text to cargo
      label.textContent = item.letter;

      // Scale the figure for mobile
      gsap.set(svg, { scale: figScale, transformOrigin: "center center" });

      // Initial state
      gsap.set(svg, { x: startX, y: targetY, opacity: 1 });
      gsap.set(label, { x: startX + scaledW / 2 - 8, y: targetY - 12, opacity: 1 });
      armsUp(svg, item.char, true);

      // Stagger offset
      const stagger = isMobile ? 0.12 : 0.18;
      const offset = i * stagger;
      const runDuration = isMobile ? 1.2 : 1.8;

      // Flip figure if coming from right
      if (!fromLeft) {
        gsap.set(svg, { scaleX: -figScale });
      }

      const runCycle = createRunCycle(svg, item.char);
      runCyclesRef.current.push(runCycle);

      // Phase 1: Run in
      master
        .call(() => { runCycle.play(); }, [], offset)
        .to(svg, { x: targetX, duration: runDuration, ease: "power1.inOut" }, offset)
        .to(label, { x: targetX + scaledW / 2 - 8, duration: runDuration, ease: "power1.inOut" }, offset);

      // Body bob
      if (hasLegs(item.char)) {
        const bobCount = Math.ceil(runDuration / 0.4) * 2;
        const bobTl = gsap.timeline({ repeat: bobCount });
        bobTl.to(svg, { y: targetY - 4, duration: 0.2, ease: "sine.inOut" })
          .to(svg, { y: targetY, duration: 0.2, ease: "sine.inOut" });
        master.add(bobTl, offset);
      }

      const arriveTime = offset + runDuration;

      // Phase 2: Stop, drop letter
      master
        .call(() => {
          runCycle.pause();
          resetLimbs(svg, item.char);
          // Reset flip
          gsap.to(svg, { scaleX: figScale, duration: 0.1 });
        }, [], arriveTime)
        // Drop cargo
        .to(label, { y: targetY + 10, opacity: 0, duration: 0.4, ease: "bounce.out" }, arriveTime + 0.1)
        // Reveal real letter
        .to(el, { opacity: 1, duration: 0.3, ease: "power2.out" }, arriveTime + 0.2);

      // Phase 3: Wave + exit
      const waveTime = arriveTime + 0.4;
      master.add(wave(svg, item.char), waveTime);

      const exitTime = waveTime + 0.8;
      // Flip if exiting opposite direction
      if (exitLeft) {
        master.call(() => { gsap.set(svg, { scaleX: -figScale }); }, [], exitTime);
      }
      master
        .call(() => { runCycle.play(); }, [], exitTime)
        .to(svg, { x: exitX, duration: 1.4, ease: "power1.in" }, exitTime)
        .to(svg, { opacity: 0, duration: 0.3 }, exitTime + 1.1);
    });
  }, [onComplete]);

  useEffect(() => {
    if (active && !hasPlayed.current) {
      const timer = setTimeout(play, 100);
      return () => clearTimeout(timer);
    }
  }, [active, play]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      masterRef.current?.kill();
      runCyclesRef.current.forEach((rc) => rc.kill());
      runCyclesRef.current = [];
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 20,
      }}
    >
      {LETTER_CHARS.map((item, i) => (
        <div key={`hr${i}`}>
          {renderCharSVG(item.char, `hr${i}`)}
          <div
            data-cargo={`hr${i}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              opacity: 0,
              fontFamily: "var(--font-heading)",
              fontWeight: 100,
              fontSize: "clamp(48px, 8vw, 120px)",
              letterSpacing: "0.08em",
              color: "#fff",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              lineHeight: 1,
            }}
          />
        </div>
      ))}
    </div>
  );
}
