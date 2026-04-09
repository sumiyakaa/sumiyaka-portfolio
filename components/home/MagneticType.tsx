"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";

interface LineConfig {
  text: string;
  className?: string;
}

interface MagneticTypeProps {
  label: string;
  labelClassName?: string;
  lines: LineConfig[];
  linesClassName?: string;
}

const RADIUS = 160;
const STRENGTH = 70;

export default function MagneticType({
  label,
  labelClassName,
  lines,
  linesClassName,
}: MagneticTypeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    charsRef.current = Array.from(
      container.querySelectorAll<HTMLSpanElement>("[data-mag]")
    );

    let pending = false;
    let mx = 0;
    let my = 0;

    const tick = () => {
      pending = false;
      charsRef.current.forEach((char) => {
        const rect = char.getBoundingClientRect();
        const tx = (gsap.getProperty(char, "x") as number) || 0;
        const ty = (gsap.getProperty(char, "y") as number) || 0;
        const ox = rect.left + rect.width / 2 - tx;
        const oy = rect.top + rect.height / 2 - ty;

        const dx = ox - mx;
        const dy = oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < RADIUS) {
          const force = ((1 - dist / RADIUS) ** 2) * STRENGTH;
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
      charsRef.current.forEach((char) => {
        gsap.to(char, {
          x: 0,
          y: 0,
          duration: 1.2,
          ease: "elastic.out(1, 0.3)",
          overwrite: true,
        });
      });
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <span className={labelClassName}>
        {label.split("").map((ch, i) => (
          <span
            key={i}
            data-mag=""
            style={{ display: "inline-block", willChange: "transform" }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
      <div className={linesClassName}>
        {lines.map((line, li) => (
          <span key={li} className={line.className}>
            {line.text.split("").map((ch, ci) => (
              <span
                key={`${li}-${ci}`}
                data-mag=""
                style={{ display: "inline-block", willChange: "transform" }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
