/**
 * /tools 共通 — PDF 組版キット
 *
 * 1本目「請求書PDF 一括作成」(T-01) で作った汎用部だけをここへ移した。
 *
 * ⚠ **このファイルをツールごとにコピーしないこと。**
 *    とくに fontkit の当て木（hardenSubset）は、外すと日本語が半分消える。
 *    コピーして散らばると、直すときに片方だけ直す事故が起きる。
 *
 * ⚠ PDF を出すときは必ず createJpPdf() から始める。
 *    グリフ収録チェック → registerFontkit(safeFontkit) → subsetSafe 判定 →
 *    embedFont の順序には意味があり、飛ばすと豆腐や文字落ちが出る。
 */
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import type { Color, PDFFont, PDFImage, PDFPage } from "pdf-lib";

/* A4 の寸法は pdf-lib 非依存の paper.ts が持つ。
   画面側（クライアントコンポーネント）が寸法だけ欲しいときは、ここではなく
   "./paper" から取ること。pdfKit 経由だと pdf-lib が初期バンドルへ入る。 */
export { A4_H, A4_LANDSCAPE_H, A4_LANDSCAPE_W, A4_W, mmToPt, ptToMm } from "./paper";

/* 色 */
export const INK = rgb(0.09, 0.09, 0.09);
export const SUB = rgb(0.42, 0.42, 0.42);
export const HAIRLINE = rgb(0.78, 0.78, 0.78);
export const BAND = rgb(0.949, 0.945, 0.937);
export const PAPER = rgb(1, 1, 1);

/* 罫線は 2 種類だけ */
export const RULE = 0.8;
export const HAIR = 0.35;

/* 字の縦位置。Noto Sans JP は 1000upm・和字の実体は概ね -0.08em〜0.84em に収まる */
export const ASC = 0.86; // 行の視覚上端（ベースラインからの em 比）
export const DESC = 0.14; // 行の視覚下端
export const OPTICAL_CENTER = 0.375; // 和字・欧字ともほぼこの高さが視覚的中心
/** 実際に墨が乗る範囲。版面からのはみ出しを測るのはこちら */
export const INK_ASC = 0.84;
export const INK_DESC = 0.12;
/* 禁則処理 */
const NO_LINE_START = "、。，．,.?!？！）]｝〉》」』】〕)}>ー～〜・:：;；…‥ゝゞ々ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ";
const NO_LINE_END = "（[｛〈《「『【〔({<￥$#";
/** 欧文・数字はできるだけ語の途中で折らない */
const WORD_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.-_+@/#&'";
/** 「1丁目」「3号」「8月」のように、数字と助数詞のあいだでは折らない */
const COUNTER_CHARS = "号番丁目階室棟条線区町市村郡県府都円個名日月年時分秒台本枚件通式点人回箱組枚部冊％%";
const COUNTER_HEAD = /^[0-9][0-9,.]*[^0-9,.]?$/;
/** 検証用。描いた要素の実測値を受け取る（本番経路では未設定＝何もしない） */
export type DrawAudit = (record: {
  page: number;
  kind: "text" | "rect" | "line" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}) => void;

let auditSink: DrawAudit | null = null;

/** 検証用。版面からのはみ出しを数値で確かめるためのフック */
export function __setDrawAuditForTest(sink: DrawAudit | null): void {
  auditSink = sink;
}

/* ------------------------------------------------------------------ *
 * @pdf-lib/fontkit 1.1.1 のサブセット生成にある桁落ちを直す当て木
 *
 * fontkit は loca テーブルを短形式で書くとき offset を `>>>= 1` する。
 * 短形式は「オフセット ÷ 2」を格納する仕様なので、グリフ長が奇数だと
 * 1 バイトぶん切り捨てられ、そこから後ろのグリフが全部ずれる。
 * Noto Sans JP は 17,100 グリフ中 8,497（49.7%）が奇数長なので、
 * 素で subset:true にすると日本語のおよそ半分が消える（実測）。
 *
 * ここでは (1) loca を長形式に固定し、(2) グリフ長を偶数に揃える。
 * どちらか一方でも直るが、両方入れておけば形式の選び方に依存しない。
 * 当て木を差し込めなかったときはサブセットを諦める（文字化けより重い方を選ぶ）。
 * ------------------------------------------------------------------ */

interface SubsetInternals {
  loca?: { version?: number | null; offsets: number[] };
  glyf?: Uint8Array[];
  offset?: number;
  _addGlyph?: (gid: number) => number;
}

/** 元のバッファと同じ型のまま 1 バイト伸ばす（fontkit のストリームは Buffer 系しか受け取らない） */
function padToEven(buffer: Uint8Array): Uint8Array | null {
  const ctor = (buffer as { constructor?: unknown }).constructor as
    | (((size: number) => Uint8Array) & { alloc?: (size: number) => Uint8Array })
    | undefined;
  if (typeof ctor !== "function") return null;
  let padded: Uint8Array | null = null;
  try {
    padded = typeof ctor.alloc === "function"
      ? ctor.alloc(buffer.length + 1)
      : new (ctor as unknown as new (size: number) => Uint8Array)(buffer.length + 1);
  } catch {
    return null;
  }
  if (!padded || padded.length !== buffer.length + 1) return null;
  padded.set(buffer, 0);
  padded[buffer.length] = 0;
  return padded;
}

function hardenSubset(subset: SubsetInternals): boolean {
  const original = subset._addGlyph;
  if (typeof original !== "function") return false;
  subset._addGlyph = function patchedAddGlyph(this: SubsetInternals, gid: number): number {
    // ここが本命。長形式なら `>>>= 1` の桁落ちが起きない
    if (this.loca && this.loca.version === undefined) this.loca.version = 1;
    const index = original.call(this, gid);
    const glyf = this.glyf;
    if (glyf && typeof index === "number") {
      const buffer = glyf[index];
      if (buffer && buffer.length % 2 === 1) {
        const padded = padToEven(buffer);
        if (padded) {
          glyf[index] = padded;
          if (typeof this.offset === "number") this.offset += 1;
        }
      }
    }
    return index;
  };
  return true;
}

/** createSubset() の戻り値に当て木を差し込む fontkit のラッパー */
export const safeFontkit = {
  create(data: Uint8Array, postscriptName?: string) {
    const font = fontkit.create(data, postscriptName);
    const createSubset = font.createSubset;
    if (typeof createSubset === "function") {
      (font as { createSubset: () => unknown }).createSubset = function wrapped() {
        const subset = createSubset.call(font);
        try {
          hardenSubset(subset as SubsetInternals);
        } catch {
          /* 当て木が当たらなくても、下の subsetSafe 判定で subset を切る */
        }
        return subset;
      };
    }
    return font;
  },
};

/* ------------------------------------------------------------------ *
 * 文字の収録チェック（豆腐ゼロのため）
 * ------------------------------------------------------------------ */

export interface FontFacts {
  /** このフォントに収録されているコードポイント */
  coverage: Set<number>;
  /** サブセットの当て木を差し込める版かどうか */
  subsetSafe: boolean;
}

const factsCache = new WeakMap<Uint8Array, FontFacts>();

export function fontFacts(fontBytes: Uint8Array): FontFacts | null {
  const cached = factsCache.get(fontBytes);
  if (cached) return cached;
  try {
    const parsed = fontkit.create(fontBytes);
    let subsetSafe = false;
    try {
      const probe = parsed.createSubset() as unknown as SubsetInternals;
      subsetSafe = typeof probe._addGlyph === "function";
    } catch {
      subsetSafe = false;
    }
    const facts: FontFacts = { coverage: new Set<number>(parsed.characterSet), subsetSafe };
    factsCache.set(fontBytes, facts);
    return facts;
  } catch {
    // チェックできないだけなので描画は続ける
    return null;
  }
}

function glyphCoverage(fontBytes: Uint8Array): Set<number> | null {
  return fontFacts(fontBytes)?.coverage ?? null;
}

/**
 * フォントに無い文字を集める。見つかったら握りつぶさずに呼び出し側へ投げる。
 * 勝手に 〓 などへ置換すると「気付かないまま取引先へ送る」事故になるので置換はしない。
 */
export function assertGlyphsAvailable(fontBytes: Uint8Array, texts: string[]): void {
  const coverage = glyphCoverage(fontBytes);
  if (!coverage) return;
  const missing = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const ch of text) {
      if (ch === "\n" || ch === " ") continue;
      const code = ch.codePointAt(0);
      if (code === undefined) continue;
      if (!coverage.has(code)) missing.add(ch);
    }
  }
  if (missing.size === 0) return;
  const list = Array.from(missing)
    .map((ch) => `${ch}（U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}）`)
    .join("、");
  throw new Error(
    `PDFに使えない文字が含まれています：${list}。この文字は同梱フォント（Noto Sans JP）に収録されていないため、置き換えるか削除してください。`,
  );
}

/* ------------------------------------------------------------------ *
 * 描画エンジン
 * ------------------------------------------------------------------ */

export interface TextStyle {
  size: number;
  color?: Color;
  tracking?: number;
}

/**
 * ページ 1 枚ぶんの筆。target が null のときは何も描かず寸法だけ返す（下書き測定用）。
 * 「測ってから描く」を同じコードで通すことで、測定と描画のズレを構造的に無くしている。
 */
export class Sheet {
  readonly font: PDFFont;
  target: PDFPage | null = null;
  pageNo = 0;

  private readonly unitCache = new Map<string, number>();
  private readonly widthCache = new Map<string, number>();

  constructor(font: PDFFont) {
    this.font = font;
  }

  /* --- 実測 --- */

  private unitWidth(ch: string): number {
    let w = this.unitCache.get(ch);
    if (w === undefined) {
      w = this.font.widthOfTextAtSize(ch, 1000) / 1000;
      this.unitCache.set(ch, w);
    }
    return w;
  }

  /** 描画と同じ方法で幅を測る。tracking があれば 1 文字ずつ描くので 1 文字ずつ足す */
  measure(text: string, style: TextStyle): number {
    if (!text) return 0;
    const tracking = style.tracking ?? 0;
    if (tracking !== 0) {
      const chars = Array.from(text);
      let w = 0;
      for (const ch of chars) w += this.unitWidth(ch) * style.size;
      return w + tracking * Math.max(0, chars.length - 1);
    }
    const key = `${style.size}\u0000${text}`;
    let w = this.widthCache.get(key);
    if (w === undefined) {
      w = this.font.widthOfTextAtSize(text, style.size);
      this.widthCache.set(key, w);
    }
    return w;
  }

  /** 行の視覚上端からベースラインを出す */
  baselineFromTop(top: number, size: number): number {
    return top - size * ASC;
  }

  /** 帯の中央に置くときのベースライン */
  baselineFromCenter(center: number, size: number): number {
    return center - size * OPTICAL_CENTER;
  }

  /* --- 折り返し・詰め --- */

  private tokenize(text: string): string[] {
    const tokens: string[] = [];
    let word = "";
    for (const ch of text) {
      if (WORD_CHARS.indexOf(ch) >= 0) {
        word += ch;
        continue;
      }
      if (word && COUNTER_CHARS.indexOf(ch) >= 0 && COUNTER_HEAD.test(word)) {
        word += ch; // 「1丁目」「2026年」— 数字と助数詞を割らない
        continue;
      }
      if (word) {
        tokens.push(word);
        word = "";
      }
      tokens.push(ch);
    }
    if (word) tokens.push(word);
    return tokens;
  }

  private hardSplit(token: string, style: TextStyle, maxWidth: number): string[] {
    const parts: string[] = [];
    let buf = "";
    for (const ch of token) {
      const next = buf + ch;
      if (buf && this.measure(next, style) > maxWidth) {
        parts.push(buf);
        buf = ch;
      } else {
        buf = next;
      }
    }
    if (buf) parts.push(buf);
    return parts.length > 0 ? parts : [""];
  }

  /** 実測幅で折り返す。行頭・行末の禁則も一段だけ見る */
  wrap(text: string, style: TextStyle, maxWidth: number): string[] {
    const lines: string[] = [];
    if (!text) return lines;

    for (const paragraph of text.split("\n")) {
      const tokens = this.tokenize(paragraph);
      let line = "";

      for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (!line && token === " ") continue;

        if (!line && this.measure(token, style) > maxWidth) {
          const parts = this.hardSplit(token, style, maxWidth);
          for (let k = 0; k < parts.length - 1; k += 1) lines.push(parts[k]);
          line = parts[parts.length - 1];
          continue;
        }

        const candidate = line + token;
        if (!line || this.measure(candidate, style) <= maxWidth) {
          line = candidate;
          continue;
        }

        // ここで改行する。禁則にかかるなら直前の 1 文字を次行へ追い出す
        let head = line;
        let carry = token;
        const chars = Array.from(head);
        const lastChar = chars[chars.length - 1] ?? "";
        const needsPush =
          (NO_LINE_START.indexOf(token) >= 0 || NO_LINE_END.indexOf(lastChar) >= 0) && chars.length >= 2;
        if (needsPush) {
          const moved = chars.pop() as string;
          const pushed = moved + token;
          if (this.measure(pushed, style) <= maxWidth) {
            head = chars.join("");
            carry = pushed;
          }
        }
        lines.push(head.replace(/ +$/, ""));
        line = carry === " " ? "" : carry;
      }

      const tail = line.replace(/ +$/, "");
      if (tail) lines.push(tail);
    }
    return lines;
  }

  /** 幅に収まらなければ末尾を … で省略する */
  fit(text: string, style: TextStyle, maxWidth: number): string {
    if (!text) return "";
    if (this.measure(text, style) <= maxWidth) return text;
    const chars = Array.from(text);
    while (chars.length > 0) {
      chars.pop();
      const candidate = `${chars.join("")}…`;
      if (this.measure(candidate, style) <= maxWidth) return candidate;
    }
    return "";
  }

  /** 折り返したうえで行数を制限し、あふれたら … で締める */
  wrapClamped(text: string, style: TextStyle, maxWidth: number, maxLines: number): string[] {
    const lines = this.wrap(text, style, maxWidth);
    if (lines.length <= maxLines) return lines;
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = this.fit(`${kept[maxLines - 1]}…`, style, maxWidth);
    return kept;
  }

  /* --- 描画 --- */

  private report(kind: "text" | "rect" | "line" | "image", x: number, y: number, width: number, height: number, text?: string): void {
    if (!auditSink) return;
    auditSink({ page: this.pageNo, kind, x, y, width, height, text });
  }

  /** 左端 x・ベースライン baseline に描く。戻り値は実測幅 */
  text(value: string, x: number, baseline: number, style: TextStyle): number {
    if (!value) return 0;
    const width = this.measure(value, style);
    const color = style.color ?? INK;
    const tracking = style.tracking ?? 0;
    const page = this.target;
    if (page) {
      if (tracking === 0) {
        page.drawText(value, { x, y: baseline, size: style.size, font: this.font, color });
      } else {
        let cx = x;
        for (const ch of value) {
          page.drawText(ch, { x: cx, y: baseline, size: style.size, font: this.font, color });
          cx += this.unitWidth(ch) * style.size + tracking;
        }
      }
    }
    this.report("text", x, baseline - style.size * INK_DESC, width, style.size * (INK_ASC + INK_DESC), value);
    return width;
  }

  /** 右端をそろえて描く */
  textRight(value: string, right: number, baseline: number, style: TextStyle): number {
    const width = this.measure(value, style);
    this.text(value, right - width, baseline, style);
    return width;
  }

  /** 中央ぞろえで描く */
  textCenter(value: string, center: number, baseline: number, style: TextStyle): number {
    const width = this.measure(value, style);
    this.text(value, center - width / 2, baseline, style);
    return width;
  }

  /**
   * 数値を右ぞろえで描く。桁が増えて枠に収まらないときは字を詰めずに級数を落とす
   * （数字は省略できないので縮める）。
   */
  numberRight(value: string, right: number, baseline: number, style: TextStyle, maxWidth: number): void {
    if (!value) return;
    let size = style.size;
    while (size > 6 && this.measure(value, { ...style, size }) > maxWidth) {
      size -= 0.25;
    }
    const shown = this.fit(value, { ...style, size }, maxWidth);
    this.textRight(shown, right, baseline, { ...style, size });
  }

  rect(x: number, y: number, width: number, height: number, color: Color): void {
    if (this.target) this.target.drawRectangle({ x, y, width, height, color });
    this.report("rect", x, y, width, height);
  }

  /** 水平の罫線 */
  rule(x1: number, x2: number, y: number, thickness: number, color: Color): void {
    if (this.target) {
      this.target.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
    }
    this.report("line", Math.min(x1, x2), y - thickness / 2, Math.abs(x2 - x1), thickness);
  }

  /**
   * 任意の2点を結ぶ線。折れ線グラフのように斜めへ引きたいときに使う。
   * 水平の罫は rule()、垂直の細線は rect() のほうが意図が伝わる。
   *
   * dash は破線の刻み（例 [3, 2]）。省略すれば実線。
   */
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: Color,
    dash?: number[],
  ): void {
    if (this.target) {
      this.target.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness,
        color,
        ...(dash && dash.length > 0 ? { dashArray: dash } : {}),
      });
    }
    this.report("line", Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  /**
   * 円。折れ線の節点や凡例の丸に使う。x, y は中心・radius は半径。
   * 監査には外接する矩形として "rect" で記録する（円専用の種別は設けていない）。
   */
  dot(x: number, y: number, radius: number, color: Color): void {
    if (this.target) this.target.drawCircle({ x, y, size: radius, color });
    this.report("rect", x - radius, y - radius, radius * 2, radius * 2);
  }

  image(img: PDFImage, x: number, y: number, width: number, height: number): void {
    if (this.target) this.target.drawImage(img, { x, y, width, height });
    this.report("image", x, y, width, height);
  }
}

/* ------------------------------------------------------------------ *
 * 画像（角印・ロゴ）
 * ------------------------------------------------------------------ */

export async function embedDataUrl(pdf: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  const src = (dataUrl || "").trim();
  const m = /^data:image\/(png|jpe?g)\s*;base64,/i.exec(src);
  if (!m) return null;
  try {
    return m[1].toLowerCase() === "png" ? await pdf.embedPng(src) : await pdf.embedJpg(src);
  } catch {
    // 壊れた角印ひとつで請求書全部が出せなくなる方が困るので、この 1 点だけは黙って諦める
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * ページ割り
 * ------------------------------------------------------------------ */

export interface PagePlan {
  rowIndexes: number[];
}

/**
 * 明細をページへ分ける。
 * reserveTailOn で指定したページには、合計ブロック一式ぶんの高さを空けておく。
 */
export interface PackPagesOptions {
  /** 各行の高さ。中身は問わない（height だけ見る） */
  rows: readonly { height: number }[];
  /** 1ページ目の表の上端 */
  firstTop: number;
  /** 2ページ目以降の表の上端 */
  contTop: number;
  /** 本文が下りてよい限界 */
  bodyBottom: number;
  /** 表見出しの高さ */
  headHeight: number;
  /** 表の下端から末尾ブロックまでの間隔 */
  tailGap: number;
  /** 末尾ブロック（合計など）の高さ */
  tailHeight: number;
  /** 末尾ブロックを置くページ（0始まり）。置かないなら -1 */
  reserveTailOn: number;
}

export function packPages(options: PackPagesOptions): PagePlan[] {
  const { rows, firstTop, contTop, bodyBottom, headHeight, tailGap, tailHeight, reserveTailOn } = options;
  const pages: PagePlan[] = [];
  let index = 0;

  for (;;) {
    const pageIdx = pages.length;
    const top = pageIdx === 0 ? firstTop : contTop;
    const limit = bodyBottom + (pageIdx === reserveTailOn ? tailGap + tailHeight : 0);
    let y = top - headHeight;
    const taken: number[] = [];

    while (index < rows.length && y - rows[index].height >= limit) {
      y -= rows[index].height;
      taken.push(index);
      index += 1;
    }

    // 1 行も置けない事故（無限ループ）を防ぐため、最低 1 行は必ず置く
    if (taken.length === 0 && index < rows.length) {
      y -= rows[index].height;
      taken.push(index);
      index += 1;
    }

    pages.push({ rowIndexes: taken });
    if (index >= rows.length) break;
    if (pages.length > rows.length + 2) break; // 保険
  }

  return pages;
}

/* ------------------------------------------------------------------ *
 * 入口。PDF を出すツールは必ずここから始める
 * ------------------------------------------------------------------ */

export interface CreateJpPdfOptions {
  /** 同梱の日本語書体。_shared/font.ts の loadJpFont() で得る */
  fontBytes: Uint8Array;
  /**
   * 利用者由来の文字列すべて。ここに渡した文字が
   * 書体に無ければ、描く前にまとめて例外で知らせる（豆腐ゼロのため）
   */
  texts: string[];
  title?: string;
  producer?: string;
  creator?: string;
}

export interface JpPdf {
  pdf: PDFDocument;
  font: PDFFont;
  /** ページ 1 枚ぶんの筆。target を差し替えて使い回す */
  sheet: Sheet;
}

/**
 * 日本語 PDF の土台を作る。
 *
 * この順序には意味がある：
 *   1. グリフ収録チェック（豆腐は最悪の事故なので描く前に洗い出す）
 *   2. registerFontkit(safeFontkit)（サブセット生成の当て木を差し込む）
 *   3. subsetSafe 判定（当て木が効かない fontkit なら全字面埋め込みへ倒す）
 *   4. embedFont
 * 飛ばすと日本語が半分消えるか、豆腐が出る。
 */
export async function createJpPdf(options: CreateJpPdfOptions): Promise<JpPdf> {
  const { fontBytes, texts, title, producer, creator } = options;

  assertGlyphsAvailable(fontBytes, texts);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(safeFontkit);
  const subset = fontFacts(fontBytes)?.subsetSafe ?? false;
  const font = await pdf.embedFont(fontBytes, { subset });

  if (title !== undefined) pdf.setTitle(title);
  if (producer !== undefined) pdf.setProducer(producer);
  if (creator !== undefined) pdf.setCreator(creator);

  return { pdf, font, sheet: new Sheet(font) };
}
