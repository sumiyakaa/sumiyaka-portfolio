/**
 * /service FV — 床面グリッドの幾何（純関数・DOM 非依存）
 *
 * 「製図台の上の一枚の図面」を、消失点へ収束する 2D の直線だけで描く（3D 不使用）。
 *  - horizon：基準線（消失点を通る水平線）
 *  - ray    ：消失点から手前へ放射する線（床の縦罫）
 *  - row    ：奥ほど詰まる水平線（床の横罫）＝ z_i = 1 + k·i の透視間隔
 * 座標は px。呼び出し側が実測した幅・高さで組み直す（viewBox を px に一致させ、
 * stroke-dasharray による「線が引かれる」演出を px 長で正確に行うため）。
 */
export type FloorSeg = {
  kind: "horizon" | "ray" | "row";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 描画順の重み（小さいほど先）。ray＝消失点からの横距離、row＝奥からの順 */
  order: number;
};

export type Floor = {
  vx: number;
  vy: number;
  segs: FloorSeg[];
};

/** 消失点の位置（層の幅・高さに対する比率）。非対称＝中央対称の連発を避ける */
export const FLOOR_VP = { x: 0.6, y: 0.333 } as const;

/** 放射線の間隔（層幅に対する比率）と、左右へどこまで撒くか（層幅の倍数） */
const RAY_STEP = 0.16;
const RAY_SPREAD = 2.4;
/** 横罫の本数と透視の詰まり具合 */
const ROW_COUNT = 12;
const ROW_K = 0.45;

export function buildFloor(width: number, height: number): Floor {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const vx = W * FLOOR_VP.x;
  const vy = H * FLOOR_VP.y;
  const segs: FloorSeg[] = [];

  segs.push({ kind: "horizon", x1: 0, y1: vy, x2: W, y2: vy, order: 0 });

  const step = W * RAY_STEP;
  for (let xb = vx - W * RAY_SPREAD; xb <= vx + W * RAY_SPREAD + 1; xb += step) {
    segs.push({
      kind: "ray",
      x1: vx,
      y1: vy,
      x2: xb,
      y2: H,
      order: Math.abs(xb - vx) / step,
    });
  }

  for (let i = 0; i < ROW_COUNT; i++) {
    const y = vy + (H - vy) / (1 + ROW_K * i);
    // i=0 は最下端＝層の外周と重なるので一段だけ内側から始める
    if (i === 0) continue;
    segs.push({ kind: "row", x1: 0, y1: y, x2: W, y2: y, order: ROW_COUNT - i });
  }

  return { vx, vy, segs };
}

export function segLength(s: FloorSeg): number {
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
}
