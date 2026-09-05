"use client";

import { useEffect, useRef } from "react";
import { FV_TIMING, SUMI } from "@/components/fv/contract";
import { useFVPhase } from "@/components/fv/useFVPhase";
import { prefersLightVisuals } from "@/lib/device";
import styles from "./ContactLantern.module.css";

/**
 * /contact FV「焦（こげ）＝灯」（2026-09-05 五彩改修）
 *
 * 最も暗い地（--sumi-koge）に、一点の灯だけがある。
 *  - 灯：canvas 2D の加算光球（HeroInkLight と同じ手法・iOS 実証済み）。
 *        天井から一本の紐で吊られた裸電球。PC ではポインタに引かれてゆっくり動き、
 *        紐は天井の吊り元に繋がれたまま傾く。
 *  - 題字「CONTACT」：1文字ずつ span。灯からの距離（逆二乗の減衰）で明度が変わり、
 *        灯の反対側へ伸びる多段の text-shadow を灯の位置から毎フレーム計算する。
 *  - 入場（customEntrance）：闇 → 灯が2回小さく瞬いてからともる → 光の届いた
 *        文字から順に浮かぶ → 影が伸びる。題字は 1.0s 以内に読める。
 *  - 収縮（1.0s→1.5s）：床の光と背景の暈は data-fv-depth で奥へ沈み、灯と題字は
 *        手前に残る。ResizeObserver で高さの変化に追随して再計測する。
 *  - 軽量経路（prefersLightVisuals）：入場の一回きりだけ描き、安定位相の静止1コマで
 *        止める（ポスター判定）。prefers-reduced-motion：終端の1コマを即置き。
 *  - 可視性ゲート：IntersectionObserver ＋ visibilitychange（HeroInkLight と同じ）。
 *  - iOS 制約遵守：filter / mix-blend / 3D 不使用。canvas 2D・color・text-shadow・
 *        background-position（CSS 変数）だけを動かす。
 */

const TITLE = "CONTACT";
const GLOW = SUMI.glowRGB;
const colG = (a: number) => `rgba(${GLOW}, ${a})`;
/** 地色 --sumi-koge (#141212) の RGB（canvas 内で闇へ溶かすとき用） */
const SUMI_KOGE_RGB = "20, 18, 18";

/** 灯の基準強度（明滅・点灯包絡はこれに掛かる） */
const BASE_I = 0.8;

type RGB = [number, number, number];
/** 灯が届かない側の文字色（--sumi-tan #8f8789 ＝ 地 koge 上で 5.4:1） */
const DIM: RGB = [143, 135, 137];
/** 灯の直下の文字色（--sumi-sei より一段明るい暖色白） */
const LIT: RGB = [248, 244, 245];
/** 地色（未点灯の文字＝闇に溶けている） */
const KOGE: RGB = [20, 18, 18];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const tri = (u: number, c: number, hw: number) => {
  const a = 1 - Math.abs(u - c) / hw;
  return a > 0 ? a : 0;
};
const mixRGB = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
const rgbStr = (c: RGB) =>
  `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

/** 点灯の包絡：2回の小さな瞬き → 立ち上がり（わずかな bloom）→ 安定。u = 点灯からの秒 */
function igniteEnv(u: number): number {
  if (u <= 0) return 0;
  if (!Number.isFinite(u)) return 1;
  const T0 = 0.26;
  if (u < T0) {
    return Math.max(tri(u, 0.04, 0.05) * 0.5, tri(u, 0.16, 0.06) * 0.72);
  }
  const v = u - T0;
  const rise = 1 - Math.pow(1 - Math.min(v / 0.42, 1), 3);
  const bloom = 1 + 0.22 * Math.exp(-v * 2.4) * Math.sin(Math.min(v, 2.2) * 5.2);
  return rise * Math.max(0, bloom);
}

/** 文字ごとの浮かび上がり：灯に近い文字から順に（d = 灯までの距離 em） */
function letterEnv(u: number, d: number): number {
  if (!Number.isFinite(u)) return 1;
  const start = 0.26 + 0.035 * Math.min(d, 6.5);
  return smooth((u - start) / 0.28);
}

/** 常時の明滅（安定位相 t=5.6 付近で谷にいない） */
function flicker(tt: number): number {
  const f = 0.86 + 0.09 * Math.sin(tt * 0.53 + 0.4) + 0.05 * Math.sin(tt * 1.31 + 1.1);
  const u = (tt + 5) % 17;
  let dip = 1;
  if (u < 3.2) {
    const s = Math.sin((Math.PI * u) / 3.2);
    dip = 1 - 0.22 * s * s;
  }
  return f * dip;
}

interface Engine {
  ignite(delay: number): void;
  settle(): void;
}

export default function ContactLantern() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const phase = useFVPhase(hostRef);

  /* ===== エンジン本体（マウント時に一度だけ） ===== */
  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const title = titleRef.current;
    if (!host || !canvas || !title) return;
    const fv = (host.closest("[data-fv]") as HTMLElement | null) ?? host;
    const desk = document.querySelector<HTMLElement>("[data-contact-desk]");
    const letters = Array.from(title.querySelectorAll<HTMLElement>("[data-letter]"));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // canvas 2D 不成立：CSS の静止ポスター（文字だけ点灯）へ
      host.classList.add(styles.fallback);
      return;
    }

    const mm = (q: string) =>
      typeof window.matchMedia === "function" && window.matchMedia(q).matches;
    const reduced = mm("(prefers-reduced-motion: reduce)");
    const light = prefersLightVisuals();
    const full = !light && !reduced;
    const DPR = full ? Math.min(window.devicePixelRatio || 1, 1.75) : 1;

    let cw = 0;
    let ch = 0;
    let fs = 100; // 題字の font-size（px）＝寸法の基準
    let t = 0; // 経過秒（明滅の位相）
    let born: number | null = null; // 点灯時刻（t 基準）
    let igniteTimer: number | undefined;
    let running = false;
    let rafId = 0;
    let last = 0;
    let disposed = false;
    let pointerIn = false;
    let settledPhase = false;
    let frozen = false; // 軽量経路：入場後は静止
    // 直近の描画引数（再計測で canvas がクリアされた直後に描き直すため）
    let lastI = 0;
    let lastU = -1;
    let lastEnv = 0;

    const anchor = { x: 0, y: 0 }; // 灯の定位置（題字基準）
    const lamp = { x: 0, y: 0, tx: 0, ty: 0 };
    const ceiling = { x: 0 }; // 紐の吊り元（天井）
    const centers = letters.map(() => ({ x: 0, y: 0 }));

    /* ---- 計測：題字の各文字の中心と、灯の定位置 ---- */
    function measure() {
      const rc = fv.getBoundingClientRect();
      cw = fv.clientWidth;
      ch = fv.clientHeight;
      if (!cw || !ch) return;
      canvas!.width = Math.max(1, Math.round(cw * DPR));
      canvas!.height = Math.max(1, Math.round(ch * DPR));
      fs = parseFloat(getComputedStyle(title!).fontSize) || 100;
      letters.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        centers[i].x = r.left + r.width / 2 - rc.left;
        centers[i].y = r.top + r.height / 2 - rc.top;
      });
      const tr = title!.getBoundingClientRect();
      const tl = tr.left - rc.left;
      const tt = tr.top - rc.top;
      const narrow = cw < 768;
      if (narrow) {
        anchor.x = tl + fs * 0.34;
        anchor.y = tt - fs * 0.92;
      } else {
        anchor.x = tl - fs * 0.22;
        anchor.y = tt - fs * 0.6;
      }
      // 固定ヘッダー（60px）の下に必ず出す
      anchor.y = Math.max(anchor.y, 78);
      ceiling.x = anchor.x;
      // 沈む層は 10% はみ出した箱（CSS）なので、箱基準の px に直して渡す
      host!.style.setProperty("--ax", `${(anchor.x + cw * 0.1).toFixed(1)}px`);
      host!.style.setProperty("--ay", `${(anchor.y + ch * 0.1).toFixed(1)}px`);
      // 暈の半径：舞台の下端を越えない（越えると机との境目に段差が出る）
      host!.style.setProperty(
        "--hr",
        `${Math.round(Math.min(fs * 4.2, (ch - anchor.y) * 0.95))}px`
      );
      if (!pointerIn || !full) {
        // ポインタに引かれていない間は定位置へ即座に（収縮中に遅れないため）
        lamp.tx = anchor.x;
        lamp.ty = anchor.y;
        lamp.x = anchor.x;
        lamp.y = anchor.y;
      }
    }

    /* ---- 描画 ---- */
    function drawCord(I: number) {
      const dx = lamp.x - ceiling.x;
      const dy = lamp.y + 2;
      const len = Math.hypot(dx, dy) || 1;
      const end = Math.max(0, len - fs * 0.09);
      const ex = ceiling.x + (dx / len) * end;
      const ey = -2 + (dy / len) * end;
      const g = ctx!.createLinearGradient(ceiling.x, -2, ex, ey);
      g.addColorStop(0, colG(0.03 * I));
      g.addColorStop(0.7, colG(0.10 * I));
      g.addColorStop(1, colG(0.34 * I));
      ctx!.strokeStyle = g;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(ceiling.x, -2);
      ctx!.lineTo(ex, ey);
      ctx!.stroke();
    }

    /** 壁に広がる暈（灯の周囲・広い） */
    function drawHalo(x: number, y: number, I: number) {
      const R = fs * 3.4;
      const g = ctx!.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, colG(Math.min(1, I * 0.5)));
      g.addColorStop(0.3, colG(Math.min(1, I * 0.17)));
      g.addColorStop(0.62, colG(Math.min(1, I * 0.045)));
      g.addColorStop(1, colG(0));
      ctx!.fillStyle = g;
      ctx!.fillRect(x - R, y - R, R * 2, R * 2);
    }

    /** 舞台の下端へ向かって壁の光を闇（koge）へ溶かす＝机との境目を消す */
    function drawBottomFade() {
      const fh = ch * 0.3;
      const g = ctx!.createLinearGradient(0, ch - fh, 0, ch);
      g.addColorStop(0, `rgba(${SUMI_KOGE_RGB}, 0)`);
      g.addColorStop(1, `rgba(${SUMI_KOGE_RGB}, 1)`);
      ctx!.fillStyle = g;
      ctx!.fillRect(0, ch - fh, cw, fh);
    }

    /** 電球そのもの（周囲の明るみと芯）＝常に手前 */
    function drawBulb(x: number, y: number, I: number) {
      const rm = fs * 0.42;
      let g = ctx!.createRadialGradient(x, y, 0, x, y, rm);
      g.addColorStop(0, colG(Math.min(1, I * 0.55)));
      g.addColorStop(1, colG(0));
      ctx!.fillStyle = g;
      ctx!.fillRect(x - rm, y - rm, rm * 2, rm * 2);
      // 芯
      const rc = Math.max(2.5, fs * 0.055);
      g = ctx!.createRadialGradient(x, y, 0, x, y, rc);
      g.addColorStop(0, colG(Math.min(1, I * 1.1)));
      g.addColorStop(0.55, colG(Math.min(1, I * 0.6)));
      g.addColorStop(1, colG(0));
      ctx!.fillStyle = g;
      ctx!.fillRect(x - rc, y - rc, rc * 2, rc * 2);
    }

    /**
     * I = 灯の実効強度（0〜約1）、u = 点灯からの秒（静止合成は Infinity）、
     * env = 点灯の包絡 0〜1（文字は灯がともった分だけ照らされる）
     */
    function render(I: number, u: number, env: number) {
      lastI = I;
      lastU = u;
      lastEnv = env;
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx!.clearRect(0, 0, cw, ch);
      if (I > 0.003) {
        drawCord(I);
        ctx!.globalCompositeOperation = "lighter";
        drawHalo(lamp.x, lamp.y, I);
        ctx!.globalCompositeOperation = "source-over";
        drawBottomFade();
        ctx!.globalCompositeOperation = "lighter";
        drawBulb(lamp.x, lamp.y, I);
        ctx!.globalCompositeOperation = "source-over";
      }
      const In = Math.min(1, I / BASE_I);
      host!.style.setProperty("--lx", `${(lamp.x + cw * 0.1).toFixed(1)}px`);
      host!.style.setProperty("--li", In.toFixed(3));
      // 机の光だまり（FV の外）にも同じ灯を渡す＝境目なく続く
      if (desk) {
        desk.style.setProperty("--lx-page", `${lamp.x.toFixed(1)}px`);
        desk.style.setProperty("--li-page", In.toFixed(3));
      }

      for (let i = 0; i < letters.length; i++) {
        const c = centers[i];
        const dx = c.x - lamp.x;
        const dy = c.y - lamp.y;
        const dist = Math.hypot(dx, dy) || 1;
        const d = dist / fs;
        const ux = dx / dist;
        const uy = dy / dist;
        // 距離減衰（逆二乗系）→ 明度
        const fall = 1 / (1 + (d / 3.0) * (d / 3.0));
        const b = Math.pow(fall, 0.7);
        const le = letterEnv(u, d) * Math.min(1, env / 0.85);
        const k = le * (0.92 + 0.08 * In);
        const col = mixRGB(KOGE, mixRGB(DIM, LIT, b), k);
        // 影：灯の反対側へ。遠いほど長く、暗いほど薄い。入場では伸びていく
        const L = Math.min(0.75, 0.14 + 0.075 * d) * fs * smooth(le);
        const str = le * (0.3 + 0.7 * b);
        const el = letters[i];
        el.style.color = rgbStr(col);
        if (str < 0.02 || L < 0.5) {
          el.style.textShadow = "none";
        } else {
          const o1x = (ux * L * 0.22).toFixed(1);
          const o1y = (uy * L * 0.22).toFixed(1);
          const o2x = (ux * L * 0.48).toFixed(1);
          const o2y = (uy * L * 0.48).toFixed(1);
          const o3x = (ux * L * 0.74).toFixed(1);
          const o3y = (uy * L * 0.74).toFixed(1);
          const o4x = (ux * L).toFixed(1);
          const o4y = (uy * L).toFixed(1);
          el.style.textShadow =
            `${o1x}px ${o1y}px 1px rgba(0,0,0,${(0.62 * str).toFixed(3)}), ` +
            `${o2x}px ${o2y}px 3px rgba(0,0,0,${(0.42 * str).toFixed(3)}), ` +
            `${o3x}px ${o3y}px 7px rgba(0,0,0,${(0.28 * str).toFixed(3)}), ` +
            `${o4x}px ${o4y}px 13px rgba(0,0,0,${(0.16 * str).toFixed(3)})`;
        }
      }
    }

    /** 安定位相の静止1コマ（軽量経路の終端・reduced-motion・再計測時） */
    function renderStatic() {
      t = 5.6;
      render(BASE_I * flicker(t), Infinity, 1);
    }

    /** 再計測の直後：canvas のサイズ変更で消えた絵を同じ引数で描き直す */
    function redraw() {
      if (running) render(lastI, lastU, lastEnv);
      else if (born !== null) renderStatic();
      else render(0, -1, 0);
    }

    /* ---- ループ ---- */
    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);
      if (!running) return;
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      if (dt <= 0) return;
      t += dt;
      if (full) {
        lamp.x += (lamp.tx - lamp.x) * Math.min(1, 2.4 * dt);
        lamp.y += (lamp.ty - lamp.y) * Math.min(1, 2.4 * dt);
      }
      const u = born === null ? -1 : t - born;
      const env = igniteEnv(u);
      // 点灯直後は明滅の谷を踏まない（3〜7秒かけて通常の揺らぎへ）
      const settleK = clamp01((u - 3) / 4);
      const fl = flicker(t);
      const flk = fl + (Math.max(fl, 0.9) - fl) * (1 - settleK);
      render(BASE_I * flk * env, u, env);

      if (!full && born !== null && u > 2.6 && settledPhase) {
        // 軽量経路：入場が終わったら静止1コマで止める（ポスター判定）
        frozen = true;
        stop();
        renderStatic();
      }
    }

    function start() {
      if (running || disposed || frozen || reduced) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    /* ---- ポインタ（PC のみ）：灯が手元に引かれる ---- */
    function onPointerMove(e: PointerEvent) {
      const rc = fv.getBoundingClientRect();
      if (!rc.width || !rc.height) return;
      pointerIn = true;
      const px = e.clientX - rc.left;
      const py = e.clientY - rc.top;
      lamp.tx = Math.min(cw * 0.96, Math.max(cw * 0.04, px));
      lamp.ty = Math.min(ch - 24, Math.max(76, py));
    }
    function onPointerLeave() {
      pointerIn = false;
      lamp.tx = anchor.x;
      lamp.ty = anchor.y;
    }

    /* ---- 起動 ---- */
    measure();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (disposed) return;
        measure();
        redraw();
      });
    }
    render(0, -1, 0);

    if (full) {
      fv.addEventListener("pointermove", onPointerMove);
      fv.addEventListener("pointerleave", onPointerLeave);
    }

    engineRef.current = {
      ignite(delay: number) {
        if (disposed || born !== null) return;
        if (reduced) {
          born = 0;
          renderStatic();
          return;
        }
        window.clearTimeout(igniteTimer);
        igniteTimer = window.setTimeout(() => {
          if (disposed || born !== null) return;
          start();
          born = t;
        }, Math.max(0, delay * 1000));
      },
      settle() {
        settledPhase = true;
        if (reduced || born === null) {
          // reduced-motion は enter を経ずに settled が来る＝終端の1コマを即置き
          born = 0;
          renderStatic();
        }
      },
    };

    /* ---- 高さの変化（収縮）と幅の変化に追随 ---- */
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (disposed) return;
        measure();
        // ResizeObserver は rAF の後・描画の前に走る＝canvas の再サイズで絵が消えるので描き直す
        redraw();
      });
      ro.observe(fv);
    }

    /* ---- 可視性ゲート（画面外・背面タブでは止める） ---- */
    let inView = true;
    const syncRun = () => {
      const live = inView && document.visibilityState === "visible";
      if (live) start();
      else stop();
    };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          inView = entry.isIntersecting;
          syncRun();
        },
        { threshold: 0 }
      );
      io.observe(fv);
    }
    document.addEventListener("visibilitychange", syncRun);

    return () => {
      disposed = true;
      stop();
      window.clearTimeout(igniteTimer);
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", syncRun);
      if (full) {
        fv.removeEventListener("pointermove", onPointerMove);
        fv.removeEventListener("pointerleave", onPointerLeave);
      }
      engineRef.current = null;
    };
  }, []);

  /* ===== 位相 → 点灯・安定（SubPageFVAnim の idle→enter→shrink→settled） ===== */
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    if (phase === "enter") eng.ignite(FV_TIMING.enterDelay);
    else if (phase === "settled") eng.settle();
  }, [phase]);

  return (
    <div ref={hostRef} className={styles.host}>
      {/* 地：最も暗い koge（平坦） */}
      <div className={styles.base} aria-hidden="true" />
      {/* 背景の暈：灯の定位置まわりを僅かに持ち上げる（収縮で奥へ沈む） */}
      <div className={styles.haze} data-fv-depth="1" aria-hidden="true" />
      {/* 灯：紐＋加算光球（手前に残る）。壁の光は下端で闇へ溶ける */}
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {/* 床：画面下部の光の楕円（収縮で僅かに沈む）。canvas の闇より手前＝机の光へ続く */}
      <div className={styles.floor} data-fv-depth="0.35" aria-hidden="true" />
      {/* 題字：灯からの距離で明度と影が変わる */}
      <div className={styles.stage}>
        <h1 ref={titleRef} className={styles.title} aria-label={TITLE}>
          {TITLE.split("").map((ch, i) => (
            <span key={i} data-letter aria-hidden="true" className={styles.letter}>
              {ch}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}
