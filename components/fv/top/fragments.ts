/**
 * 転記の断片 — 事務のデータの断片（CSV の行 / Excel の升目 / PDF の紙片）。
 *
 * 抽象な粒ではなく「実務のデータ」で軸コピーを演じるための素材。
 *   散らばり  角度も大きさもばらばらに漂う（＝バラバラな事務作業）
 *   整列      誰も触らないのに回転が戻り、水平に揃って一列の帯になる。
 *             断片の中の行が左右へ伸び、隣の断片と端で繋がる（＝繋がっていないものが繋がる）
 *   一本化    行が中心へ寄り、枡目と枠が消え、1 本の細い線になる
 *
 * ⚠ 実在しそうな会社名・金額・日付・氏名は一切描かない（捏造になる）。
 *   中身は「罫」と「桁を表す短い線」だけの抽象。ラベルは拡張子の 3〜4 文字のみ。
 *
 * 描画は canvas 2D のみ（filter・blend・3D は使わない＝iOS/WebKit 安全）。
 * 加算合成（lighter）で暗い紙の上に淡く光る線として置く。
 */

export type FragKind = 0 | 1 | 2; // 0=CSV(行) 1=XLSX(升目) 2=PDF(紙片)

const LABELS: readonly string[] = ["CSV", "XLSX", "PDF"];

export interface Frag {
  kind: FragKind;
  label: string;
  /** 散らばりの位置・角度・寸法（ステージ css 座標） */
  sx: number;
  sy: number;
  rot: number;
  w0: number;
  h0: number;
  /** 漂いの振幅・角速度・位相 */
  ax: number;
  ay: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
  /** 整列後の席（帯を等分した何番目か）。実座標は描画時に帯から求める＝
   *  版下が焼けて帯の実測値が入れ替わっても、目標が滑らかに追従する */
  slot: number;
  /** 整列の時差（0..1 のうち自分が動く区間） */
  d0: number;
  d1: number;
  /** 内側の作り */
  rows: number;
  cols: number;
  /** 行ごとの区間 [x0,x1]（0..1・rows×2） */
  runs: number[];
  /** 値を表す短い塗り [row, x0, x1] × k */
  bars: number[];
}

export interface FragRow {
  /** 帯の中心 y と左右端（ステージ css 座標） */
  y: number;
  left: number;
  right: number;
  h: number;
}

export interface FragConfig {
  row: FragRow;
  /** 散らばりの領域 [x0, y0, x1, y1] */
  region: [number, number, number, number];
  count: number;
  seed?: number;
}

export interface DrawFragOptions {
  /** 漂い用の時計（秒） */
  t: number;
  /** 整列 0..1（全体） */
  align: number;
  /** 一本化 0..1 */
  collapse: number;
  /** 全体の不透明度 */
  alpha: number;
  /** 墨の色（0-255） */
  ink: [number, number, number];
  /** ラベルの書体（ctx.font 形式） */
  labelFont: string;
  /** 灯からの明るさ 0.5..1 を返す（ステージ css 座標） */
  lit?: (x: number, y: number) => number;
  /** 断片ごとの整列進捗を外から与える（静止 1 コマ用） */
  progressOf?: (i: number, n: number) => number;
  /** 断片ごとの一本化を外から与える（静止 1 コマ用） */
  collapseOf?: (i: number, n: number) => number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const u = clamp01((v - a) / (b - a || 1e-6));
  return u * u * (3 - 2 * u);
};
const easeIO = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/** 決定的な乱数（リサイズで絵が踊らない） */
function mkRand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 帯（整列後の一列）＝題字の 1 行目の位置と幅 */
export function rowFromSheet(sheet: {
  lines: { left: number; right: number; midY: number }[];
  fontPx: number;
}): FragRow {
  const l0 = sheet.lines[0];
  return {
    y: l0.midY,
    left: l0.left,
    right: l0.right,
    h: Math.max(13, Math.min(34, sheet.fontPx * 0.46)),
  };
}

/** 散らばりの領域＝題字の周り（題字より少し広く、画面の縁は避ける） */
export function regionFromSheet(
  sheet: { h1L: number; h1T: number; h1R: number; h1B: number },
  W: number,
  H: number
): [number, number, number, number] {
  const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  return [
    cl(sheet.h1L - H * 0.15, W * 0.04, W * 0.46),
    cl(sheet.h1T - H * 0.17, H * 0.06, H * 0.42),
    cl(sheet.h1R + H * 0.15, W * 0.54, W * 0.96),
    cl(sheet.h1B + H * 0.03, H * 0.58, H * 0.9),
  ];
}

/** 断片の数（帯の幅から。狭いほど少なく） */
export function countForRow(row: FragRow): number {
  return Math.max(7, Math.min(14, Math.round((row.right - row.left) / 62)));
}

export function buildFragments(cfg: FragConfig): Frag[] {
  const rnd = mkRand(cfg.seed ?? 20260907);
  const n = Math.max(3, cfg.count);
  const row = cfg.row;
  const [rx0, ry0, rx1, ry1] = cfg.region;
  const slot = (row.right - row.left) / n;
  const gap = Math.min(slot * 0.16, 9);

  // 散らばりの席（ジッタ付き格子）＝重なり過ぎを避ける。席の割り当ては無作為
  const regW = Math.max(1, rx1 - rx0);
  const regH = Math.max(1, ry1 - ry0);
  const cols = Math.max(2, Math.round(Math.sqrt((n * regW) / Math.max(1, regH))));
  const rowsN = Math.max(2, Math.ceil(n / cols));
  const seats: number[] = [];
  for (let i = 0; i < cols * rowsN; i++) seats.push(i);
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = seats[i];
    seats[i] = seats[j];
    seats[j] = tmp;
  }

  const frags: Frag[] = [];
  for (let i = 0; i < n; i++) {
    const kind = (i % 3) as FragKind;
    const seat = seats[i];
    const cx = seat % cols;
    const cy = Math.floor(seat / cols);
    const sx = rx0 + ((cx + 0.5 + (rnd() - 0.5) * 0.66) / cols) * regW;
    const sy = ry0 + ((cy + 0.5 + (rnd() - 0.5) * 0.66) / rowsN) * regH;

    const tw = slot - gap;
    const th = row.h;
    const w0 = tw * (0.66 + rnd() * 0.62);
    const h0 = Math.min(th * 2.3, w0 * (0.4 + rnd() * 0.3));

    const rowsIn = kind === 1 ? 3 : kind === 0 ? 5 : 3;
    const colsIn = kind === 1 ? 3 + Math.floor(rnd() * 2) : 1;
    const runs: number[] = [];
    for (let r = 0; r < rowsIn; r++) {
      const a = 0.04 + rnd() * 0.16;
      const b = 0.62 + rnd() * 0.34;
      runs.push(a, Math.max(a + 0.14, b));
    }
    const bars: number[] = [];
    const nb = kind === 2 ? 0 : 2;
    for (let k = 0; k < nb; k++) {
      const r = Math.floor(rnd() * rowsIn);
      const a = 0.1 + rnd() * 0.5;
      bars.push(r, a, a + 0.1 + rnd() * 0.2);
    }

    frags.push({
      kind,
      label: LABELS[kind],
      sx,
      sy,
      rot: (rnd() - 0.5) * 0.95,
      w0,
      h0,
      ax: 3 + rnd() * 7,
      ay: 2.5 + rnd() * 6,
      w1: 0.5 + rnd() * 0.7,
      w2: 0.4 + rnd() * 0.7,
      p1: rnd() * 6.28,
      p2: rnd() * 6.28,
      slot: i,
      d0: (i / n) * 0.34,
      d1: (i / n) * 0.34 + 0.66,
      rows: rowsIn,
      cols: colsIn,
      runs,
      bars,
    });
  }
  return frags;
}

/**
 * 断片を描く（加算合成）。align / collapse は 0..1。
 * 戻り値は「一本化された線」の左右端（ステージ css 座標）— 呼び出し側が
 * 筆の掃引の起点として使う。
 */
export function drawFragments(
  ctx: CanvasRenderingContext2D,
  frags: Frag[],
  row: FragRow,
  o: DrawFragOptions
): void {
  const n = frags.length;
  if (!n || o.alpha <= 0.003) return;
  const col = (a: number) => `rgba(${o.ink[0]}, ${o.ink[1]}, ${o.ink[2]}, ${a})`;
  const lit = o.lit ?? (() => 1);
  const lw = 1.15;

  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "butt";
  ctx.font = o.labelFont;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // 橋（隣の断片と端で繋がる線）用に、各断片の実位置を控える
  const bx: number[] = [];
  const by: number[] = [];
  const bw: number[] = [];
  const bridgeK = smooth(0.52, 1, o.align);
  // 整列後の席は「いまの帯」から求める（帯が実測値へ寄せ直されても目標が追従する）
  const slotW = (row.right - row.left) / n;
  const slotGap = Math.min(slotW * 0.16, 9);

  for (let i = 0; i < n; i++) {
    const f = frags[i];
    const p = o.progressOf
      ? clamp01(o.progressOf(i, n))
      : easeIO(clamp01((o.align - f.d0) / (f.d1 - f.d0)));
    const conv = o.collapseOf ? clamp01(o.collapseOf(i, n)) : o.collapse;

    const tx = row.left + (f.slot + 0.5) * slotW;
    const ty = row.y;
    const tw = slotW - slotGap;
    const th = row.h;

    const dx = f.sx + Math.sin(o.t * f.w1 + f.p1) * f.ax;
    const dy = f.sy + Math.sin(o.t * f.w2 + f.p2) * f.ay;
    const rot = (f.rot + Math.sin(o.t * 0.42 + f.p1) * 0.05) * (1 - p);
    const cx = dx + (tx - dx) * p;
    const cy = dy + (ty - dy) * p;
    const w = f.w0 + (tw - f.w0) * p;
    const hFull = f.h0 + (th - f.h0) * p;
    const h = hFull * (1 - 0.94 * conv);

    bx.push(cx);
    by.push(cy);
    bw.push(w);

    const L = lit(cx, cy);
    const detail = (1 - conv) * o.alpha * L;
    const extend = Math.max(smooth(0.5, 1, p), conv);
    const mid = (f.rows - 1) / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);

    // 枠（XLSX の升目・PDF の紙片）
    if (f.kind !== 0 && detail > 0.01) {
      ctx.strokeStyle = col(detail * (f.kind === 2 ? 0.34 : 0.26));
      ctx.lineWidth = lw;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
    // 縦の罫（升目）
    if (f.kind === 1 && detail > 0.01) {
      ctx.strokeStyle = col(detail * 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 1; c < f.cols; c++) {
        const x = -w / 2 + (w * c) / f.cols;
        ctx.moveTo(x, -h / 2);
        ctx.lineTo(x, h / 2);
      }
      ctx.stroke();
    }

    // 横の罫（行）— 中央の 1 本が「背骨」。一本化で全部が背骨へ寄る
    for (let r = 0; r < f.rows; r++) {
      const isMid = Math.abs(r - mid) < 0.001;
      const a0 = f.runs[r * 2];
      const a1 = f.runs[r * 2 + 1];
      const e = isMid ? Math.max(extend, conv) : extend;
      const x0 = (a0 + (0 - a0) * e) * w - w / 2;
      const x1 = (a1 + (1 - a1) * e) * w - w / 2;
      const y = ((r - mid) / f.rows) * hFull * (1 - conv);
      const a = isMid
        ? o.alpha * L * (0.5 + 0.5 * conv)
        : o.alpha * L * 0.42 * (1 - conv);
      if (a <= 0.012) continue;
      ctx.fillStyle = col(a);
      ctx.fillRect(x0, y - lw / 2, Math.max(1, x1 - x0), lw);
    }

    // 値を表す短い塗り（桁の抽象・文字は書かない）
    if (detail > 0.02 && f.bars.length) {
      ctx.fillStyle = col(detail * 0.5);
      for (let k = 0; k < f.bars.length; k += 3) {
        const r = f.bars[k];
        const y = ((r - mid) / f.rows) * hFull * (1 - conv);
        const x0 = f.bars[k + 1] * w - w / 2;
        const x1 = Math.min(f.bars[k + 2], 0.96) * w - w / 2;
        ctx.fillRect(x0, y - lw, Math.max(1.5, x1 - x0), lw * 1.8);
      }
    }
    ctx.restore();

    // ラベル（CSV / XLSX / PDF）— 断片の左上に小さく
    if (detail > 0.05) {
      ctx.fillStyle = col(detail * 0.4);
      ctx.save();
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      ctx.fillText(f.label, -w / 2, -h / 2 - 4);
      ctx.restore();
    }
  }

  // 橋＝隣の断片の端どうしを繋ぐ（帯の両端も締める）。
  // 一本化し切ったときに断片の背骨と同じ明るさになるよう、係数と灯の当たりを揃える
  if (bridgeK > 0.004) {
    const a = o.alpha * bridgeK * (0.34 + 0.66 * o.collapse);
    if (a > 0.012) {
      const seg = (x0: number, x1: number, y: number) => {
        if (x1 - x0 <= 0.5) return;
        ctx.fillStyle = col(a * lit((x0 + x1) / 2, y));
        ctx.fillRect(x0, y - lw / 2, x1 - x0, lw);
      };
      seg(row.left, bx[0] - bw[0] / 2, by[0]);
      for (let i = 0; i < n - 1; i++) {
        seg(bx[i] + bw[i] / 2, bx[i + 1] - bw[i + 1] / 2, (by[i] + by[i + 1]) / 2);
      }
      seg(bx[n - 1] + bw[n - 1] / 2, row.right, by[n - 1]);
    }
  }

  ctx.globalCompositeOperation = prev;
}
