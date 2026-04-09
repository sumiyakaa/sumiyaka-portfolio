"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollProgress from "./ScrollProgress";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<React.MutableRefObject<Lenis | null>>({ current: null });

export function useLenisRef() {
  return useContext(LenisContext);
}

export function useLenis() {
  const ref = useContext(LenisContext);
  return ref.current;
}

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // Lenis → ScrollTrigger 同期
    lenis.on("scroll", ScrollTrigger.update);

    // GSAP ticker → Lenis raf
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <LenisContext.Provider value={lenisRef}>
      <ScrollProgress />
      {children}
    </LenisContext.Provider>
  );
}
