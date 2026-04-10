"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const FW = 48;
const FH = 72;

/**
 * 送信完了時の棒人間アニメーション。
 * 棒人間が封筒を拾い上げ → 手を振って → 走り去る。
 */
export default function ContactRunner({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const svg = el.querySelector<SVGElement>("[data-cr-fig]");
    const envelope = el.querySelector<SVGElement>("[data-cr-env]");
    if (!svg || !envelope) return;

    const w = el.offsetWidth;
    const groundY = 60;

    // Parts
    const armL = svg.querySelector('[data-part="armL"]')!;
    const armR = svg.querySelector('[data-part="armR"]')!;
    const legL = svg.querySelector('[data-part="legL"]')!;
    const legR = svg.querySelector('[data-part="legR"]')!;
    const footL = svg.querySelector('[data-part="footL"]')!;
    const footR = svg.querySelector('[data-part="footR"]')!;

    // Run cycle
    const runCycle = gsap.timeline({ repeat: -1, paused: true });
    const d = 0.2;
    runCycle
      .to(legL, { attr: { x2: 34, y2: 62 }, duration: d, ease: "sine.inOut" }, 0)
      .to(footL, { attr: { x1: 34, y1: 62, x2: 38, y2: 68 }, duration: d, ease: "sine.inOut" }, 0)
      .to(legR, { attr: { x2: 14, y2: 58 }, duration: d, ease: "sine.inOut" }, 0)
      .to(footR, { attr: { x1: 14, y1: 58, x2: 10, y2: 64 }, duration: d, ease: "sine.inOut" }, 0)
      .to(armL, { attr: { x2: 36, y2: 34 }, duration: d, ease: "sine.inOut" }, 0)
      .to(armR, { attr: { x2: 12, y2: 34 }, duration: d, ease: "sine.inOut" }, 0)
      .to(legL, { attr: { x2: 14, y2: 58 }, duration: d, ease: "sine.inOut" }, d)
      .to(footL, { attr: { x1: 14, y1: 58, x2: 10, y2: 64 }, duration: d, ease: "sine.inOut" }, d)
      .to(legR, { attr: { x2: 34, y2: 62 }, duration: d, ease: "sine.inOut" }, d)
      .to(footR, { attr: { x1: 34, y1: 62, x2: 38, y2: 68 }, duration: d, ease: "sine.inOut" }, d)
      .to(armL, { attr: { x2: 12, y2: 34 }, duration: d, ease: "sine.inOut" }, d)
      .to(armR, { attr: { x2: 36, y2: 34 }, duration: d, ease: "sine.inOut" }, d);

    // Initial: figure at center, envelope on ground
    const cx = w / 2 - FW / 2;
    gsap.set(svg, { x: -80, y: groundY, opacity: 1 });
    gsap.set(envelope, { x: cx, y: groundY + 20, opacity: 1 });

    const master = gsap.timeline({ onComplete });

    // Phase 1: Run to center
    master.call(() => { runCycle.play(); }, [], 0);
    master.to(svg, { x: cx, duration: 1.2, ease: "power1.inOut" }, 0);

    // Bob while running
    const bobTl = gsap.timeline({ repeat: 6 });
    bobTl.to(svg, { y: groundY - 4, duration: 0.2, ease: "sine.inOut" })
      .to(svg, { y: groundY, duration: 0.2, ease: "sine.inOut" });
    master.add(bobTl, 0);

    // Phase 2: Stop, pick up envelope
    master.call(() => {
      runCycle.pause();
      // Reset limbs
      gsap.set(legL, { attr: { x2: 14, y2: 62 } });
      gsap.set(legR, { attr: { x2: 34, y2: 62 } });
      gsap.set(footL, { attr: { x1: 14, y1: 62, x2: 10, y2: 68 } });
      gsap.set(footR, { attr: { x1: 34, y1: 62, x2: 38, y2: 68 } });
    }, [], 1.2);

    // Bend down (arms reach down)
    master.to(armL, { attr: { x2: 20, y2: 48 }, duration: 0.3, ease: "power2.out" }, 1.3);
    master.to(armR, { attr: { x2: 28, y2: 48 }, duration: 0.3, ease: "power2.out" }, 1.3);

    // Lift envelope
    master.to(envelope, { y: groundY - 10, duration: 0.4, ease: "power2.out" }, 1.6);
    master.to(armL, { attr: { x2: 8, y2: 10 }, duration: 0.3, ease: "power2.out" }, 1.7);
    master.to(armR, { attr: { x2: 40, y2: 10 }, duration: 0.3, ease: "power2.out" }, 1.7);
    master.to(envelope, { y: groundY - 30, duration: 0.3, ease: "power2.out" }, 1.7);

    // Phase 3: Wave with envelope above head
    master.to(armR, { attr: { x2: 42, y2: 8 }, duration: 0.2, ease: "power2.out" }, 2.2);
    master.to(armR, { attr: { x2: 38, y2: 14 }, duration: 0.15, ease: "sine.inOut" }, 2.4);
    master.to(armR, { attr: { x2: 42, y2: 8 }, duration: 0.15, ease: "sine.inOut" }, 2.55);
    master.to(armR, { attr: { x2: 38, y2: 14 }, duration: 0.15, ease: "sine.inOut" }, 2.7);
    master.to(armR, { attr: { x2: 40, y2: 10 }, duration: 0.15, ease: "sine.inOut" }, 2.85);

    // Phase 4: Run away with envelope
    master.call(() => { runCycle.play(); }, [], 3.2);
    master.to(svg, { x: w + 80, duration: 1.6, ease: "power1.in" }, 3.2);
    master.to(envelope, { x: w + 80, duration: 1.6, ease: "power1.in" }, 3.2);
    master.to(svg, { opacity: 0, duration: 0.3 }, 4.5);
    master.to(envelope, { opacity: 0, duration: 0.3 }, 4.5);

    return () => { master.kill(); runCycle.kill(); };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 160,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Stick figure */}
      <svg
        data-cr-fig
        width={FW}
        height={FH}
        viewBox="0 0 48 72"
        fill="none"
        style={{ position: "absolute", top: 0, left: 0, opacity: 0 }}
      >
        <circle data-part="head" cx="24" cy="10" r="7" stroke="#111" strokeWidth="2.5" />
        <line data-part="body" x1="24" y1="17" x2="24" y2="42" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        <line data-part="armL" x1="24" y1="26" x2="12" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        <line data-part="armR" x1="24" y1="26" x2="36" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        <line data-part="legL" x1="24" y1="42" x2="14" y2="62" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        <line data-part="legR" x1="24" y1="42" x2="34" y2="62" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        <line data-part="footL" x1="14" y1="62" x2="10" y2="68" stroke="#111" strokeWidth="2" strokeLinecap="round" />
        <line data-part="footR" x1="34" y1="62" x2="38" y2="68" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Envelope */}
      <svg
        data-cr-env
        width="36"
        height="28"
        viewBox="0 0 36 28"
        fill="none"
        style={{ position: "absolute", top: 0, left: 0, opacity: 0 }}
      >
        <rect x="1" y="1" width="34" height="26" rx="2" stroke="#111" strokeWidth="2" fill="#f5f5f5" />
        <polyline points="1,1 18,16 35,1" stroke="#111" strokeWidth="2" fill="none" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
