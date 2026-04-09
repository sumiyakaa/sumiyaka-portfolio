"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Contact FV背景 — パルスリング（旧contact.js initPulseRings移植）
 * 中心から拡大する同心円SVG。2秒間隔で生成、最大4個同時。
 */
export default function FVPulseRings() {
  const svgRef = useRef<SVGSVGElement>(null);
  const ringsRef = useRef<SVGCircleElement[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function createRing() {
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", "0");
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", "rgba(255,255,255,0.06)");
      circle.setAttribute("stroke-width", "1");
      svg.appendChild(circle);

      // Pool limit: 4
      if (ringsRef.current.length >= 4) {
        const oldest = ringsRef.current.shift();
        if (oldest && oldest.parentNode) {
          oldest.parentNode.removeChild(oldest);
        }
      }
      ringsRef.current.push(circle);

      gsap.to(circle, {
        attr: { r: maxR },
        opacity: 0,
        duration: 4,
        ease: "none",
        onComplete: () => {
          if (circle.parentNode) circle.parentNode.removeChild(circle);
          ringsRef.current = ringsRef.current.filter((r) => r !== circle);
        },
      });
    }

    // Create first ring immediately, then every 2 seconds
    createRing();
    intervalRef.current = setInterval(createRing, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      ringsRef.current.forEach((ring) => {
        if (ring.parentNode) ring.parentNode.removeChild(ring);
      });
      ringsRef.current = [];
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
      aria-hidden="true"
    />
  );
}
