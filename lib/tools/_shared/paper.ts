/**
 * /tools 共通 — 紙のサイズ（pt）
 *
 * ⚠ **pdf-lib に依存しないモジュールとして独立させてある。**
 *    画面プレビュー（クライアントコンポーネント）が A4 の寸法を参照するとき、
 *    pdfKit から取ると pdf-lib が初期バンドルへ引きずり込まれる。
 *    「重い依存はすべて動的 import」の原則が静かに壊れるので、寸法はここから取ること。
 *
 * 画面側は 1pt = var(--pt) として CSS で紙幅に追従させる（T-01 の InvoicePaper が実例）。
 * PDF 側の数値をそのまま持ち込めるので、画面と紙が食い違わない。
 */

/** A4 縦（pt）。座標はここから導き、ベタ書きしない */
export const A4_W = 595.28;
export const A4_H = 841.89;

/**
 * A4 横で組むときは幅と高さを入れ替えるだけでよい。
 * `pdf.addPage([A4_LANDSCAPE_W, A4_LANDSCAPE_H])` のように使う。
 */
export const A4_LANDSCAPE_W = A4_H;
export const A4_LANDSCAPE_H = A4_W;

/** ミリ → pt（1pt = 1/72インチ） */
export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

/** pt → ミリ。版面を紙の実寸で確かめたいときに使う */
export function ptToMm(pt: number): number {
  return (pt * 25.4) / 72;
}
