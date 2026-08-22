/**
 * 電帳法ファイル名 一括リネーム — 索引簿CSV／リネーム対応表CSV の書き出し
 *
 * ⚠ 索引簿の先頭5列（連番・日付・金額・取引先・備考）は、国税庁が配布している
 *    索引簿サンプル（0021006-031_c.xlsx）の列見出しと同じ並びにしてある。
 *    根拠＝「電子帳簿保存法一問一答【電子取引関係】」問19【解説】の索引簿の作成例。
 *
 * ⚠ CSV の書き方（計画書 §8-4）
 *    ・先頭に UTF-8 BOM        … Excel が Shift_JIS と誤認しないため
 *    ・改行は CRLF
 *    ・全フィールドを " で囲む
 *    ・フィールド内の " は "" へエスケープ
 *
 * ⚠ 取引先が「=」で始まる場合でも**原文は変えない**（先頭に ' を足したりしない）。
 *    代わりに calc.ts の buildPlan() が warn の指摘を出す。
 *
 * ⚠ この層も UI から静的 import される。重い依存を持ち込まない
 *    （`_shared/xlsxWriter` の buildCsv は fflate を静的に引き込むので使わない）。
 */

import { isNamedStatus } from "./calc";
import type { RenamePair, RenamePlan, RenameStatus } from "./types";

/** 改行は CRLF。source に生の制御文字を置かないため fromCharCode で作る */
const CRLF = String.fromCharCode(13, 10);

/** UTF-8 BOM（EF BB BF）。Excel が Shift_JIS と誤認しないための1文字 */
const BOM = String.fromCharCode(0xfeff);

const INDEX_HEADER = ["連番", "日付", "金額", "取引先", "備考", "書類の種類", "ファイル名"] as const;

const MAP_HEADER = [
  "元のファイル名",
  "新しいファイル名",
  "状態",
  "取引年月日",
  "取引先",
  "取引金額",
  "書類の種類",
  "台帳の行",
  "備考",
] as const;

const STATUS_LABEL: Record<RenameStatus, string> = {
  ok: "そのまま",
  renumbered: "枝番あり",
  truncated: "切り詰めあり",
  unmatched: "未処理",
  missing: "ファイルなし",
  rejected: "対象外",
};

/** 全フィールドを " で囲み、フィールド内の " は "" にする */
function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(rows: readonly (readonly string[])[]): Uint8Array {
  const body = rows.map((cells) => cells.map(quote).join(",")).join(CRLF);
  return new TextEncoder().encode(`${BOM}${body}${CRLF}`);
}

/** YYYY-MM-DD → YYYY/MM/DD（Excel が日付として読む形）。読めない値は空欄 */
function csvDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.replace(/-/g, "/") : "";
}

/**
 * 索引簿CSV。
 * 載せるのは ok / renumbered / truncated の行だけ（実体があり、取引情報が確定している行）。
 * unmatched（取引情報が不明）と missing（実体が無い）は載せない。
 * 連番は台帳の行順に 1 から振り直す。
 */
export function buildIndexCsv(plan: RenamePlan): Uint8Array {
  const rows: string[][] = [INDEX_HEADER.slice()];
  let serial = 0;

  for (const pair of plan.pairs) {
    if (!isNamedStatus(pair.status)) continue;
    const row = pair.row;
    if (!row) continue;
    serial++;
    rows.push([
      String(serial),
      csvDate(row.date),
      String(row.amount),
      row.vendor,
      row.note,
      row.docType,
      pair.to,
    ]);
  }

  return toCsv(rows);
}

/** 対応表の1行ぶん（画面の主役をそのままファイルにしたもの。全行載せる） */
function mapRow(pair: RenamePair): string[] {
  const row = pair.row;
  return [
    pair.from,
    pair.to,
    STATUS_LABEL[pair.status],
    row ? csvDate(row.date) : "",
    row ? row.vendor : "",
    row ? String(row.amount) : "",
    row ? row.docType : "",
    row ? String(row.sourceLine) : "",
    pair.note,
  ];
}

/** リネーム対応表CSV。**全行**載せる（unmatched も missing も rejected も隠さない） */
export function buildMapCsv(plan: RenamePlan): Uint8Array {
  const rows: string[][] = [MAP_HEADER.slice()];
  for (const pair of plan.pairs) rows.push(mapRow(pair));
  return toCsv(rows);
}
