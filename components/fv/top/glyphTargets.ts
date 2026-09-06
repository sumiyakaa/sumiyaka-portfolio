/**
 * 題字の採点 — DOM の各文字（[data-hero-letter]）を offscreen canvas 2D に
 * 同じ書体・同じ大きさ・同じ位置で描き、墨の画素を粒の目標座標として拾う。
 *
 * 座標系は「u 空間」：x ∈ [0, aspect]（= css px / ステージ高）, y ∈ [0, 1]（下向き）。
 * 距離が等方になるので、粒のシミュレーションはすべてこの空間で行う。
 *
 * 位置合わせの要点
 *  - 縦：CSS は content area（ascent+descent）を行ボックスの中央に置く。canvas の
 *    fontBoundingBoxAscent/Descent は同じフォント計量なので、行ボックス上端から
 *    (rect.height − (asc+desc))/2 + asc がベースライン。
 *  - 横：DOM に `palt`（詰め）が効いていると字幅が墨の幅近くまで縮む。canvas は
 *    palt を掛けられないので、「DOM の字幅 ≒ canvas の送り幅」なら左端合わせ、
 *    縮んでいれば墨の実測幅を字幅の中央へ寄せる（句読点も含めて概ね一致する）。
 *  - 縁（edge）：4近傍のどれかが紙なら縁。縁の粒は定着後も薄く残って呼吸する。
 *    法線方向へ 0.6px だけ外へ出し、DOM の文字の輪郭にわずかに滲ませる。
 */

export interface GlyphTargets {
  /** u 空間の目標座標（2 要素 × count） */
  pos: Float32Array;
  /** 書き順 0..1（文字 i の中の左→右も含む連続値） */
  order: Float32Array;
  /** 縁=1 / 内側=0 */
  edge: Uint8Array;
  count: number;
  letterCount: number;
  /** 題字＋宣言ブロックを覆う保護帯（u 空間 x1,y1,x2,y2） */
  band: [number, number, number, number];
  /** 題字の中心 x（0..1・ステージ幅で正規化）＝点灯の灯の x */
  h1CenterX: number;
  /** 題字の中心 y（0..1） */
  h1CenterY: number;
  aspect: number;
}

export interface SampleOptions {
  /** ラスタ倍率（css px あたり）。2 で 0.5px 精度 */
  scale?: number;
  /** 目標点の上限（超えたら一様に間引く） */
  maxCount?: number;
  /** 保護帯に含める追加要素（宣言ブロック） */
  extra?: Element | null;
  /** 墨と判定するアルファ閾値（0-255） */
  threshold?: number;
}

let scratch: HTMLCanvasElement | null = null;

function getScratch(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (!scratch) scratch = document.createElement("canvas");
  return scratch;
}

/** 文字の書体指定（canvas の ctx.font 形式）を DOM の計算スタイルから組む */
export function fontShorthand(el: Element, scale = 1): { font: string; size: number; family: string } {
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize) || 16;
  const style = cs.fontStyle && cs.fontStyle !== "normal" ? cs.fontStyle + " " : "";
  const weight = cs.fontWeight || "400";
  const family = cs.fontFamily || "serif";
  return { font: `${style}${weight} ${size * scale}px ${family}`, size, family };
}

/**
 * 題字を採点する。文字矩形が取れない（未レイアウト）ときは null。
 * 呼び出し側は document.fonts の読込を待ってから呼ぶ（待ち切れなければそのまま呼んでよい）。
 */
export function sampleGlyphTargets(
  stage: HTMLElement,
  letters: HTMLElement[],
  opts: SampleOptions = {}
): GlyphTargets | null {
  const cv = getScratch();
  if (!cv) return null;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const rc = stage.getBoundingClientRect();
  const W = rc.width;
  const H = rc.height;
  if (!W || !H) return null;
  const aspect = W / H;
  const scale = opts.scale ?? 2;
  const thr = opts.threshold ?? 128;
  const n = letters.length;
  if (!n) return null;

  const px: number[] = [];
  const py: number[] = [];
  const po: number[] = [];
  const pe: number[] = [];

  let uL = Infinity;
  let uT = Infinity;
  let uR = -Infinity;
  let uB = -Infinity;

  for (let i = 0; i < n; i++) {
    const el = letters[i];
    const ch = (el.textContent || "").trim();
    if (!ch) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    uL = Math.min(uL, r.left);
    uT = Math.min(uT, r.top);
    uR = Math.max(uR, r.right);
    uB = Math.max(uB, r.bottom);

    const { font, size } = fontShorthand(el, scale);
    const cs = getComputedStyle(el);
    const ls = parseFloat(cs.letterSpacing) || 0;

    const pad = Math.ceil(size * scale * 0.25);
    const cw = Math.ceil(r.width * scale) + pad * 2;
    const chh = Math.ceil(r.height * scale) + pad * 2;
    if (cv.width !== cw || cv.height !== chh) {
      cv.width = cw;
      cv.height = chh;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, chh);
    ctx.font = font;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    if ("fontKerning" in ctx) ctx.fontKerning = "none";

    const m = ctx.measureText(ch);
    const em = size * scale;
    const asc = typeof m.fontBoundingBoxAscent === "number" ? m.fontBoundingBoxAscent : em * 0.88;
    const desc = typeof m.fontBoundingBoxDescent === "number" ? m.fontBoundingBoxDescent : em * 0.12;
    const baseY = pad + (r.height * scale - (asc + desc)) / 2 + asc;

    // 横位置：DOM の字幅（letter-spacing を除く）と canvas の送り幅を比べ、
    // palt で縮んでいれば墨の実測幅を中央へ寄せる。そうでなければ左端合わせ。
    const domAdv = (r.width - ls) * scale;
    const cvAdv = m.width;
    let x0 = pad;
    if (cvAdv - domAdv > 1.5 * scale) {
      const inkL = typeof m.actualBoundingBoxLeft === "number" ? m.actualBoundingBoxLeft : 0;
      const inkR = typeof m.actualBoundingBoxRight === "number" ? m.actualBoundingBoxRight : cvAdv;
      const inkCenter = (inkR - inkL) / 2; // x0 からの墨中心オフセット
      x0 = pad + domAdv / 2 - inkCenter;
    }
    ctx.fillText(ch, x0, baseY);

    const img = ctx.getImageData(0, 0, cw, chh).data;
    // 墨の左右端（書き順の連続値用）
    let inkMinX = cw;
    let inkMaxX = 0;
    for (let y = 0; y < chh; y++) {
      const row = y * cw;
      for (let x = 0; x < cw; x++) {
        if (img[(row + x) * 4 + 3] >= thr) {
          if (x < inkMinX) inkMinX = x;
          if (x > inkMaxX) inkMaxX = x;
        }
      }
    }
    const inkW = Math.max(1, inkMaxX - inkMinX);

    for (let y = 1; y < chh - 1; y++) {
      const row = y * cw;
      for (let x = 1; x < cw - 1; x++) {
        const idx = (row + x) * 4 + 3;
        if (img[idx] < thr) continue;
        const l = img[idx - 4] < thr;
        const rr = img[idx + 4] < thr;
        const t = img[idx - cw * 4] < thr;
        const b = img[idx + cw * 4] < thr;
        const isEdge = l || rr || t || b;
        let ox = 0;
        let oy = 0;
        if (isEdge) {
          // 紙の側へ 0.6px（css）だけ押し出す＝輪郭の外側に滲む
          const nx = (l ? -1 : 0) + (rr ? 1 : 0);
          const ny = (t ? -1 : 0) + (b ? 1 : 0);
          const nl = Math.hypot(nx, ny) || 1;
          ox = (nx / nl) * 0.6 * scale;
          oy = (ny / nl) * 0.6 * scale;
        }
        const cssX = r.left - rc.left + (x + 0.5 - pad + ox) / scale;
        const cssY = r.top - rc.top + (y + 0.5 - pad + oy) / scale;
        px.push(cssX / H);
        py.push(cssY / H);
        po.push((i + Math.min(1, Math.max(0, (x - inkMinX) / inkW))) / n);
        pe.push(isEdge ? 1 : 0);
      }
    }
  }

  const total = px.length;
  if (!total || !Number.isFinite(uL)) return null;

  // 上限を超えたら一様に間引く（空間分布を保つため確率的に）
  const max = opts.maxCount ?? 70000;
  let keep: number[] | null = null;
  if (total > max) {
    keep = [];
    const p = max / total;
    let acc = 0;
    for (let i = 0; i < total; i++) {
      acc += p;
      if (acc >= 1) {
        acc -= 1;
        keep.push(i);
      }
    }
  }
  const count = keep ? keep.length : total;
  const pos = new Float32Array(count * 2);
  const order = new Float32Array(count);
  const edge = new Uint8Array(count);
  for (let k = 0; k < count; k++) {
    const i = keep ? keep[k] : k;
    pos[k * 2] = px[i];
    pos[k * 2 + 1] = py[i];
    order[k] = po[i];
    edge[k] = pe[i];
  }

  // 保護帯：題字＋宣言ブロック（あれば）＋余白
  let bL = uL;
  let bT = uT;
  let bR = uR;
  let bB = uB;
  if (opts.extra) {
    const d = opts.extra.getBoundingClientRect();
    if (d.width && d.height) {
      bL = Math.min(bL, d.left);
      bT = Math.min(bT, d.top);
      bR = Math.max(bR, d.right);
      bB = Math.max(bB, d.bottom);
    }
  }
  const padPx = 26;
  const band: [number, number, number, number] = [
    (bL - padPx - rc.left) / H,
    (bT - padPx - rc.top) / H,
    (bR + padPx - rc.left) / H,
    (bB + padPx * 1.4 - rc.top) / H,
  ];

  return {
    pos,
    order,
    edge,
    count,
    letterCount: n,
    band,
    h1CenterX: Math.min(0.9, Math.max(0.1, ((uL + uR) / 2 - rc.left) / W)),
    h1CenterY: ((uT + uB) / 2 - rc.top) / H,
    aspect,
  };
}

/**
 * 題字の書体が使える状態になるまで待つ（上限 ms）。次の描画フレームまで待ってから
 * 解決するので、呼び出し側は直後に採点してよい。
 */
export async function waitForGlyphFonts(letter: Element | null, limitMs: number): Promise<void> {
  if (typeof document === "undefined") return;
  const fonts = document.fonts;
  if (!fonts) return;
  const jobs: Promise<unknown>[] = [];
  if (letter) {
    const { font } = fontShorthand(letter);
    try {
      jobs.push(fonts.load(font));
    } catch {
      /* 書体指定が解釈できない環境：ready だけ待つ */
    }
  }
  jobs.push(fonts.ready);
  await Promise.race([
    Promise.all(jobs).catch(() => undefined),
    new Promise<void>((r) => setTimeout(r, limitMs)),
  ]);
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}
