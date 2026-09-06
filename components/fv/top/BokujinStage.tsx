"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { prefersLightVisuals } from "@/lib/device";
import {
  createBokujinSim,
  BOKUJIN_TIERS,
  type BokujinFrame,
  type BokujinSimFull,
} from "@/lib/webgl/bokujinSim";
import { createBokujinCpu, type BokujinCpuAPI } from "./bokujinCpu";
import { drawBokujinStill, drawPaperGrain } from "./bokujinStill";
import { createLantern } from "./lantern";
import { sampleGlyphTargets, waitForGlyphFonts, type GlyphTargets } from "./glyphTargets";
import { BOKUJIN_T } from "./bokujinTiming";
import styles from "./BokujinStage.module.css";

/**
 * 墨塵（ぼくじん）— トップ FV の背景ステージ
 *
 * 「バラバラ → ひとりでに → 仕組み」を軸コピーそのもので演じる。
 * 数万粒の墨の粒が暗い紙の上に散らばって漂い（バラバラな事務作業）、誰も触らないのに
 * 集まって題字を書き上げ（ひとりでに）、文字として静止する（仕組み）。
 * 吹き散らしてもまた戻る（ひとりでに回る）。粒は右上の灯に照らされる。
 *
 * 経路の分岐
 *  - PC（pointer:fine）＋WebGL2      → GPU 粒子（lib/webgl/bokujinSim）
 *  - PC で WebGL2 不成立 / context lost → CPU 粒子（canvas 2D・2〜4k 粒・同じ時間軸）
 *  - タッチ・狭幅・reduced-motion     → シミュレーションなし。静止 1 コマの墨塵＋灯の静止合成。
 *                                       DOM の題字は CSS で文字ごとに現れる（Hero 側）
 *  検証用 ?bokujin=cpu|packed|still|debug（debug＝定着後の減光を止め、粒の題字を見せたまま）
 *
 * 物語の連結（ステージ時計 → Hero）
 *  - onLetter(i)：粒が i 番目の文字に定着 → DOM の文字をクロスフェード
 *  - onSettled()：定着 → 灯が一点ともる（ここで ignite）・他要素の入場
 *  - exitRef：Hero の ScrollTrigger が 0..1 を書き、粒は上へ流れ去り灯は遠のく（PC のみ）
 *
 * 可視性ゲート：IntersectionObserver ＋ visibilitychange で画面外・背面タブは rAF 停止。
 * 時計は dt の上限 33ms で進むので、戻ってきても演出は飛ばずに続きから進む。
 * iOS/WebKit 配慮：filter / mix-blend / 3D 不使用。canvas 2D と WebGL2（PC のみ）だけ。
 */

export type BokujinMode = "gpu" | "gpu-packed" | "cpu" | "still";

interface BokujinDebug {
  mode: BokujinMode;
  capacity: number;
  drawCount: number;
  fps: number;
  t: number;
  targets: number;
}

declare global {
  interface Window {
    __bokujin?: BokujinDebug;
  }
}

interface BokujinStageProps {
  light: boolean;
  exitRef: MutableRefObject<number>;
  onLetter: (i: number) => void;
  onSettled: () => void;
}

/** 墨の色（暖色白 --ink #f1eaec） */
const TINT01: [number, number, number] = [0.945, 0.918, 0.925];
const TINT255: [number, number, number] = [241, 234, 236];
/** 地色 --paper #1f1c1c（CPU 経路の軌跡用。トークンが読めれば実値で上書き） */
const PAPER255_DEFAULT: [number, number, number] = [31, 28, 28];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function readPaper(): [number, number, number] {
  if (typeof document === "undefined") return PAPER255_DEFAULT;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
  const m = /^#([0-9a-fA-F]{6})$/.exec(raw);
  if (!m) return PAPER255_DEFAULT;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function BokujinStage({ light, exitRef, onLetter, onSettled }: BokujinStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const cpuRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const glCanvas = glRef.current;
    const cpuCanvas = cpuRef.current;
    const glowCanvas = glowRef.current;
    const grainCanvas = grainRef.current;
    if (!host || !glCanvas || !cpuCanvas || !glowCanvas || !grainCanvas) return;
    /* 巻き上げられる関数宣言（sampleAndApply）の中では host の絞り込みが効かないので、
       型を確定させた別名を1つ持つ（2026-09-06 統合QC・tsc TS2345 の修正） */
    const stage: HTMLElement = host;

    const params = new URLSearchParams(window.location.search);
    const flag = params.get("bokujin") || "";
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lightNow = light || prefersLightVisuals() || flag === "still";
    const debugHold = flag === "debug";
    const sticky = (host.closest("[data-hero-sticky]") as HTMLElement | null) ?? host.parentElement ?? host;
    const getLetters = () => Array.from(sticky.querySelectorAll<HTMLElement>("[data-hero-letter]"));
    const getDecl = () => sticky.querySelector("[data-hero-decl]");
    const dpr = window.devicePixelRatio || 1;

    let disposed = false;
    const cleanups: (() => void)[] = [];
    const lights = new Float32Array(9);
    let targets: GlyphTargets | null = null;

    const sizeGrain = () => drawPaperGrain(grainCanvas, host.clientWidth, host.clientHeight);
    sizeGrain();

    const lantern = createLantern(glowCanvas, { full: !lightNow && !reduced, dpr });

    /* ======================= 軽量経路：静止 1 コマ ======================= */
    if (lightNow) {
      glCanvas.style.display = "none";
      const paint = async () => {
        await waitForGlyphFonts(getLetters()[0] ?? null, 1500);
        if (disposed) return;
        const t = sampleGlyphTargets(host, getLetters(), { extra: getDecl(), maxCount: 12000 });
        targets = t;
        lantern?.resize();
        if (t) lantern?.setIgniteX(t.h1CenterX);
        lantern?.drawStatic(true);
        lantern?.getLights(lights);
        drawBokujinStill(cpuCanvas, t, {
          cssW: host.clientWidth,
          cssH: host.clientHeight,
          dpr,
          lights,
          tint: TINT255,
        });
        host.classList.add(styles.on);
        window.__bokujin = {
          mode: "still",
          capacity: 0,
          drawCount: 0,
          fps: 0,
          t: 0,
          targets: t?.count ?? 0,
        };
      };
      void paint();
      let timer: number | undefined;
      const onResize = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (!disposed) void paint();
        }, 300);
      };
      window.addEventListener("resize", onResize);
      cleanups.push(() => {
        window.removeEventListener("resize", onResize);
        window.clearTimeout(timer);
      });
      return () => {
        disposed = true;
        cleanups.forEach((c) => c());
        lantern?.destroy();
      };
    }

    /* ======================= フル経路：GPU → CPU ======================= */
    cpuCanvas.style.display = "none";
    host.classList.add(styles.on);

    let mode: BokujinMode = "gpu";
    let sim: BokujinSimFull | null = null;
    let cpu: BokujinCpuAPI | null = null;
    const area = host.clientWidth * host.clientHeight;

    // 粒子数の初期段階：画面の面積と DPR から。以後は実測 fps で drawCount を下げる
    const pickTier = () => {
      let want = area / 34;
      if (dpr > 1.5) want *= 0.7;
      let tier: number = BOKUJIN_TIERS[0];
      for (const t of BOKUJIN_TIERS) if (t <= want) tier = t;
      return tier;
    };

    if (flag !== "cpu") {
      try {
        sim = createBokujinSim(glCanvas, {
          count: pickTier(),
          dpr,
          forcePacked: flag === "packed",
          tint: TINT01,
        }) as BokujinSimFull | null;
      } catch {
        sim = null;
      }
    }

    const startCpu = () => {
      if (cpu) return;
      sim?.destroy();
      sim = null;
      glCanvas.style.display = "none";
      cpuCanvas.style.display = "block";
      cpu = createBokujinCpu(cpuCanvas, {
        count: Math.min(4000, Math.max(2000, Math.round(area / 400))),
        paper: readPaper(),
        tint: TINT255,
      });
      cpu?.resize(host.clientWidth, host.clientHeight, dpr);
      if (targets) {
        cpu?.setTargets(targets);
        cpu?.setBand(targets.band);
      }
      mode = "cpu";
    };
    if (!sim) startCpu();
    else mode = sim.packed ? "gpu-packed" : "gpu";

    /* ---- 時計・状態 ---- */
    let t = 0;
    let last = 0;
    let rafId = 0;
    let running = false;
    let started = false; // 採点が済み時計が走っている
    let nextLetter = 0;
    let settled = false;
    let n = getLetters().length;
    let retryAt = 0;
    const mouse = { x: 0, y: 0, on: 0 };
    const burst = { x: 0, y: 0, k: 0 };
    const frame: BokujinFrame = {
      dt: 0, time: 0, phase: 0, settle: 0, exit: 0, alpha: 0,
      mouseX: 0, mouseY: 0, mouseOn: 0, burstX: 0, burstY: 0, burstK: 0, lights,
    };

    // fps 計測と段階調整（起動直後の 40 フレームで判断・最大 2 回まで下げる）
    let frameIdx = 0;
    let winAcc = 0;
    let winN = 0;
    let fps = 0;
    let stepDownLeft = 2;
    let fpsAcc = 0;
    let fpsN = 0;
    let fpsAt = 0;

    function publish() {
      window.__bokujin = {
        mode,
        capacity: sim?.capacity ?? cpu?.count ?? 0,
        drawCount: sim?.drawCount ?? cpu?.count ?? 0,
        fps,
        t,
        targets: targets?.count ?? 0,
      };
    }

    function sampleAndApply() {
      const ls = getLetters();
      n = ls.length;
      const tg = sampleGlyphTargets(stage, ls, { extra: getDecl(), maxCount: 65536 });
      if (!tg) return false;
      targets = tg;
      sim?.setTargets(tg);
      sim?.setBand(tg.band);
      cpu?.setTargets(tg);
      cpu?.setBand(tg.band);
      lantern?.setIgniteX(tg.h1CenterX);
      return true;
    }

    function tick(ts: number) {
      rafId = requestAnimationFrame(tick);
      if (!running || disposed) return;
      const raw = (ts - last) / 1000;
      last = ts;
      if (raw <= 0) return;
      const dt = Math.min(raw, 0.033); // 画面外・背面タブから戻っても時計は飛ばない

      if (sim && sim.isLost()) startCpu();

      if (!started) {
        lantern?.step(dt);
        return;
      }
      t += dt;
      const T = BOKUJIN_T;
      if (!targets && t >= retryAt && t < T.gatherStart + T.gatherDur) {
        retryAt = t + 0.15;
        sampleAndApply();
      }
      const phase = clamp01((t - T.gatherStart) / T.gatherDur);
      const settle = clamp01((t - T.settle) / T.settleDim);
      const exit = clamp01(exitRef.current);

      // 粒が文字 i に定着 → DOM の文字を出す（書き順）
      while (nextLetter < n && t >= T.gatherStart + T.gatherDur * ((nextLetter + 1) / n) + T.letterLag) {
        onLetter(nextLetter);
        nextLetter++;
      }
      if (!settled && t >= T.settle) {
        settled = true;
        lantern?.ignite();
        onSettled();
      }

      lantern?.setExit(exit);
      lantern?.step(dt);
      lantern?.getLights(lights);

      burst.k *= Math.exp(-dt / 0.12);
      frame.dt = dt;
      frame.time = t;
      frame.phase = phase;
      frame.settle = debugHold ? 0 : settle;
      frame.exit = exit;
      frame.alpha = clamp01(t / T.fadeIn);
      frame.mouseX = mouse.x;
      frame.mouseY = mouse.y;
      frame.mouseOn = mouse.on;
      frame.burstX = burst.x;
      frame.burstY = burst.y;
      frame.burstK = burst.k;
      if (sim) sim.step(frame);
      else cpu?.step(frame);

      // 段階調整：起動直後の実測（生の dt）で重ければ粒を減らす
      frameIdx++;
      if (frameIdx > 6 && stepDownLeft > 0 && sim) {
        winAcc += raw;
        winN++;
        if (winN >= 30) {
          const avg = winAcc / winN;
          winAcc = 0;
          winN = 0;
          if (avg > 1 / 45 && sim.drawCount > BOKUJIN_TIERS[0]) {
            sim.drawCount = Math.max(BOKUJIN_TIERS[0], Math.floor((sim.drawCount * 0.6) / 256) * 256);
            stepDownLeft--;
          } else {
            stepDownLeft = 0;
          }
        }
      }
      fpsAcc += raw;
      fpsN++;
      if (ts - fpsAt > 500) {
        fps = fpsN / Math.max(1e-3, fpsAcc);
        fpsAcc = 0;
        fpsN = 0;
        fpsAt = ts;
        publish();
      }
    }

    function start() {
      if (running || disposed) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    /* ---- 可視性ゲート ---- */
    let inView = true;
    const syncRun = () => {
      const want = inView && document.visibilityState !== "hidden";
      if (want) start();
      else stop();
    };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[entries.length - 1];
          if (!e) return;
          inView = e.isIntersecting;
          syncRun();
        },
        { threshold: 0 }
      );
      io.observe(host);
    }
    document.addEventListener("visibilitychange", syncRun);
    cleanups.push(() => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", syncRun);
    });

    /* ---- ポインタ（吹く・手元の灯・クリックの破裂） ---- */
    const toU = (e: PointerEvent) => {
      const rc = host.getBoundingClientRect();
      if (!rc.width || !rc.height) return null;
      return {
        x: (e.clientX - rc.left) / rc.height,
        y: (e.clientY - rc.top) / rc.height,
        nx: (e.clientX - rc.left) / rc.width,
        ny: (e.clientY - rc.top) / rc.height,
      };
    };
    const onMove = (e: PointerEvent) => {
      const p = toU(e);
      if (!p) return;
      mouse.x = p.x;
      mouse.y = p.y;
      mouse.on = 1;
      lantern?.setPointer(p.nx, p.ny, true);
    };
    const onLeave = () => {
      mouse.on = 0;
      lantern?.setPointer(mouse.x, mouse.y, false);
    };
    const onDown = (e: PointerEvent) => {
      const p = toU(e);
      if (!p) return;
      burst.x = p.x;
      burst.y = p.y;
      burst.k = 1;
    };
    sticky.addEventListener("pointermove", onMove);
    sticky.addEventListener("pointerleave", onLeave);
    sticky.addEventListener("pointerdown", onDown);
    cleanups.push(() => {
      sticky.removeEventListener("pointermove", onMove);
      sticky.removeEventListener("pointerleave", onLeave);
      sticky.removeEventListener("pointerdown", onDown);
    });

    /* ---- リサイズ ---- */
    let rt: number | undefined;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => {
        if (disposed) return;
        const w = host.clientWidth;
        const h = host.clientHeight;
        sizeGrain();
        lantern?.resize();
        sim?.resize(w, h, dpr);
        cpu?.resize(w, h, dpr);
        if (started) sampleAndApply();
      }, 240);
    };
    window.addEventListener("resize", onResize);
    cleanups.push(() => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(rt);
    });

    /* ---- 起動：書体を待って採点 → 時計を回す ---- */
    start();
    publish();
    (async () => {
      await waitForGlyphFonts(getLetters()[0] ?? null, 1200);
      if (disposed) return;
      sampleAndApply();
      t = 0;
      started = true;
      publish();
    })();

    return () => {
      disposed = true;
      stop();
      cleanups.forEach((c) => c());
      sim?.destroy();
      sim = null;
      cpu?.destroy();
      cpu = null;
      lantern?.destroy();
    };
  }, [light, exitRef, onLetter, onSettled]);

  return (
    <div ref={hostRef} className={styles.stage} aria-hidden="true">
      <div className={styles.base} />
      <canvas ref={grainRef} className={`${styles.canvas} ${styles.grain}`} />
      <canvas ref={glRef} className={styles.canvas} />
      <canvas ref={cpuRef} className={styles.canvas} />
      <canvas ref={glowRef} className={styles.canvas} />
      <div className={styles.vignette} />
    </div>
  );
}
