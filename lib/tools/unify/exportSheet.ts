/**
 * 列マッピング統合ツール（T-04） — 統合結果の書き出し
 *
 * ★ここは **動的層**。書き出しボタンを押したときだけ
 *   `await import("@/lib/tools/unify/exportSheet")` で読み込む。
 *   `_shared/xlsxWriter` が fflate を引くので、静的層から import してはいけない。
 *
 * ⚠ npm の `xlsx` は使わない（共通仕様 §3-5）。zip 化だけ fflate、OPC は `_shared/xlsxWriter` が組む。
 *
 * ⚠ 値は `UnifiedCell` をそのまま書く。ここで `formatYen` / `formatDateJa` を掛けない（§8-2）。
 *    CSV に `¥1,234` や `2026年8月22日` が入ると、受け取った Excel 側で再変換の手間が生まれる。
 */

import { safeFileName } from "../_shared/format";
import { buildCsv, buildXlsx } from "../_shared/xlsxWriter";
import type { XlsxCell } from "../_shared/xlsxWriter";
import type { UnifyResult } from "./types";

/** 出力する xlsx のシート名（1枚だけ） */
export const UNIFIED_SHEET_NAME = "統合結果";

/** 列幅の見積もりに使う先頭行数 */
const WIDTH_SCAN_ROWS = 50;
const WIDTH_MIN = 6;
const WIDTH_MAX = 40;
const WIDTH_RATIO = 1.2;

/**
 * 1セルを xlsx の値へ。
 * 日付として読めた値は**本物の日付セル**で書く（受け取った側がそのまま並べ替え・計算できる）。
 */
function toXlsxCell(cell: { text: string; num: number | null; iso: string | null }): XlsxCell {
  if (cell.iso !== null) return { kind: "date", iso: cell.iso };
  if (cell.num !== null) return cell.num;
  return cell.text;
}

/**
 * 全角として数える文字（CJK・かな・全角英数・全角記号）。
 *
 * ⚠ Excel の列幅の単位は「標準書体の 0 の幅」で、**全角文字はおよそ2つぶん**を占める。
 *   計画書 §9-2 の式は `文字数 × 1.2` だが、文字数のまま数えると
 *   「株式会社ミナトデザイン」（11文字）が幅13.2になり、日本語の列が軒並み切れる。
 *   共通仕様 §7 の落とし穴7「列幅の見積もり不足。実データで幅を決める」に従い、
 *   **全角を2つぶんとして数えたうえで ×1.2 する。**式の形（下限6・上限40）は変えていない。
 */
const WIDE_CHARS =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/;

function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += WIDE_CHARS.test(ch) ? 2 : 1;
  return width;
}

/** 見出しと先頭50行の実データ長から列幅を決める（§9-2） */
function columnWidths(result: UnifyResult): number[] {
  const scan = Math.min(result.rows.length, WIDTH_SCAN_ROWS);
  return result.columns.map((column, c) => {
    let max = displayWidth(column.name);
    for (let r = 0; r < scan; r++) {
      const width = displayWidth(result.rows[r].cells[c]?.text ?? "");
      if (width > max) max = width;
    }
    const width = Math.min(Math.max(WIDTH_MIN, max * WIDTH_RATIO), WIDTH_MAX);
    return Math.round(width * 10) / 10;
  });
}

/** 統合結果を xlsx（1シート・見出し行あり・先頭行固定）で書き出す */
export function buildUnifiedXlsx(result: UnifyResult): Uint8Array {
  return buildXlsx([
    {
      name: UNIFIED_SHEET_NAME,
      header: result.columns.map((column) => column.name),
      rows: result.rows.map((row) => row.cells.map(toXlsxCell)),
      colWidths: columnWidths(result),
    },
  ]);
}

/** 統合結果を CSV（UTF-8 BOM 付き・CRLF）で書き出す。値は text をそのまま書く（§9-3） */
export function buildUnifiedCsv(result: UnifyResult): string {
  const rows: string[][] = [result.columns.map((column) => column.name)];
  for (const row of result.rows) rows.push(row.cells.map((cell) => cell.text));
  return buildCsv(rows);
}

/** 例：`統合_売上明細_20260822.xlsx`（§9-4） */
export function unifiedFileName(schemaName: string, ext: "xlsx" | "csv", now: Date): string {
  const base = safeFileName(schemaName) || "出力";
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `統合_${base}_${y}${m}${d}.${ext}`;
}
