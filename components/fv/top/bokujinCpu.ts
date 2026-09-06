/**
 * 墨塵 — CPU 経路（canvas 2D）
 * PC で WebGL2 が成立しない（または context lost）ときの簡略版。2〜4k 粒・同じ時間軸。
 * 力は GPU 版と同じ構成（流れ場・seek・マウス反発・破裂・保護帯・退場・減衰）を、
 * 流れ場だけ解析的な渦（sin/cos の流れ関数）に置き換えている。
 * 軌跡：毎フレーム紙色を薄く重ねて消す（8bit でも紙色へ収束するので残像は残らない）。
 */

import type { BokujinFrame, BokujinTargetSet } from "@/lib/webgl/bokujinSim";

export interface BokujinCpuAPI {
  readonly count: number;
  setTargets(t: BokujinTargetSet | null): void;
  setBand(b: ArrayLike<number>): void;
  resize(cssW: number, cssH: number, dpr: number): void;
  step(f: BokujinFrame): void;
  destroy(): void;
}

export interface BokujinCpuOptions {
  count: number;
  /** 紙の色（0-255） */
  paper: [number, number, number];
  /** 墨の色（0-255・暖色白） */
  tint: [number, number, number];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createBokujinCpu(
  canvas: HTMLCanvasElement,
  opts: BokujinCpuOptions
): BokujinCpuAPI | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const N = Math.max(256, Math.min(6000, Math.round(opts.count)));
  const paper = `rgb(${opts.paper[0]}, ${opts.paper[1]}, ${opts.paper[2]})`;
  const tintStr = (a: number) => `rgba(${opts.tint[0]}, ${opts.tint[1]}, ${opts.tint[2]}, ${a})`;

  let aspect = 1.6;
  let cw = 1;
  let chh = 1;
  let scale = 1; // canvas px / u（= canvas 高）
  let cssScale = 1; // canvas px / css px

  const px = new Float32Array(N);
  const py = new Float32Array(N);
  const vx = new Float32Array(N);
  const vy = new Float32Array(N);
  const tx = new Float32Array(N);
  const ty = new Float32Array(N);
  const order = new Float32Array(N);
  const seed = new Float32Array(N);
  const gainV = new Float32Array(N);
  const kind = new Uint8Array(N);
  const edge = new Uint8Array(N);
  let hasT = false;
  const band = [-1, -1, -1, -1];

  function spawn() {
    for (let i = 0; i < N; i++) {
      px[i] = Math.random() * aspect;
      py[i] = Math.random();
      vx[i] = (Math.random() - 0.5) * 0.06;
      vy[i] = (Math.random() - 0.5) * 0.06;
      seed[i] = Math.random();
      gainV[i] = Math.random();
      kind[i] = i % 6 === 5 ? 1 : 0;
      tx[i] = px[i];
      ty[i] = py[i];
    }
  }

  function resize(cssW: number, cssH: number, dpr: number) {
    const w = Math.max(1, cssW);
    const h = Math.max(1, cssH);
    aspect = w / h;
    const s = Math.min(dpr || 1, 1.5) * 0.8;
    cw = Math.max(1, Math.round(w * s));
    chh = Math.max(1, Math.round(h * s));
    canvas.width = cw;
    canvas.height = chh;
    scale = chh; // u 空間の 1 = ステージ高
    cssScale = chh / h;
    ctx!.fillStyle = paper;
    ctx!.fillRect(0, 0, cw, chh);
  }
  resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, 1);
  spawn();

  function setTargets(t: BokujinTargetSet | null) {
    if (!t || !t.count) {
      hasT = false;
      return;
    }
    const perm = new Uint32Array(t.count);
    for (let i = 0; i < t.count; i++) perm[i] = i;
    for (let i = t.count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    let gi = 0;
    for (let i = 0; i < N; i++) {
      if (kind[i] !== 0) continue;
      const j = perm[gi % t.count];
      gi++;
      tx[i] = t.pos[j * 2];
      ty[i] = t.pos[j * 2 + 1];
      order[i] = t.order[j];
      edge[i] = t.edge[j];
    }
    hasT = true;
  }

  /** 解析的な渦の流れ場（発散なし） */
  function flow(x: number, y: number, s: number, time: number, out: Float32Array) {
    const a = x * 3.1 + s * 6.0 + time * 0.25;
    const b = y * 2.7 - time * 0.19 + s * 2.0;
    out[0] = Math.sin(b) * Math.cos(a * 0.7) * 1.4;
    out[1] = -Math.cos(a) * Math.sin(b * 0.6) * 1.4;
  }
  const fl = new Float32Array(2);

  function step(f: BokujinFrame) {
    const dt = f.dt;
    const time = f.time;
    // 軌跡：紙色を薄く重ねる
    ctx!.globalCompositeOperation = "source-over";
    ctx!.fillStyle = paper;
    ctx!.globalAlpha = Math.min(1, 1 - Math.exp(-dt / 0.09));
    ctx!.fillRect(0, 0, cw, chh);
    ctx!.globalAlpha = 1;
    ctx!.globalCompositeOperation = "lighter";

    const L = f.lights;
    const bcx = (band[0] + band[2]) * 0.5;
    const bcy = (band[1] + band[3]) * 0.5;
    const bhx = (band[2] - band[0]) * 0.5;
    const bhy = (band[3] - band[1]) * 0.5;

    // 明るさを 4 段に量子化して fillStyle の切替を減らす
    const buckets: number[][] = [[], [], [], []];
    const bucketA = [0.12, 0.26, 0.42, 0.6];

    for (let i = 0; i < N; i++) {
      let x = px[i];
      let y = py[i];
      let u = vx[i];
      let v = vy[i];
      const s = seed[i];
      const glyph = kind[i] === 0 && hasT;
      let g = glyph ? smooth(order[i] - 0.1, order[i] + 0.03, f.phase) : 0;
      g *= 1 - f.exit;

      flow(x, y, s, time, fl);
      const flowAmp = (0.14 + (0.015 - 0.14) * g) * (1 - 0.7 * f.settle * g);
      u += fl[0] * flowAmp * dt;
      v += fl[1] * flowAmp * dt;

      if (g > 0) {
        const dx = tx[i] - x;
        const dy = ty[i] - y;
        const dist = Math.hypot(dx, dy);
        let gain = (9 + 6 * gainV[i]) * g;
        if (f.mouseOn > 0.5) {
          const dm = Math.hypot(x - f.mouseX, y - f.mouseY);
          gain *= 1 - 0.75 * Math.exp((-dm * dm) / 0.012);
        }
        let ddx = dx * gain;
        let ddy = dy * gain;
        const dl = Math.hypot(ddx, ddy);
        const vmax = 3.2;
        if (dl > vmax) {
          ddx *= vmax / dl;
          ddy *= vmax / dl;
        }
        const inv = 1 / Math.max(dist, 1e-4);
        const sw = (s - 0.5) * 2.2 * smooth(0, 0.35, dist) * Math.min(dl, vmax);
        ddx += -dy * inv * sw;
        ddy += dx * inv * sw;
        const k = Math.min(1, dt * 9 * g);
        u += (ddx - u) * k;
        v += (ddy - v) * k;
      }

      if (f.mouseOn > 0.5) {
        const dmx = x - f.mouseX;
        const dmy = y - f.mouseY;
        const dd = Math.hypot(dmx, dmy);
        const fo = Math.exp((-dd * dd) / 0.009) * 3.4 * dt;
        const inv = 1 / Math.max(dd, 1e-4);
        u += dmx * inv * fo;
        v += dmy * inv * fo;
      }
      if (f.burstK > 0.001) {
        const dbx = x - f.burstX;
        const dby = y - f.burstY;
        const dd = Math.hypot(dbx, dby);
        const fo = Math.exp((-dd * dd) / 0.08) * f.burstK * 12 * dt;
        const inv = 1 / Math.max(dd, 1e-4);
        u += dbx * inv * fo;
        v += dby * inv * fo;
      }
      if (!glyph) {
        const qx = Math.abs(x - bcx) - bhx;
        const qy = Math.abs(y - bcy) - bhy;
        const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
        if (sd < 0.1) {
          const ax = x - bcx;
          const ay = y - bcy;
          const al = Math.hypot(ax, ay) || 1e-4;
          const k = (1 - Math.max(sd, 0) / 0.1) * 0.9 * dt;
          u += (ax / al) * k;
          v += (ay / al) * k;
        }
        v -= 0.01 * dt;
      }
      v -= f.exit * f.exit * 2.4 * dt;
      u += f.exit * fl[0] * 0.3 * dt;

      const damp = 2.2 + (12 - 2.2) * g;
      const dk = Math.exp(-damp * dt);
      u *= dk;
      v *= dk;
      const sp = Math.hypot(u, v);
      if (sp > 4) {
        u *= 4 / sp;
        v *= 4 / sp;
      }
      x += u * dt;
      y += v * dt;
      if (g < 0.02) {
        if (x < -0.08) x += aspect + 0.16;
        if (x > aspect + 0.08) x -= aspect + 0.16;
        if (y < -0.08) y += 1.16;
        if (y > 1.08) y -= 1.16;
      } else {
        x = Math.min(aspect + 0.3, Math.max(-0.3, x));
        y = Math.min(1.3, Math.max(-0.3, y));
      }
      px[i] = x;
      py[i] = y;
      vx[i] = u;
      vy[i] = v;

      // 明るさ（GPU 版と同じ式）
      let lit = 0;
      for (let k = 0; k < 9; k += 3) {
        const d = Math.hypot(x - L[k], y - L[k + 1]);
        lit += L[k + 2] * Math.exp(-d * d * 2.4);
      }
      const Lf = 0.42 + 0.58 * Math.min(1, lit);
      const calm = 1 - smooth(0.1, 1.4, sp);
      let a = (glyph ? 0.5 : 0.2) * Lf * (0.45 + 0.55 * calm);
      const near = glyph ? 1 - smooth(0.002, 0.012, Math.hypot(x - tx[i], y - ty[i])) : 0;
      a *= 1 + ((edge[i] ? 0.55 : 0.12) - 1) * f.settle * near;
      a *= 1 - f.exit * 0.85;
      a *= f.alpha;
      if (a < 0.02) continue;
      const b = a < 0.19 ? 0 : a < 0.34 ? 1 : a < 0.5 ? 2 : 3;
      buckets[b].push(i);
    }

    for (let b = 0; b < 4; b++) {
      const arr = buckets[b];
      if (!arr.length) continue;
      ctx!.fillStyle = tintStr(bucketA[b]);
      for (let k = 0; k < arr.length; k++) {
        const i = arr[k];
        // 粒の大きさ（css px）→ canvas px
        const size = kind[i] === 0 ? 1.7 * (0.75 + 0.5 * seed[i]) : 2.4 * (0.6 + 0.8 * seed[i]);
        const sz = Math.max(1, size * cssScale);
        ctx!.fillRect(px[i] * scale - sz / 2, py[i] * scale - sz / 2, sz, sz);
      }
    }
    ctx!.globalCompositeOperation = "source-over";
  }

  return {
    count: N,
    setTargets,
    setBand(b) {
      band[0] = b[0];
      band[1] = b[1];
      band[2] = b[2];
      band[3] = b[3];
    },
    resize,
    step,
    destroy() {
      /* 参照を切るだけ */
    },
  };
}
