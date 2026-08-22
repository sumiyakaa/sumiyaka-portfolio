/**
 * 月次レポートPDF — 月キーの小道具と、表示の書式（紙・画面・要約文で共用）
 *
 * ⚠ 金額と数値の整形は `_shared/format` を使う。ここに置くのは、
 *    共通側に無い「符号つきの率」「出せないときの — 」など**このツール固有の書式**だけ。
 *    紙・画面・要約文がそれぞれ別の書き方をすると数字が食い違って見えるので、必ずここを通す。
 *
 * このモジュールは他のどのモジュールにも依存しない（`_shared/format` と型のみ）。
 * 集計・要約・組版のすべてがここを参照するので、依存を一方通行に保っている。
 */

import { formatYen } from "../_shared/format";
import type { Comparison, YearMonth } from "./types";

/**
 * 出せない値の表記。0% や N/A とは書かない。
 * ⚠ U+2014 EM DASH。書体に収録があることは検証スクリプトで確かめている。
 */
export const DASH = "—";

/** "2026-05" → { year: 2026, month: 5 }。形式が違えば null */
export function parseMonthKey(key: string): YearMonth | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** { year: 2026, month: 5 } → "2026-05" */
export function monthKeyOfYm(ym: YearMonth): string {
  return `${ym.year}-${ym.month < 10 ? "0" + ym.month : ym.month}`;
}

/** 月を前後へずらす（delta が負なら過去へ）。年またぎを含めて正しく回す */
export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const total = ym.year * 12 + (ym.month - 1) + delta;
  const year = Math.floor(total / 12);
  return { year, month: total - year * 12 + 1 };
}

/** 2つの年月の隔たり（か月）。b が後ろなら正 */
export function monthDiff(a: YearMonth, b: YearMonth): number {
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/**
 * 1 行に収めたい項目の掃除。制御文字を落とし、改行と連続空白を潰す。
 * ⚠ 紙とプレビューの両方で通す。片方だけ通すと、見た目が食い違う。
 */
export function cleanLine(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).normalize("NFC").replace(/\r\n?/g, "\n");
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0x09 || code === 0x0a) {
      out += " ";
      continue;
    }
    if (code < 0x20 || code === 0x7f) continue;
    out += ch;
  }
  return out.replace(/ {2,}/g, " ").trim();
}

/** "2026-05" → "2026年5月" */
export function formatMonthJa(key: string): string {
  const ym = parseMonthKey(key);
  return ym ? `${ym.year}年${ym.month}月` : key;
}

/** "2026-05" → "2026年5月度" */
export function formatPeriodJa(key: string): string {
  return `${formatMonthJa(key)}度`;
}

/** 符号つきの金額。+¥530,000 / -¥120,000 / ¥0 */
export function formatSignedYen(value: number): string {
  const n = Math.round(value);
  if (n === 0) return formatYen(0);
  return n > 0 ? `+${formatYen(n)}` : formatYen(n);
}

/**
 * 符号つきの率。小数第1位まで。
 * 丸めて 0.0% になるものに符号を付けない（+0.0% は増えたように読めてしまう）。
 * ⚠ 負号は U+002D のハイフンマイナス（数字と字幅を揃えるため）。
 */
export function formatSignedRate(rate: number): string {
  const p = rate * 100;
  const abs = Math.round(Math.abs(p) * 10) / 10;
  if (abs === 0) return "0.0%";
  return `${p > 0 ? "+" : "-"}${abs.toFixed(1)}%`;
}

/** 構成比。33.3% ／ 出せないなら — */
export function formatShare(share: number | null): string {
  if (share === null || !Number.isFinite(share)) return DASH;
  return `${(share * 100).toFixed(1)}%`;
}

/** 比較の率。出せないなら — */
export function formatComparisonRate(c: Comparison): string {
  return c.rate === null ? DASH : formatSignedRate(c.rate);
}

/** 比較の増減額。出せないなら — */
export function formatComparisonDelta(c: Comparison): string {
  return c.delta === null ? DASH : formatSignedYen(c.delta);
}

/** 比較が出せなかった理由の短い説明（KPI の補足に出す） */
export function unavailableNote(c: Comparison, label: string): string {
  if (c.unavailable === "zero-base") return `${label}が¥0のため率は出せません`;
  if (c.unavailable === "negative-base") return `${label}が負のため率は出せません`;
  return `${label}のデータがありません`;
}
