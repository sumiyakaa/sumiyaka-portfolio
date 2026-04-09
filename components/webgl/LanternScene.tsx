"use client";

import { useEffect, useRef, useState } from "react";
import { createFluidSim, type FluidSimAPI } from "@/lib/webgl/fluidSim";
import styles from "./LanternScene.module.css";

export default function LanternScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (window.innerWidth <= 768) {
      setFallback(true);
      return;
    }

    let ink: FluidSimAPI | null = null;
    let rafId: number | null = null;
    let isVisible = true;
    let observer: IntersectionObserver | null = null;

    // Wait one frame for DOM layout
    const initFrameId = requestAnimationFrame(() => {
      try {
        ink = createFluidSim(canvas, {
          resolution: 0.5,
          brightness: 0.35,
          bgBase: 0.0,
          velocityDissipation: 0.985,
          dyeDissipation: 0.998,
          vorticity: 30.0,
        });
      } catch {
        setFallback(true);
        return;
      }

      if (!ink) {
        setFallback(true);
        return;
      }

      // Initial burst
      const force = 500;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ink.splat(0.5, 0.5, Math.cos(angle) * force, Math.sin(angle) * force, 0.3, 0.006);
      }
      ink.splat(0.5, 0.5, 0, 0, 0.5, 0.015);

      let t0 = -1;
      let tPrev = 0;
      let nextSplatTime = 2.0;

      function loop(timestamp: number) {
        if (!ink || !isVisible) {
          rafId = requestAnimationFrame(loop);
          return;
        }
        if (t0 < 0) {
          t0 = timestamp;
          tPrev = timestamp;
        }
        const elapsed = (timestamp - t0) * 0.001;
        const dt = Math.min((timestamp - tPrev) * 0.001, 0.033);
        tPrev = timestamp;

        if (elapsed > nextSplatTime) {
          const angle = Math.random() * Math.PI * 2;
          const cx = 0.3 + Math.random() * 0.4;
          const cy = 0.3 + Math.random() * 0.4;
          const f = 150 + Math.random() * 250;
          ink.splat(cx, cy, Math.cos(angle) * f, Math.sin(angle) * f, 0.15, 0.005);
          nextSplatTime = elapsed + 1.5 + Math.random() * 2.5;
        }

        ink.step(dt);
        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);

      observer = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
        },
        { threshold: 0.05 }
      );
      observer.observe(container);
    });

    return () => {
      cancelAnimationFrame(initFrameId);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      if (ink) ink.destroy();
    };
  }, []);

  if (fallback) {
    return <div className={styles.fallback} />;
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
