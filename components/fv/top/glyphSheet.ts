/**
 * 題字の版下（はんした）— DOM の各文字（[data-hero-letter]）を offscreen canvas 2D に
 * 同じ書体・同じ大きさ・同じ位置で描いた 1 枚の画像と、その計量。
 *
 * 旧 glyphTargets.ts は「墨の画素を粒の目標座標として拾う」ためのものだったが、
 * 転記（A案）では粒を使わない。筆は版下を左→右に切り出して描く（drawImage の
 * ソース矩形を伸ばす）ことで字画を書き上げ、書かれた側から DOM の文字へ渡す。
 * 版下は渡し終えた部分から透明になるので、題字の筆画の上には何も残らない。
 *
 * 座標系は「ステージ css px」（ステージ左上が原点）。
 *
 * 位置合わせの要点（旧 glyphTargets.ts の実証済みの計算をそのまま移した）
 *  - 縦：CSS は content area（ascent+descent）を行ボックスの中央に置く。canvas の
 *    fontBoundingBoxAscent/Descent は同じフォント計量なので、行ボックス上端から
 *    (rect.height − (asc+desc))/2 + asc がベースライン。
 *  - 横：DOM に `palt`（詰め）が効いていると字幅が墨の幅近くまで縮む。canvas は
 *    palt を掛けられないので、「DOM の字幅 ≒ canvas の送り幅」なら左端合わせ、
 *    縮んでいれば墨の実測幅を字幅の中央へ寄せる（句読点も含めて概ね一致する）。
 */

export interface GlyphLetter {
  /** DOM の字箱（ステージ css 座標） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 墨の左端・右端・中心（ステージ css 座標・掃引の判定に使う） */
  inkL: number;
  inkR: number;
  inkC: number;
  /** 何行目か */
  line: number;
}

export interface GlyphLine {
  /** 墨の左端・右端（ステージ css 座標） */
  left: number;
  right: number;
  /** 字箱の上端・下端と中心 y */
  top: number;
  bottom: number;
  midY: number;
  width: number;
  /** この行に属する文字の添字（両端含む） */
  first: number;
  last: number;
}

export interface GlyphSheet {
  /** 版下（題字の bbox ＋ 余白ぶんだけの大きさ） */
  canvas: HTMLCanvasElement;
  /** 版下 1 css px あたりの画素数 */
  scale: number;
  /** 版下の左上（ステージ css 座標） */
  ox: number;
  oy: number;
  /** 版下の css 寸法 */
  sw: number;
  sh: number;
  letters: GlyphLetter[];
  lines: GlyphLine[];
  /** 題字の bbox（ステージ css 座標） */
  h1L: number;
  h1T: number;
  h1R: number;
  h1B: number;
  /** 保護帯＝題字＋本文カラム＋余白（ステージ css 座標 x1,y1,x2,y2） */
  band: [number, number, number, number];
  /** 題字の中心 x（0..1・ステージ幅で正規化）＝点灯の灯の x */
  centerX: number;
  /** 題字の字送り（最大の font-size・css px） */
  fontPx: number;
}

export interface SheetOptions {
  /** 版下の解像度（css px あたり）。既定は dpr（上限 2） */
  scale?: number;
  /** 保護帯に含める追加要素（本文カラム全体） */
  extra?: Element | null;
}

/**
 * 版下を焼かずに「題字がどこにあるか」だけを測る速報版（初速のため）。
 *
 * 断片の散らばり〜整列〜一本化は題字の字形を必要とせず、行の位置と幅さえ分かれば
 * 進められる。DOM の矩形は書体の読込を待たずに取れる（＝代替書体の計量になるが、
 * 帯の位置が数 % ずれるだけ）。版下が焼けたら rowFromSheet で正確な値へ寄せ直す。
 */
export interface RoughLayout {
  h1L: number;
  h1T: number;
  h1R: number;
  h1B: number;
  lines: { left: number; right: number; top: number; bottom: number; midY: number }[];
  fontPx: number;
}

export function probeGlyphLayout(
  stage: HTMLElement,
  letters: HTMLElement[]
): RoughLayout | null {
  const rc = stage.getBoundingClientRect();
  if (!rc.width || !rc.height || !letters.length) return null;
  let h1L = Infinity;
  let h1T = Infinity;
  let h1R = -Infinity;
  let h1B = -Infinity;
  let fontPx = 0;
  const lines: RoughLayout["lines"] = [];
  let key = NaN;

  for (const el of letters) {
    if (!(el.textContent || "").trim()) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const x = r.left - rc.left;
    const y = r.top - rc.top;
    if (x < h1L) h1L = x;
    if (y < h1T) h1T = y;
    if (x + r.width > h1R) h1R = x + r.width;
    if (y + r.height > h1B) h1B = y + r.height;
    const size = parseFloat(getComputedStyle(el).fontSize) || 0;
    if (size > fontPx) fontPx = size;

    const k = Math.round(y / 3);
    if (!lines.length || k !== key) {
      key = k;
      lines.push({ left: x, right: x + r.width, top: y, bottom: y + r.height, midY: 0 });
    }
    const ln = lines[lines.length - 1];
    if (x < ln.left) ln.left = x;
    if (x + r.width > ln.right) ln.right = x + r.width;
    if (y < ln.top) ln.top = y;
    if (y + r.height > ln.bottom) ln.bottom = y + r.height;
  }
  if (!lines.length || !Number.isFinite(h1L)) return null;
  for (const ln of lines) ln.midY = (ln.top + ln.bottom) / 2;
  return { h1L, h1T, h1R, h1B, lines, fontPx: fontPx || 24 };
}

let sheetCanvas: HTMLCanvasElement | null = null;

/** 文字の書体指定（canvas の ctx.font 形式）を DOM の計算スタイルから組む */
export function fontShorthand(el: Element): { font: string; size: number } {
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize) || 16;
  const style = cs.fontStyle && cs.fontStyle !== "normal" ? cs.fontStyle + " " : "";
  const weight = cs.fontWeight || "400";
  const family = cs.fontFamily || "serif";
  return { font: `${style}${weight} ${size}px ${family}`, size };
}

/**
 * 版下を焼く。文字矩形が取れない（未レイアウト）ときは null。
 * 呼び出し側は document.fonts の読込を待ってから呼ぶ（待ち切れなければそのまま呼んでよい）。
 */
export function buildGlyphSheet(
  stage: HTMLElement,
  letters: HTMLElement[],
  opts: SheetOptions = {}
): GlyphSheet | null {
  if (typeof document === "undefined") return null;
  const rc = stage.getBoundingClientRect();
  const W = rc.width;
  const H = rc.height;
  if (!W || !H || !letters.length) return null;

  interface Box {
    el: HTMLElement;
    ch: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }
  const boxes: Box[] = [];
  let h1L = Infinity;
  let h1T = Infinity;
  let h1R = -Infinity;
  let h1B = -Infinity;
  let fontPx = 0;

  for (const el of letters) {
    const ch = (el.textContent || "").trim();
    if (!ch) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const x = r.left - rc.left;
    const y = r.top - rc.top;
    boxes.push({ el, ch, x, y, w: r.width, h: r.height });
    if (x < h1L) h1L = x;
    if (y < h1T) h1T = y;
    if (x + r.width > h1R) h1R = x + r.width;
    if (y + r.height > h1B) h1B = y + r.height;
  }
  if (!boxes.length || !Number.isFinite(h1L)) return null;

  const cv = sheetCanvas ?? (sheetCanvas = document.createElement("canvas"));
  const ctx = cv.getContext("2d");
  if (!ctx) return null;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const scale = Math.max(1, Math.min(opts.scale ?? dpr, 2));
  const pad = 14;
  const ox = h1L - pad;
  const oy = h1T - pad;
  const sw = h1R - h1L + pad * 2;
  const sh = h1B - h1T + pad * 2;
  const pxW = Math.max(1, Math.ceil(sw * scale));
  const pxH = Math.max(1, Math.ceil(sh * scale));
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, sw, sh);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = getComputedStyle(boxes[0].el).color || "#f8f4f5";
  if ("fontKerning" in ctx) ctx.fontKerning = "none";

  const out: GlyphLetter[] = [];
  for (const b of boxes) {
    const { font, size } = fontShorthand(b.el);
    if (size > fontPx) fontPx = size;
    const ls = parseFloat(getComputedStyle(b.el).letterSpacing) || 0;
    ctx.font = font;

    const m = ctx.measureText(b.ch);
    const asc = typeof m.fontBoundingBoxAscent === "number" ? m.fontBoundingBoxAscent : size * 0.88;
    const desc = typeof m.fontBoundingBoxDescent === "number" ? m.fontBoundingBoxDescent : size * 0.12;
    const baseY = (b.h - (asc + desc)) / 2 + asc;

    const domAdv = b.w - ls;
    const cvAdv = m.width;
    const inkL = typeof m.actualBoundingBoxLeft === "number" ? m.actualBoundingBoxLeft : 0;
    const inkR = typeof m.actualBoundingBoxRight === "number" ? m.actualBoundingBoxRight : cvAdv;
    let x0 = 0;
    if (cvAdv - domAdv > 1.5) x0 = domAdv / 2 - (inkR - inkL) / 2;

    ctx.fillText(b.ch, b.x - ox + x0, b.y - oy + baseY);

    // 墨の左右端（掃引の判定用）。計量が取れない書体では字箱で代用する
    const l = Number.isFinite(inkL) ? b.x + x0 - inkL : b.x;
    const r = Number.isFinite(inkR) ? b.x + x0 + inkR : b.x + b.w;
    out.push({
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      inkL: Math.min(l, b.x + b.w),
      inkR: Math.max(r, b.x),
      inkC: (Math.min(l, b.x + b.w) + Math.max(r, b.x)) / 2,
      line: 0,
    });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  /* ---- 行の切り分け（字箱の上端でまとめる＝折返しがあっても正しく分かれる） ---- */
  const lines: GlyphLine[] = [];
  let key = NaN;
  for (let i = 0; i < out.length; i++) {
    const g = out[i];
    const k = Math.round(g.y / 3);
    if (!lines.length || k !== key) {
      key = k;
      lines.push({
        left: g.inkL,
        right: g.inkR,
        top: g.y,
        bottom: g.y + g.h,
        midY: 0,
        width: 0,
        first: i,
        last: i,
      });
    }
    const ln = lines[lines.length - 1];
    if (g.inkL < ln.left) ln.left = g.inkL;
    if (g.inkR > ln.right) ln.right = g.inkR;
    if (g.y < ln.top) ln.top = g.y;
    if (g.y + g.h > ln.bottom) ln.bottom = g.y + g.h;
    ln.last = i;
    g.line = lines.length - 1;
  }
  for (const ln of lines) {
    ln.midY = (ln.top + ln.bottom) / 2;
    ln.width = Math.max(1, ln.right - ln.left);
  }

  /* ---- 保護帯：題字＋本文カラム（あれば）＋余白 ---- */
  let bL = h1L;
  let bT = h1T;
  let bR = h1R;
  let bB = h1B;
  const ex = opts.extra?.getBoundingClientRect();
  if (ex && ex.width && ex.height) {
    bL = Math.min(bL, ex.left - rc.left);
    bT = Math.min(bT, ex.top - rc.top);
    bR = Math.max(bR, ex.right - rc.left);
    bB = Math.max(bB, ex.bottom - rc.top);
  }
  const bp = 26;

  return {
    canvas: cv,
    scale,
    ox,
    oy,
    sw,
    sh,
    letters: out,
    lines,
    h1L,
    h1T,
    h1R,
    h1B,
    band: [bL - bp, bT - bp, bR + bp, bB + bp * 1.3],
    centerX: Math.min(0.9, Math.max(0.1, (h1L + h1R) / 2 / W)),
    fontPx: fontPx || 24,
  };
}

/**
 * 題字の書体が使える状態になるまで待つ（上限 ms）。次の描画フレームまで待ってから
 * 解決するので、呼び出し側は直後に版下を焼いてよい。
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
