"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const TRACES = [
  { d: "M100,200 H300 V400 H500", nodes: [[100,200],[300,200],[300,400],[500,400]] },
  { d: "M800,100 V350 H1000 V500", nodes: [[800,100],[800,350],[1000,350],[1000,500]] },
  { d: "M1400,300 H1200 V600 H1500 V450", nodes: [[1400,300],[1200,300],[1200,600],[1500,600],[1500,450]] },
  { d: "M200,700 H450 V900 H700", nodes: [[200,700],[450,700],[450,900],[700,900]] },
  { d: "M1600,150 V400 H1800 V650", nodes: [[1600,150],[1600,400],[1800,400],[1800,650]] },
  { d: "M900,600 H1100 V800 H1300 V700", nodes: [[900,600],[1100,600],[1100,800],[1300,800],[1300,700]] },
];

/**
 * Service FV背景 — サーキットパターン（旧service.js initCircuitPattern移植）
 * SVG回路線トレースにstrokeDashoffsetアニメーション、ノードは明滅。
 */
export default function FVCircuitPattern() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 1920 1080");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.position = "absolute";
    svg.style.width = "100%";
    svg.style.height = "100%";

    const tweens: gsap.core.Tween[] = [];

    TRACES.forEach((t, i) => {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", t.d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "rgba(255,255,255,0.15)");
      path.setAttribute("stroke-width", "0.8");
      path.setAttribute("stroke-dasharray", "8 20");
      path.style.willChange = "stroke-dashoffset";
      svg.appendChild(path);

      tweens.push(
        gsap.to(path, {
          strokeDashoffset: -56,
          duration: 4,
          ease: "none",
          repeat: -1,
          delay: i * 1,
        })
      );

      t.nodes.forEach((n) => {
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", String(n[0] - 2));
        rect.setAttribute("y", String(n[1] - 2));
        rect.setAttribute("width", "4");
        rect.setAttribute("height", "4");
        rect.setAttribute("fill", "rgba(255,255,255,0.12)");
        svg.appendChild(rect);

        gsap.set(rect, { opacity: 0.10 });
        tweens.push(
          gsap.to(rect, {
            opacity: 0.20,
            duration: 3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          })
        );
      });
    });

    container.appendChild(svg);

    return () => {
      tweens.forEach((tw) => tw.kill());
      if (svg.parentNode) svg.parentNode.removeChild(svg);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    />
  );
}
