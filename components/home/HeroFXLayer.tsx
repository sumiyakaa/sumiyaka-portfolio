"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Hero FV の装飾FXレイヤー（旧index.js移植）
 * - Wireframe幾何学模様（浮遊する線・三角形・円）
 * - Particle Dust（25個の微粒子）
 * - Orbマウス追従（lerp差分）
 * - Letter Repel（マウス近接で文字反発）
 * - Click Ripple（クリック波紋）
 * - Corner Breathing（コーナーフレーム明滅）
 */
export default function HeroFXLayer({ active }: { active: boolean }) {
  const activeRef = useRef(active);
  activeRef.current = active;

  // ===== Wireframe + Particles + Ripple (DOM生成系) =====
  useEffect(() => {
    if (!active) return;
    const sticky = document.querySelector("[data-hero-sticky]");
    if (!sticky) return;

    const tweens: gsap.core.Tween[] = [];
    const cleanups: (() => void)[] = [];
    const isDesktop = window.innerWidth > 767;

    // --- Wireframe Geometry (desktop only) ---
    if (!isDesktop) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const wireDiv = document.createElement("div");
    wireDiv.className = "fv-wireframe";
    wireDiv.setAttribute("aria-hidden", "true");
    Object.assign(wireDiv.style, {
      position: "absolute", inset: "0", pointerEvents: "none", zIndex: "1", overflow: "hidden",
    });
    const wireSvg = document.createElementNS(svgNS, "svg");
    wireSvg.setAttribute("viewBox", "0 0 1920 1080");
    wireSvg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    Object.assign(wireSvg.style, { position: "absolute", width: "100%", height: "100%" });

    const lineData = [
      [200,150,500,200],[1400,100,1700,180],[100,700,400,850],
      [1500,650,1800,750],[800,50,1100,120],[600,900,950,980],
    ];
    lineData.forEach((coords) => {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(coords[0]));
      line.setAttribute("y1", String(coords[1]));
      line.setAttribute("x2", String(coords[2]));
      line.setAttribute("y2", String(coords[3]));
      line.setAttribute("stroke", "rgba(255,255,255,0.20)");
      line.setAttribute("stroke-width", "1");
      wireSvg.appendChild(line);
      const dx = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 20);
      const dy = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 20);
      tweens.push(gsap.to(line, {
        x: dx, y: dy, rotation: (Math.random() > 0.5 ? 1 : -1) * 15,
        duration: 15 + Math.random() * 20, ease: "sine.inOut", yoyo: true, repeat: -1,
        delay: Math.random() * 5,
      }));
    });

    const triData = [
      "960,200 1020,320 900,320", "300,500 380,620 220,620",
    ];
    triData.forEach((pts, i) => {
      const poly = document.createElementNS(svgNS, "polygon");
      poly.setAttribute("points", pts);
      poly.setAttribute("stroke", "rgba(255,255,255,0.16)");
      poly.setAttribute("stroke-width", "1");
      poly.setAttribute("fill", "none");
      wireSvg.appendChild(poly);
      tweens.push(gsap.to(poly, {
        rotation: 360, x: (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 20),
        y: (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 20),
        transformOrigin: "50% 50%",
        duration: 60 + i * 20, ease: "none", repeat: -1, delay: Math.random() * 5,
      }));
    });

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "1400"); circle.setAttribute("cy", "450");
    circle.setAttribute("r", "40");
    circle.setAttribute("stroke", "rgba(255,255,255,0.14)");
    circle.setAttribute("stroke-width", "1"); circle.setAttribute("fill", "none");
    wireSvg.appendChild(circle);
    tweens.push(gsap.to(circle, {
      attr: { r: 55 }, duration: 8, ease: "sine.inOut", yoyo: true, repeat: -1, delay: Math.random() * 3,
    }));
    tweens.push(gsap.to(circle, {
      x: 35, y: -25, duration: 25, ease: "sine.inOut", yoyo: true, repeat: -1, delay: Math.random() * 5,
    }));

    wireDiv.appendChild(wireSvg);
    sticky.appendChild(wireDiv);
    cleanups.push(() => { if (wireDiv.parentNode) wireDiv.parentNode.removeChild(wireDiv); });

    // --- Particle Dust (25 particles) ---
    const partDiv = document.createElement("div");
    Object.assign(partDiv.style, {
      position: "absolute", inset: "0", pointerEvents: "none", zIndex: "2", overflow: "hidden",
    });
    partDiv.setAttribute("aria-hidden", "true");

    for (let i = 0; i < 25; i++) {
      const p = document.createElement("div");
      const size = 2 + Math.random() * 1.5;
      Object.assign(p.style, {
        position: "absolute", borderRadius: "50%", background: "#fff",
        width: size + "px", height: size + "px",
        left: (Math.random() * 100) + "%", top: (Math.random() * 100) + "%",
        opacity: String(0.25 + Math.random() * 0.25),
        willChange: "transform, opacity",
      });
      partDiv.appendChild(p);
      tweens.push(gsap.to(p, {
        x: (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 150),
        y: (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 120),
        duration: 10 + Math.random() * 20, ease: "sine.inOut", yoyo: true, repeat: -1,
        delay: Math.random() * 5,
      }));
      tweens.push(gsap.to(p, {
        opacity: 0.15 + Math.random() * 0.25,
        duration: 3 + Math.random() * 5, ease: "sine.inOut", yoyo: true, repeat: -1,
        delay: Math.random() * 3,
      }));
    }
    sticky.appendChild(partDiv);
    cleanups.push(() => { if (partDiv.parentNode) partDiv.parentNode.removeChild(partDiv); });

    // --- Click Ripple ---
    if (window.innerWidth > 768) {
      const ripDiv = document.createElement("div");
      Object.assign(ripDiv.style, {
        position: "absolute", inset: "0", pointerEvents: "none", zIndex: "2", overflow: "hidden",
      });
      const ripSvg = document.createElementNS(svgNS, "svg");
      ripSvg.setAttribute("width", "100%"); ripSvg.setAttribute("height", "100%");
      Object.assign(ripSvg.style, { position: "absolute", inset: "0" });
      ripDiv.appendChild(ripSvg);
      sticky.appendChild(ripDiv);

      const ripples: { el: SVGCircleElement; tween: gsap.core.Tween | null }[] = [];
      let intervalId: ReturnType<typeof setInterval> | null = null;
      let pressX = 0, pressY = 0;

      function createRipple(x: number, y: number) {
        if (ripples.length >= 5) {
          const old = ripples.shift();
          if (old?.tween) old.tween.kill();
          if (old?.el.parentNode) old.el.parentNode.removeChild(old.el);
        }
        const rect = ripDiv.getBoundingClientRect();
        const c = document.createElementNS(svgNS, "circle");
        c.setAttribute("cx", String(x - rect.left));
        c.setAttribute("cy", String(y - rect.top));
        c.setAttribute("r", "0");
        c.setAttribute("fill", "none");
        c.setAttribute("stroke", "#fff");
        c.setAttribute("stroke-width", "1");
        c.setAttribute("opacity", "0.18");
        ripSvg.appendChild(c);
        const obj = { el: c, tween: null as gsap.core.Tween | null };
        obj.tween = gsap.to(c, {
          attr: { r: 300 }, opacity: 0, duration: 2.5, ease: "none",
          onComplete: () => {
            if (c.parentNode) c.parentNode.removeChild(c);
            const idx = ripples.indexOf(obj);
            if (idx > -1) ripples.splice(idx, 1);
          },
        });
        ripples.push(obj);
      }

      function onDown(e: MouseEvent) {
        pressX = e.clientX; pressY = e.clientY;
        createRipple(pressX, pressY);
        intervalId = setInterval(() => createRipple(pressX, pressY), 600);
      }
      function onUp() { if (intervalId) { clearInterval(intervalId); intervalId = null; } }
      function onMove(e: MouseEvent) { if (intervalId) { pressX = e.clientX; pressY = e.clientY; } }

      sticky.addEventListener("mousedown", onDown as EventListener);
      window.addEventListener("mouseup", onUp);
      sticky.addEventListener("mousemove", onMove as EventListener);
      cleanups.push(() => {
        sticky.removeEventListener("mousedown", onDown as EventListener);
        window.removeEventListener("mouseup", onUp);
        sticky.removeEventListener("mousemove", onMove as EventListener);
        if (intervalId) clearInterval(intervalId);
        if (ripDiv.parentNode) ripDiv.parentNode.removeChild(ripDiv);
      });
    }

    return () => {
      tweens.forEach((tw) => tw.kill());
      cleanups.forEach((fn) => fn());
    };
  }, [active]);

  // ===== Orb Mouse Tracking =====
  useEffect(() => {
    if (!active || window.innerWidth <= 767) return;
    const orbs = document.querySelectorAll<HTMLElement>("[data-hero-orb]");
    const count = orbs.length;
    if (!count) return;

    const lerpPool = [0.03, 0.05, 0.08];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const targets = Array.from({ length: count }, () => ({ x: cx, y: cy }));
    const current = Array.from({ length: count }, () => ({ x: cx, y: cy }));
    const hw = Array.from(orbs, (o) => ({ w: o.offsetWidth / 2, h: o.offsetHeight / 2 }));

    function onMouse(e: MouseEvent) {
      for (let i = 0; i < count; i++) { targets[i].x = e.clientX; targets[i].y = e.clientY; }
    }
    document.addEventListener("mousemove", onMouse);

    let rafId = 0;
    function animate() {
      if (activeRef.current) {
        for (let i = 0; i < count; i++) {
          const lerp = lerpPool[i] ?? lerpPool[lerpPool.length - 1];
          current[i].x += (targets[i].x - current[i].x) * lerp;
          current[i].y += (targets[i].y - current[i].y) * lerp;
          orbs[i].style.transform = `translate(${current[i].x - hw[i].w}px, ${current[i].y - hw[i].h}px)`;
        }
      }
      rafId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouse);
    };
  }, [active]);

  // ===== Letter Repel =====
  useEffect(() => {
    if (!active || window.innerWidth <= 768) return;
    const letters = document.querySelectorAll<HTMLElement>("[data-hero-letter]");
    if (!letters.length) return;

    const RADIUS = 150, MAX_FORCE = 25;
    let mouseX = -9999, mouseY = -9999;
    const xSet = Array.from(letters, (l) => gsap.quickSetter(l, "x", "px"));
    const ySet = Array.from(letters, (l) => gsap.quickSetter(l, "y", "px"));

    function onMouse(e: MouseEvent) { mouseX = e.clientX; mouseY = e.clientY; }
    document.addEventListener("mousemove", onMouse);

    let rafId = 0;
    function animate() {
      if (!activeRef.current) { rafId = requestAnimationFrame(animate); return; }
      const rects = Array.from(letters, (l) => l.getBoundingClientRect());
      for (let j = 0; j < letters.length; j++) {
        const cx = rects[j].left + rects[j].width / 2;
        const cy = rects[j].top + rects[j].height / 2;
        const dx = cx - mouseX, dy = cy - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS) {
          const force = (1 - dist / RADIUS) * MAX_FORCE;
          const angle = Math.atan2(dy, dx);
          xSet[j](Math.cos(angle) * force);
          ySet[j](Math.sin(angle) * force);
        } else {
          xSet[j](0); ySet[j](0);
        }
      }
      rafId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouse);
    };
  }, [active]);

  // ===== Corner Breathing =====
  useEffect(() => {
    if (!active) return;
    const corners = document.querySelectorAll<SVGElement>("[data-hero-corner-line]");
    if (!corners.length) return;

    const tweens: gsap.core.Tween[] = [];
    corners.forEach((corner, i) => {
      gsap.set(corner, { opacity: 0.6 });
      tweens.push(gsap.to(corner, {
        opacity: 1.0, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.5,
      }));
    });

    return () => { tweens.forEach((tw) => tw.kill()); };
  }, [active]);

  return null; // No visible DOM — all effects are injected into parent
}
