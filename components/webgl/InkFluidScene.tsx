"use client";

import { useEffect, useRef, useState } from "react";
import { createFluidSim, type FluidSimAPI } from "@/lib/webgl/fluidSim";
import styles from "./InkFluidScene.module.css";

export default function InkFluidScene() {
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
          brightness: 0.25,
          bgBase: 0.039,
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

      let t0 = -1;
      let tPrev = 0;

      function loop(timestamp: number) {
        if (!ink) return;
        if (!isVisible) {
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

        // Phase 1 (0-0.7s): Ink drip injection
        if (elapsed < 0.7) {
          const decay = Math.pow(1.0 - elapsed / 0.7, 3);
          const force = 600 * decay;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + elapsed * 3.0;
            ink.splat(0.5, 0.5, Math.cos(angle) * force, Math.sin(angle) * force, 0, 0.006);
          }
          ink.splat(0.5, 0.5, 0, 0, 0.5 * decay, 0.012);
          if (elapsed < 0.5 && Math.random() < 0.6) {
            const ra = Math.random() * Math.PI * 2;
            const rd = 0.05 + Math.random() * 0.10;
            const rx = 0.5 + Math.cos(ra) * rd;
            const ry = 0.5 + Math.sin(ra) * rd;
            const rf = 150 + Math.random() * 300;
            ink.splat(rx, ry, Math.cos(ra) * rf, Math.sin(ra) * rf, 0.25, 0.005);
          }
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
