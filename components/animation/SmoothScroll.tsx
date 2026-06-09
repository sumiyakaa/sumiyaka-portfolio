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

    // 初回セットアップ後にトリガー位置を確定
    ScrollTrigger.refresh();

    // リサイズ／向き変更でトリガー位置がズレるため再計算（デバウンス）。
    // iOSのアドレスバー開閉は「高さのみ変化」なので無視してガタつきを防ぐ
    // （FVは svh 指定で高さ自体が変わらないため幅基準で十分）。
    let lastWidth = window.innerWidth;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      clearTimeout(refreshTimer);
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
