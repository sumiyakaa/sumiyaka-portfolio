/**
 * 入金消込 突合ツール — 突合結果CSVの書き出し
 *
 * 1つのボタン、1つのファイル。PDF は出さない（帳票の版面設計は T-01 と T-06 だけ）。
 *
 * ⚠ UTF-8 BOM 付き・CRLF・RFC4180。BOM が無いと日本語Windowsの Excel が
 *    Shift_JIS と解釈して文字化けする。書式の実装は `_shared/xlsxWriter` の buildCsv に任せる
 *    （同じ規則をツールごとに書き直さない）。
 *
 * ⚠ 金額は数値だけを書く（カンマや ¥ を入れない）。Excel でそのまま再計算できるように。
 * ⚠ 差額はグループの全行に同じ値を入れる。先頭行だけにすると、空欄が「0」に見えて危ない。
 */

import { buildCsv } from "../_shared/xlsxWriter";
import type { XlsxCell } from "../_shared/xlsxWriter";
import { REASON_LABELS, RESULT_COLUMNS, STATUS_LABELS, formatIsoSlash } from "./types";
import type { MatchResult } from "./types";

export interface ResultCsvOptions {
  /** 要確認と未入金だけを書き出す（既定＝オフ＝全部書く） */
  onlyIssues?: boolean;
}

/**
 * 突合結果 → CSV の文字列。
 *
 * 行の粒度＝1グループの中で max(請求件数, 入金件数) 行。
 * k 行目に k 番目の請求と k 番目の入金を並べる（足りない側は空欄）。
 */
export function buildResultCsv(result: MatchResult, options: ResultCsvOptions = {}): string {
  const rows: XlsxCell[][] = [[...RESULT_COLUMNS]];

  for (const row of result.rows) {
    if (options.onlyIssues && row.status === "matched") continue;

    const lines = Math.max(row.invoices.length, row.payments.length, 1);
    for (let k = 0; k < lines; k++) {
      const inv = row.invoices[k];
      const pay = row.payments[k];
      // 備考＝判定の理由（1文）＋ 台帳の備考。全角スペースでつなぐ
      const note = [k === 0 ? row.note : "", inv?.note ?? ""].filter((v) => v !== "").join("　");

      rows.push([
        row.group,
        STATUS_LABELS[row.status],
        REASON_LABELS[row.reason],
        inv?.invoiceNo ?? "",
        inv ? formatIsoSlash(inv.issueDate) : "",
        inv ? formatIsoSlash(inv.dueDate) : "",
        inv?.clientName ?? "",
        inv ? inv.amount : "",
        pay ? formatIsoSlash(pay.date) : "",
        pay?.description ?? "",
        pay ? pay.amount : "",
        row.diff,
        note,
      ]);
    }
  }

  return buildCsv(rows);
}

/** 書き出すファイル名。呼び出し側で safeFileName を通すこと */
export function resultCsvFileName(today: string): string {
  return `入金消込結果_${today}.csv`;
}
