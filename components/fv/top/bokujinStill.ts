/**
 * 墨塵 — 静止 1 コマ（タッチ端末・狭幅・reduced-motion）
 * シミュレーションは走らせず、「墨の粒が文字に集まった」絵を canvas 2D で一度だけ描く。
 *  - 題字の縁に濃く・内側に薄く粒を置き、少数を流れの方向へ引き伸ばして
 *    「いま集まりきった」余韻を残す（ポスター判定＝静止でも同じ個性）。
 *  - 紙の上にはまばらな漂う粒（保護帯の中には置かない）。
 *  - 明るさは灯からの距離で減衰（GPU 版と同じ式）。
 */

import type { GlyphTargets } from "./glyphTargets";

export interface StillOptions {
  cssW: number;
  cssH: number;
  dpr: number;
  /** u 空間 [x, y, I] × 3 */
  lights: Float32Array;
  /** 墨の色（0-255） */
  tint: [number, number, number];
}

export function drawBokujinStill(
  canvas: HTMLCanvasElement,
  targets: GlyphTargets | null,
  o: StillOptions
): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const DPR = Math.min(o.dpr || 1, 2);
  const W = Math.max(1, o.cssW);
  const H = Math.max(1, o.cssH);
  canvas.width = Math.max(1, Math.round(W * DPR));
  canvas.height = Math.max(1, Math.round(H * DPR));
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";

  const col = (a: number) => `rgba(${o.tint[0]}, ${o.tint[1]}, ${o.tint[2]}, ${a})`;
  const lit = (x: number, y: number) => {
    let s = 0;
    for (let k = 0; k < 9; k += 3) {
      const d = Math.hypot(x - o.lights[k], y - o.lights[k + 1]);
      s += o.lights[k + 2] * Math.exp(-d * d * 2.4);
    }
    return 0.42 + 0.58 * Math.min(1, s);
  };
  // 乱数は決定的に（リサイズで絵が踊らない）
  let sd = 1234567;
  const rnd = () => {
    sd = (sd * 1664525 + 1013904223) >>> 0;
    return sd / 4294967296;
  };

  const aspect = W / H;
  const band = targets?.band ?? [-1, -1, -1, -1];

  /* 漂う粒（保護帯の外） */
  const ambient = Math.round((W * H) / 2600);
  for (let i = 0; i < ambient; i++) {
    const ux = rnd() * aspect;
    const uy = rnd();
    if (ux > band[0] - 0.04 && ux < band[2] + 0.04 && uy > band[1] - 0.04 && uy < band[3] + 0.04) continue;
    const a = (0.08 + 0.18 * rnd()) * lit(ux, uy);
    const r = 0.7 + rnd() * 1.1;
    ctx.fillStyle = col(a);
    ctx.beginPath();
    ctx.arc(ux * H, uy * H, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!targets || !targets.count) {
    ctx.globalCompositeOperation = "source-over";
    return true;
  }

  /* 題字の粒：縁は濃く・内側は薄く。1/8 は流れの余韻として左下へ引き伸ばす */
  const want = Math.min(targets.count, 2600);
  const stride = Math.max(1, Math.floor(targets.count / want));
  for (let j = 0; j < targets.count; j += stride) {
    const ux = targets.pos[j * 2];
    const uy = targets.pos[j * 2 + 1];
    const isEdge = targets.edge[j] === 1;
    const L = lit(ux, uy);
    const tail = rnd() < 0.125;
    if (tail) {
      // 集まりきる直前の粒：目標から流れの向きへ 4〜40px 離れ、離れるほど淡い
      const dist = (4 + rnd() * 36) / H;
      const ang = Math.PI * (0.55 + rnd() * 0.5); // 左下〜下
      const x = ux + Math.cos(ang) * dist;
      const y = uy + Math.sin(ang) * dist * 0.5;
      const a = 0.26 * L * (1 - dist * H / 44);
      if (a <= 0.02) continue;
      ctx.fillStyle = col(a);
      ctx.fillRect(x * H - 0.7, y * H - 0.7, 1.4, 1.4);
      continue;
    }
    const jitter = isEdge ? 0.9 : 0.4;
    const x = ux * H + (rnd() - 0.5) * jitter;
    const y = uy * H + (rnd() - 0.5) * jitter;
    const a = (isEdge ? 0.5 : 0.3) * L;
    const s = isEdge ? 1.5 : 1.2;
    ctx.fillStyle = col(a);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.globalCompositeOperation = "source-over";
  return true;
}

/** 紙の粒（静的なノイズ）を一度だけ描く。alpha は極めて薄い */
export function drawPaperGrain(canvas: HTMLCanvasElement, cssW: number, cssH: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = Math.max(1, Math.round(cssW));
  const H = Math.max(1, Math.round(cssH));
  canvas.width = W;
  canvas.height = H;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  let sd = 987654321;
  for (let i = 0; i < d.length; i += 4) {
    sd = (sd * 1664525 + 1013904223) >>> 0;
    const v = sd >>> 24;
    // 暖色白の粒を 0〜7% の透明度で置く（簀の目の代わり）
    d[i] = 241;
    d[i + 1] = 234;
    d[i + 2] = 236;
    d[i + 3] = v < 40 ? 6 + (v & 7) : 0;
  }
  ctx.putImageData(img, 0, 0);
}
