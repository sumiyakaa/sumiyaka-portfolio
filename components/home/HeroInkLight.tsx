"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { createHeroInkSim, type HeroInkSimAPI } from "@/lib/webgl/heroInkSim";
import { prefersLightVisuals } from "@/lib/device";
import styles from "./Hero.module.css";

/**
 * Hero FV 複合常時アニメ「墨 × 灯」（旧 HeroFXLayer を全面置換）
 *
 * - 墨：/about で iOS 実機実証済みの Navier-Stokes 流体（lib/webgl/heroInkSim
 *   ＝ fluidSim.ts のパイプライン流用・設定分離）。暖色地 #1f1c1c に白墨の煙が
 *   ゆっくり湧き、マウスでかき混ぜられる。クリック＝墨の一滴。
 * - 灯：canvas 2D の加算光球（基調3点＋火の粉）。純モノトーン＝白系のみ。
 * - 物語連結：HeroRunner 完走（runnerDone）を ignite として受け取り、
 *   H1 の真上に灯が一点「ふっ」とともる → 以後は常時の明滅に合流する。
 *   未完走でも基調の3点＋火の粉だけで常時アニメとして成立する。
 * - H1 可読性の三重防御：①シェーダ側の墨輝度ハードキャップ（u_cap）
 *   ②H1 帯からのエミッタ反発＋発生減衰 ③固定スクリム（CSS）。
 * - フォールバック：WebGL 不成立→静的グラデ（.fxBase）。
 *   prefers-reduced-motion→静止1フレーム合成。タッチ端末（prefersLightVisuals）
 *   →墨は静的グラデ・灯のみ約30fpsの軽量アニメ。
 * - 可視性ゲート：IntersectionObserver で画面外は rAF・シミュレーション停止。
 * - iOS 制約遵守：filter/mix-blend/3D 不使用。canvas 2D と実証済み WebGL のみ。
 */

const TAU = Math.PI * 2;
/** 灯の色（白系・彩度なし＝金は使わない） */
const GLOW_RGB = "250, 247, 245";
const colG = (a: number) => `rgba(${GLOW_RGB}, ${a})`;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** theme-top.css の #rrggbb トークンを 0-1 RGB へ変換（読めなければ fallback）。
 *  地色は生値を持たずトークン --paper を正とする（乖離するとシームが出る） */
function cssTokenRGB(
  name: string,
  fallback: [number, number, number]
): [number, number, number] {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const m = /^#([0-9a-fA-F]{6})$/.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* ---- 灯（基調3点）：中央のH1帯を幾何的に避けた配置 ---- */
interface OrbDef {
  bx: number; by: number; rr: number;
  ax: number; ay: number; w1: number; w2: number;
  base: number; dipL: number; dipOff: number; depth: number;
}
const ORB_DEFS: OrbDef[] = [
  { bx: 0.80, by: 0.26, rr: 0.30, ax: 0.040, ay: 0.026, w1: 0.045, w2: 0.036, base: 0.60, dipL: 12, dipOff: 5, depth: 0.50 },
  { bx: 0.12, by: 0.76, rr: 0.20, ax: 0.028, ay: 0.020, w1: 0.033, w2: 0.052, base: 0.45, dipL: 15, dipOff: 8, depth: 0.70 },
  { bx: 0.91, by: 0.85, rr: 0.11, ax: 0.018, ay: 0.012, w1: 0.056, w2: 0.030, base: 0.33, dipL: 17, dipOff: 12, depth: 0.75 },
];

/* ---- 点灯オーブ（runnerDone 連動）：H1 の真上 ---- */
const IGNITE_DEF: OrbDef = {
  bx: 0.50, by: 0.17, rr: 0.17, ax: 0.014, ay: 0.010, w1: 0.030, w2: 0.024,
  base: 0.58, dipL: 19, dipOff: 3, depth: 0.40,
};

interface EngineHandle {
  ignite(): void;
}

interface HeroInkLightProps {
  /** openingDone：オープニング明け＝演出開始 */
  active: boolean;
  /** runnerDone：H1 が組み上がった瞬間＝灯がともる */
  ignite: boolean;
}

export default function HeroInkLight({ active, ignite }: HeroInkLightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const igniteWantedRef = useRef(false);
  const breathTweensRef = useRef<gsap.core.Tween[]>([]);
  const inViewRef = useRef(true);

  /* ===== 複合エンジン本体 ===== */
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const inkCanvas = inkCanvasRef.current;
    const glowCanvas = glowCanvasRef.current;
    if (!container || !inkCanvas || !glowCanvas) return;

    const gctx = glowCanvas.getContext("2d");
    if (!gctx) {
      container.classList.add(styles.fxOn);
      return;
    }

    const mm = (q: string) =>
      typeof window.matchMedia === "function" && window.matchMedia(q).matches;
    const reduced = mm("(prefers-reduced-motion: reduce)");
    const light = prefersLightVisuals();
    const full = !light && !reduced; // PC（pointer:fine）のみ墨＝WebGL
    const DPR = full ? Math.min(window.devicePixelRatio || 1, 1.75) : 1;
    const sticky = container.closest("[data-hero-sticky]") as HTMLElement | null;

    let cw = 0;
    let ch = 0;
    let mind = 1;
    let t = 0; // 灯の位相時間
    let simT = 0; // 墨シミュ経過時間
    let burstT = 0; // 起動時「一滴」フェーズの経過
    let last = 0;
    let rafId = 0;
    let running = false;
    let disposed = false;
    let lightAcc = 0; // 軽量経路の約30fps間引き
    let nextDrop = rand(9, 15); // ときおり落ちる一雫
    let sim: HeroInkSimAPI | null = null;
    let resizeTimer: number | undefined;

    /* ---- H1 保護矩形（コンテナ正規化・y は画面下向き） ---- */
    const protect = { x1: 0.2, y1: 0.28, x2: 0.8, y2: 0.72, cx: 0.5, cy: 0.5 };

    function measureProtect() {
      const rc = container!.getBoundingClientRect();
      if (!rc.width || !rc.height) return;
      const h1 = sticky?.querySelector("[data-hero-main]");
      if (!h1) return;
      const r = h1.getBoundingClientRect();
      const pad = 28;
      protect.x1 = Math.max(0, (r.left - pad - rc.left) / rc.width);
      protect.y1 = Math.max(0, (r.top - pad - rc.top) / rc.height);
      protect.x2 = Math.min(1, (r.right + pad - rc.left) / rc.width);
      protect.y2 = Math.min(1, (r.bottom + pad * 1.6 - rc.top) / rc.height);
      protect.cx = (protect.x1 + protect.x2) / 2;
      protect.cy = (protect.y1 + protect.y2) / 2;
    }

    /** H1 帯内=0 → 帯から離れるほど 1 に近づく減衰係数 */
    function protectAtt(x: number, y: number) {
      const m = 0.08;
      const dx = Math.max(protect.x1 - x, 0, x - protect.x2);
      const dy = Math.max(protect.y1 - y, 0, y - protect.y2);
      return Math.min(1, Math.max(dx, dy) / m);
    }

    /* ---- サイズ ---- */
    function sizeAll() {
      cw = container!.clientWidth;
      ch = container!.clientHeight;
      mind = Math.min(cw, ch) || 1;
      glowCanvas!.width = Math.max(1, Math.round(cw * DPR));
      glowCanvas!.height = Math.max(1, Math.round(ch * DPR));
    }

    /* ---- 墨（WebGL 流体） ---- */
    function createSim() {
      try {
        sim = createHeroInkSim(inkCanvas!, {
          resolution: 0.5,
          brightness: 0.8,
          inkCap: 0.36, // H1帯の背面輝度ハードキャップ
          ground: cssTokenRGB("--paper", [0.1216, 0.1098, 0.1098]), // 地色トークン（既定 #1f1c1c）
          inkTint: [0.93, 0.9, 0.895], // 暖色白の墨
          velocityDissipation: 0.984,
          dyeDissipation: 0.9945,
          vorticity: 26,
          pressureIterations: 20,
        });
      } catch {
        sim = null;
      }
      simT = 0;
      // WebGL 不成立時は静的グラデ（.fxBase）へフォールバック
      inkCanvas!.style.display = sim ? "block" : "none";
    }

    /* 湧き手（アンビエントエミッタ）＝H1帯を避けて漂いながら墨を吐く */
    interface Emitter { x: number; y: number; seed: number; }
    const emitters: Emitter[] = [
      { x: 0.80, y: 0.62, seed: rand(0, 100) },
      { x: 0.16, y: 0.80, seed: rand(0, 100) },
      { x: 0.86, y: 0.20, seed: rand(0, 100) },
    ];

    function respawnEmitter(e: Emitter) {
      if (Math.random() < 0.7) {
        e.x = rand(0.55, 1.02);
        e.y = rand(0.4, 1.05);
      } else {
        e.x = rand(-0.02, 0.4);
        e.y = rand(0.55, 1.05);
      }
      e.seed = rand(0, 100);
    }

    function emitAmbient(dt: number) {
      if (!sim) return;
      for (const e of emitters) {
        const a =
          1.9 * Math.sin(e.x * 6.3 + t * 0.21 + e.seed) +
          1.4 * Math.cos(e.y * 7.1 - t * 0.16) +
          1.1 * Math.sin((e.x + e.y) * 4.2 + t * 0.1);
        const sp = 0.055 + 0.025 * Math.sin(t * 0.13 + e.seed);
        e.x += Math.cos(a) * sp * dt;
        e.y += Math.sin(a) * sp * dt - 0.014 * dt; // ゆるやかな上昇

        // H1 帯からの反発
        const M = 0.05;
        if (
          e.x > protect.x1 - M && e.x < protect.x2 + M &&
          e.y > protect.y1 - M && e.y < protect.y2 + M
        ) {
          const dx = e.x - protect.cx;
          const dy = e.y - protect.cy;
          const d = Math.hypot(dx, dy) || 1;
          const inside =
            e.x > protect.x1 && e.x < protect.x2 &&
            e.y > protect.y1 && e.y < protect.y2;
          const push = (inside ? 0.16 : 0.05) * dt;
          e.x += (dx / d) * push;
          e.y += (dy / d) * push;
        }
        if (e.x < -0.08 || e.x > 1.08 || e.y < -0.08 || e.y > 1.08) respawnEmitter(e);

        const att = protectAtt(e.x, e.y);
        if (att < 0.02) continue;
        const dye = 0.085 * att * (0.72 + 0.28 * Math.sin(t * 0.5 + e.seed));
        const F = 26;
        // UV は y 上向き＝ +16 で上昇バイアス
        sim.splat(e.x, 1 - e.y, Math.cos(a) * F, -Math.sin(a) * F + 16, dye, 0.0038);
      }
    }

    /* 起動時の「一滴」＝右下寄りに墨が落ちて広がる（H1帯の外） */
    const BURST_DUR = 0.9;
    function emitBurst(dt: number) {
      if (!sim || burstT >= BURST_DUR) return;
      burstT += dt;
      const u = Math.min(1, burstT / BURST_DUR);
      const decay = Math.pow(Math.max(0, 1 - u), 2);
      const bx = 0.79;
      const by = 0.58;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * TAU + simT * 2.6;
        sim.splat(bx, 1 - by, Math.cos(ang) * 240 * decay, Math.sin(ang) * 240 * decay, 0, 0.005);
      }
      sim.splat(bx, 1 - by, 0, 30 * decay, 0.32 * decay, 0.009);
      if (u < 0.6 && Math.random() < 0.4) {
        sim.splat(0.16, 1 - 0.78, rand(-60, 60), rand(20, 90), 0.16 * decay, 0.005);
      }
    }

    /* 一雫（クリックと同系の墨だまり） */
    function droplet(x: number, y: number, k: number) {
      if (!sim) return;
      sim.splat(x, 1 - y, 0, 0, 0.5 * k, 0.01);
      sim.splat(x, 1 - y, 0, 0, 0.22 * k, 0.02);
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * TAU + rand(0, Math.PI);
        sim.splat(x, 1 - y, Math.cos(ang) * 180 * k, Math.sin(ang) * 180 * k, 0, 0.004);
      }
    }

    function maybeDroplet() {
      if (!sim || t < nextDrop) return;
      nextDrop = t + rand(9, 15);
      for (let tries = 0; tries < 6; tries++) {
        const x = rand(0.06, 0.94);
        const y = rand(0.1, 0.94);
        if (protectAtt(x, y) > 0.7) {
          droplet(x, y, 0.7);
          break;
        }
      }
    }

    /* ---- ポインタ＝墨をかき混ぜる（PC のみ） ---- */
    interface StirPoint { x: number; y: number; dx: number; dy: number; }
    const stirQueue: StirPoint[] = [];
    let prevPX: number | null = null;
    let prevPY: number | null = null;

    function toLocal(e: PointerEvent) {
      const rc = container!.getBoundingClientRect();
      if (!rc.width || !rc.height) return null;
      return { x: (e.clientX - rc.left) / rc.width, y: (e.clientY - rc.top) / rc.height };
    }

    function onPointerMove(e: PointerEvent) {
      const p = toLocal(e);
      if (!p) return;
      lantern.tx = p.x;
      lantern.ty = p.y;
      if (!lantern.on) {
        lantern.x = p.x;
        lantern.y = p.y;
        lantern.on = true;
      }
      if (prevPX !== null && prevPY !== null) {
        const dx = p.x - prevPX;
        const dy = p.y - prevPY;
        if (Math.hypot(dx, dy) > 0.0015 && stirQueue.length < 24) {
          stirQueue.push({ x: p.x, y: p.y, dx, dy });
        }
      }
      prevPX = p.x;
      prevPY = p.y;
    }

    function onPointerLeave() {
      lantern.on = false;
      prevPX = null;
      prevPY = null;
    }

    function onPointerDown(e: PointerEvent) {
      const p = toLocal(e);
      if (!p) return;
      droplet(p.x, p.y, 0.8);
    }

    function processStirQueue() {
      if (!sim) {
        stirQueue.length = 0;
        return;
      }
      let n = 0;
      while (stirQueue.length && n < 8) {
        const q = stirQueue.shift()!;
        const mag = Math.hypot(q.dx, q.dy);
        const F = 520;
        sim.splat(q.x, 1 - q.y, q.dx * F, -q.dy * F, Math.min(0.055, mag * 2.2), 0.0032);
        n++;
      }
    }

    /* ---- 灯（canvas 2D 加算光球） ---- */
    interface Orb { def: OrbDef; p1: number; p2: number; f1: number; f2: number; }
    const orbs: Orb[] = ORB_DEFS.map((d, i) => ({
      def: d,
      p1: i * 1.7 + 0.4,
      p2: i * 2.3 + 1.1,
      f1: i * 0.9,
      f2: i * 1.9 + 0.6,
    }));
    const igniteOrb = { born: null as number | null, p1: 0.9, p2: 2.6, f1: 1.3, f2: 0.5 };
    const lantern = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, I: 0, on: false };

    function flicker(o: Orb, tt: number) {
      const d = o.def;
      const f = 0.74 + 0.16 * Math.sin(tt * 0.53 + o.p1) + 0.1 * Math.sin(tt * 1.31 + o.p2);
      const u = (tt + d.dipOff) % d.dipL;
      const DUR = 3.4;
      let dip = 1;
      if (u < DUR) {
        const s = Math.sin((Math.PI * u) / DUR);
        dip = 1 - d.depth * s * s;
      }
      return Math.max(0.05, d.base * f * dip);
    }

    function drawGlowBall(x: number, y: number, R: number, I: number) {
      if (R < 2 || I <= 0.002) return;
      let g = gctx!.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, colG(Math.min(1, I * 0.5)));
      g.addColorStop(0.35, colG(Math.min(1, I * 0.16)));
      g.addColorStop(1, colG(0));
      gctx!.fillStyle = g;
      gctx!.fillRect(x - R, y - R, R * 2, R * 2);
      const rc = Math.max(2.5, R * 0.06);
      g = gctx!.createRadialGradient(x, y, 0, x, y, rc);
      g.addColorStop(0, colG(Math.min(1, I * 0.9)));
      g.addColorStop(1, colG(0));
      gctx!.fillStyle = g;
      gctx!.fillRect(x - rc, y - rc, rc * 2, rc * 2);
    }

    function drawOrb(o: Orb, tt: number) {
      const d = o.def;
      const x = d.bx * cw + Math.sin(tt * d.w1 * TAU + o.f1) * d.ax * mind;
      const y = d.by * ch + Math.sin(tt * d.w2 * TAU + o.f2) * d.ay * mind;
      const R = d.rr * mind * (1 + 0.05 * Math.sin(tt * 0.21 + o.p1));
      drawGlowBall(x, y, R, flicker(o, tt));
    }

    /** 点灯オーブ：born からの立ち上がり（ふっと点る）→常時明滅へ合流 */
    function drawIgnite(tt: number) {
      if (igniteOrb.born === null) return;
      const u = tt - igniteOrb.born;
      if (u <= 0) return;
      const d = IGNITE_DEF;
      const rise = 1 - Math.pow(1 - Math.min(u / 1.15, 1), 3);
      const bloom = 1 + 0.38 * Math.exp(-u * 1.5) * Math.sin(Math.min(u, 2.6) * 4.4);
      const env = rise * Math.max(0, bloom);
      if (env <= 0.001) return;
      // 点灯直後は明滅の谷を踏まない（4〜9秒かけて通常の揺らぎへ）
      const settle = Math.min(1, Math.max(0, (u - 4) / 5));
      const fRaw = 0.74 + 0.16 * Math.sin(tt * 0.5 + igniteOrb.p1) + 0.1 * Math.sin(tt * 1.24 + igniteOrb.p2);
      const uu = (tt + d.dipOff) % d.dipL;
      let dip = 1;
      if (uu < 3.4) {
        const s = Math.sin((Math.PI * uu) / 3.4);
        dip = 1 - d.depth * s * s;
      }
      const flRaw = fRaw * dip;
      const fl = flRaw + (Math.max(flRaw, 0.82) - flRaw) * (1 - settle);
      const x = d.bx * cw + Math.sin(tt * d.w1 * TAU + igniteOrb.f1) * d.ax * mind;
      const y = d.by * ch + Math.sin(tt * d.w2 * TAU + igniteOrb.f2) * d.ay * mind;
      const R = d.rr * mind * (0.55 + 0.45 * rise) * (1 + 0.05 * Math.sin(tt * 0.23 + igniteOrb.p1));
      drawGlowBall(x, y, R, d.base * fl * env);
    }

    /* 火の粉：左右の帯にだけ湧く（H1帯を横切らない） */
    interface Ember { x: number; y: number; vy: number; sway: number; ph: number; tw: number; r: number; }
    const embers: Ember[] = [];
    function emberX() {
      return Math.random() < 0.5 ? rand(0.02, 0.26) : rand(0.74, 0.99);
    }
    function initEmbers() {
      embers.length = 0;
      const n = full ? 7 : 4;
      for (let i = 0; i < n; i++) {
        embers.push({
          x: emberX(),
          y: rand(0, 1),
          vy: rand(6, 13),
          sway: rand(4, 9),
          ph: rand(0, TAU),
          tw: rand(0, TAU),
          r: rand(0.9, 1.7),
        });
      }
    }
    function drawEmbers(dt: number, tt: number) {
      for (const e of embers) {
        if (dt > 0) {
          e.y -= (e.vy / ch) * dt;
          e.x += Math.sin(tt * 0.6 + e.ph) * (e.sway / cw) * dt;
          if (e.y < -0.03) {
            e.y = 1.04;
            e.x = emberX();
          }
        }
        const edge = Math.min(1, Math.min(e.y, 1.05 - e.y) * 8 + 0.1);
        const a = (0.07 + 0.2 * (0.5 + 0.5 * Math.sin(tt * 0.9 + e.tw))) * Math.max(0, edge);
        gctx!.fillStyle = colG(a);
        gctx!.beginPath();
        gctx!.arc(e.x * cw, e.y * ch, e.r, 0, TAU);
        gctx!.fill();
      }
    }

    /* 手元の灯（ポインタ追従・PC のみ） */
    function drawLantern(dt: number) {
      if (!full) return;
      if (dt > 0) {
        lantern.x += (lantern.tx - lantern.x) * Math.min(1, 2.7 * dt);
        lantern.y += (lantern.ty - lantern.y) * Math.min(1, 2.7 * dt);
        const target = lantern.on ? 0.3 : 0;
        lantern.I += (target - lantern.I) * Math.min(1, 2 * dt);
      }
      if (lantern.I < 0.01) return;
      const R = mind * 0.12;
      const x = lantern.x * cw;
      const y = lantern.y * ch;
      const g = gctx!.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, colG(lantern.I * 0.5));
      g.addColorStop(0.4, colG(lantern.I * 0.16));
      g.addColorStop(1, colG(0));
      gctx!.fillStyle = g;
      gctx!.fillRect(x - R, y - R, R * 2, R * 2);
    }

    function drawGlow(dt: number) {
      gctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      gctx!.clearRect(0, 0, cw, ch);
      gctx!.globalCompositeOperation = "lighter";
      for (const o of orbs) drawOrb(o, t);
      drawIgnite(t);
      drawEmbers(dt, t);
      drawLantern(dt);
      gctx!.globalCompositeOperation = "source-over";
    }

    /* reduced-motion：安定位相（明滅の谷にいない t=5.6）で静止1フレーム合成 */
    function staticCompose() {
      t = 5.6;
      // 点灯済みなら「点灯後の安定状態」（負値になってよい＝未点灯は null で区別）
      if (igniteOrb.born !== null) igniteOrb.born = t - 9;
      drawGlow(0);
    }

    /* ---- ループ ---- */
    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);
      if (!running) return;
      let dt = Math.min((ts - last) / 1000, 0.033);
      last = ts;
      if (dt <= 0) return;
      if (!full) {
        // 軽量経路：約30fpsに間引き（灯のみ）
        lightAcc += dt;
        if (lightAcc < 1 / 30) return;
        dt = Math.min(lightAcc, 0.067);
        lightAcc = 0;
      }
      t += dt;
      if (sim) {
        simT += dt;
        emitAmbient(dt);
        emitBurst(dt);
        processStirQueue();
        maybeDroplet();
        sim.step(dt);
      }
      drawGlow(dt);
    }

    function start() {
      if (running || disposed) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    /* ---- 点灯（runnerDone 連動） ---- */
    function doIgnite() {
      if (disposed || igniteOrb.born !== null) return;
      if (reduced) {
        igniteOrb.born = 0; // staticCompose 内で安定状態に補正される
        staticCompose();
        return;
      }
      igniteOrb.born = t;
      // 墨側の余韻：灯がともって空気がわずかに揺れる
      if (sim) {
        sim.splat(IGNITE_DEF.bx, 1 - IGNITE_DEF.by, 0, 24, 0.1, 0.014);
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * TAU;
          sim.splat(IGNITE_DEF.bx, 1 - IGNITE_DEF.by, Math.cos(ang) * 90, Math.sin(ang) * 90, 0, 0.004);
        }
      }
    }

    /* ---- リサイズ ---- */
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (disposed) return;
        sizeAll();
        measureProtect();
        if (reduced) {
          staticCompose();
          return;
        }
        if (full) {
          sim?.destroy();
          sim = null;
          createSim();
          burstT = BURST_DUR - 0.45; // 作り直し後は短い起こしだけ
        }
      }, 240);
    }

    /* ---- 起動 ---- */
    sizeAll();
    measureProtect();
    initEmbers();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!disposed) measureProtect();
      });
    }

    if (reduced) {
      // 静止合成（墨＝静的グラデ .fxBase・灯＝安定位相の1フレーム）
      inkCanvas.style.display = "none";
      staticCompose();
    } else {
      if (full) {
        createSim();
        if (sticky) {
          sticky.addEventListener("pointermove", onPointerMove);
          sticky.addEventListener("pointerdown", onPointerDown);
          sticky.addEventListener("pointerleave", onPointerLeave);
        }
      } else {
        // 軽量経路：墨は静的グラデ・灯のみアニメ
        inkCanvas.style.display = "none";
      }
      start();
    }
    container.classList.add(styles.fxOn);

    engineRef.current = { ignite: doIgnite };
    if (igniteWantedRef.current) doIgnite();

    /* ---- 可視性ゲート ---- */
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          inViewRef.current = entry.isIntersecting;
          const breaths = breathTweensRef.current;
          if (entry.isIntersecting) {
            breaths.forEach((tw) => tw.resume());
            if (!reduced) start();
          } else {
            breaths.forEach((tw) => tw.pause());
            if (!reduced) stop();
          }
        },
        { threshold: 0 }
      );
      io.observe(container);
    }

    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      stop();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      io?.disconnect();
      if (sticky && full) {
        sticky.removeEventListener("pointermove", onPointerMove);
        sticky.removeEventListener("pointerdown", onPointerDown);
        sticky.removeEventListener("pointerleave", onPointerLeave);
      }
      sim?.destroy();
      sim = null;
      engineRef.current = null;
    };
  }, [active]);

  /* ===== 点灯要求（runnerDone → 灯がともる） ===== */
  useEffect(() => {
    if (!ignite) return;
    igniteWantedRef.current = true;
    engineRef.current?.ignite();
  }, [ignite]);

  /* ===== コーナーフレーム明滅（旧 HeroFXLayer から継承） ===== */
  useEffect(() => {
    if (!active) return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const corners = document.querySelectorAll<SVGElement>("[data-hero-corner-line]");
    if (!corners.length) return;

    const tweens: gsap.core.Tween[] = [];
    breathTweensRef.current = tweens;
    corners.forEach((corner, i) => {
      gsap.set(corner, { opacity: 0.6 });
      tweens.push(
        gsap.to(corner, {
          opacity: 1.0,
          duration: 4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: i * 0.5,
        })
      );
    });
    if (!inViewRef.current) tweens.forEach((tw) => tw.pause());

    return () => {
      tweens.forEach((tw) => tw.kill());
      breathTweensRef.current = [];
    };
  }, [active]);

  return (
    <div ref={containerRef} className={styles.fx} aria-hidden="true">
      {/* 静的グラデ（WebGL失敗・軽量経路・reduced-motion の墨フォールバック） */}
      <div className={styles.fxBase} />
      {/* 墨：WebGL 流体 */}
      <canvas ref={inkCanvasRef} className={styles.fxCanvas} />
      {/* 巨大タイポ「仕組」＝地に沈む（読ませない・裁ち落とし） */}
      <div className={styles.fxGiant}>仕組</div>
      {/* 灯：canvas 2D 加算光球 */}
      <canvas ref={glowCanvasRef} className={styles.fxCanvas} />
      {/* ビネット＋下端は地色へ溶かす */}
      <div className={styles.fxVignette} />
      {/* H1 帯の固定スクリム（可読性の最終防御） */}
      <div className={styles.fxScrim} />
    </div>
  );
}
