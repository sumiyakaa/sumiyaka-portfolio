/**
 * 列マッピング統合ツール（T-04） — 配布サンプルの生成
 *
 *   npx --yes tsx scripts/tools/build-unify-samples.mts
 *
 * 出力（public/tools/unify/）
 *   sample-a-jyuchu.csv        A社_受注データ    7列6行（UTF-8 BOM付き・CRLF）
 *   sample-b-uriage.xlsx       B商事_売上一覧    7列5行（「売上日」は本物の日付セル）
 *   sample-c-meisai.csv        C_明細_2026年7月  7列5行＋最終行に小計行（同上）
 *   sample-schema-uriage.xlsx  管理表のひな形    見出し1行だけ
 *
 * ⚠ 取引先名・担当者名・部署名はすべて架空。実在の企業・団体・個人とは関係がない。
 *
 * ⚠ 3ファイルは「列の並びも見出し名も全部違う」ことに意味がある。
 *    列を揃えたり見出しを直したりすると、このツールが何をする道具なのかが
 *    サンプルから読み取れなくなる。値も含めて計画書 §11-1 の表と1文字たがえず一致させること。
 *
 * ⚠ npm の xlsx パッケージは使わない（公開版に既知の脆弱性が残るため）。
 *    xlsx の組み立ては `lib/tools/_shared/xlsxWriter.ts` に一本化してある。
 *    ここで OPC パッケージを自前で組み直すと、同じコードが2箇所に増えて片方だけ直す事故が起きる。
 *
 * ⚠ 冪等。何度流しても同じバイト列になる（zip の mtime は xlsxWriter 側で固定済み）。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildCsv, buildXlsx, type XlsxCell } from "../../lib/tools/_shared/xlsxWriter";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const OUT_DIR = resolve(ROOT, "public/tools/unify");

/* ---------------------------------------------------------------- *
 * A「A社_受注データ.csv」
 *   7列6行。日付はスラッシュ区切りの文字列。金額列を持つ。
 * ---------------------------------------------------------------- */

const A_HEADER: XlsxCell[] = ["受注日", "得意先名", "商品名", "数量", "単価", "金額", "担当"];

const A_ROWS: XlsxCell[][] = [
  ["2026/07/03", "株式会社ミナトデザイン", "A4封筒 印刷", 500, 12, 6000, "山田"],
  ["2026/07/08", "合同会社あおば工房", "名刺 印刷（両面）", 200, 18, 3600, "山田"],
  ["2026/07/12", "有限会社みどり不動産", "チラシ B5", 3000, 7, 21000, "佐藤"],
  ["2026/07/15", "株式会社ミナトデザイン", "封筒 長3", 1000, 9, 9000, "山田"],
  ["2026/07/22", "さくら歯科クリニック", "診察券 印刷", 500, 22, 11000, "佐藤"],
  ["2026/07/28", "立花写真事務所", "ポストカード", 300, 15, 4500, "山田"],
];

/* ---------------------------------------------------------------- *
 * B「B商事_売上一覧.xlsx」
 *   7列5行。並びが違い、金額列が無く、No があり、日付は Excel の日付セル。
 * ---------------------------------------------------------------- */

const B_SHEET_NAME = "売上一覧";

const B_HEADER: string[] = ["No", "取引先", "品名", "売上日", "個数", "税抜単価", "備考"];

const B_ROWS: XlsxCell[][] = [
  [1001, "株式会社ヒノデ物産", "段ボール 60サイズ", { kind: "date", iso: "2026-07-05" }, 120, 85, "定期便"],
  [1002, "株式会社ヒノデ物産", "緩衝材 ロール", { kind: "date", iso: "2026-07-05" }, 6, 1200, ""],
  [1003, "有限会社みどり不動産", "宅配袋 大", { kind: "date", iso: "2026-07-19" }, 300, 34, ""],
  [1004, "立花写真事務所", "台紙 A4", { kind: "date", iso: "2026-07-24" }, 50, 210, "特注色"],
  [1005, "合同会社あおば工房", "ラベルシール", { kind: "date", iso: "2026-07-30" }, 1000, 6, ""],
];

const B_COL_WIDTHS = [7, 24, 22, 12, 8, 10, 12];

/* ---------------------------------------------------------------- *
 * C「C_明細_2026年7月.csv」
 *   7列5行＋小計行1。部署が A・B に無く、日付が和文文字列。
 *   4行目の「7/21」は年が無い＝読めない日付。A の1行目と同じ内容の行が1件ある。
 * ---------------------------------------------------------------- */

const C_HEADER: XlsxCell[] = ["日付", "会社名", "内容", "数量", "単価", "部署", "合計"];

const C_ROWS: XlsxCell[][] = [
  ["2026年7月3日", "株式会社ミナトデザイン", "A4封筒 印刷", 500, 12, "営業一課", 6000],
  ["2026年7月10日", "株式会社ヒノデ物産", "クラフトテープ", 40, 130, "営業二課", 5200],
  ["2026年7月17日", "さくら歯科クリニック", "予約カード", 300, 19, "営業一課", 5700],
  ["7/21", "合同会社あおば工房", "ステッカー", 200, 45, "営業二課", 9000],
  ["2026年7月26日", "株式会社ミナトデザイン", "領収書 綴り", 30, 240, "営業一課", 7200],
  ["合計", "", "", "", "", "", 33100],
];

/* ---------------------------------------------------------------- *
 * D「sample-schema-uriage.xlsx」＝ 管理表のひな形（見出し1行だけ）
 *   §5-4 の方式A（ひな形ファイルを読ませて出力の形にする）を1クリックで試すためのもの。
 * ---------------------------------------------------------------- */

const SCHEMA_SHEET_NAME = "売上明細";

const SCHEMA_HEADER: string[] = [
  "取引日",
  "取引先名",
  "品目",
  "数量",
  "単価",
  "金額",
  "担当者",
  "備考",
];

const SCHEMA_COL_WIDTHS = [12, 24, 22, 8, 10, 12, 12, 16];

/* ---------------------------------------------------------------- *
 * 書き出し
 * ---------------------------------------------------------------- */

interface Written {
  file: string;
  bytes: number;
  note: string;
}

const written: Written[] = [];

function writeCsv(fileName: string, rows: XlsxCell[][], note: string): void {
  const text = buildCsv(rows); // 既定＝UTF-8 BOM付き・CRLF
  const buf = Buffer.from(text, "utf8");
  writeFileSync(resolve(OUT_DIR, fileName), buf);
  written.push({ file: fileName, bytes: buf.length, note });
}

function writeXlsx(
  fileName: string,
  sheetName: string,
  header: string[],
  rows: XlsxCell[][],
  colWidths: number[],
  note: string,
): void {
  const bytes = buildXlsx([{ name: sheetName, header, rows, colWidths }]);
  writeFileSync(resolve(OUT_DIR, fileName), bytes);
  written.push({ file: fileName, bytes: bytes.length, note });
}

mkdirSync(OUT_DIR, { recursive: true });

writeCsv("sample-a-jyuchu.csv", [A_HEADER, ...A_ROWS], `見出し1行＋${A_ROWS.length}行 / ${A_HEADER.length}列`);

writeXlsx(
  "sample-b-uriage.xlsx",
  B_SHEET_NAME,
  B_HEADER,
  B_ROWS,
  B_COL_WIDTHS,
  `シート「${B_SHEET_NAME}」 見出し1行＋${B_ROWS.length}行 / ${B_HEADER.length}列（売上日＝日付セル）`,
);

writeCsv(
  "sample-c-meisai.csv",
  [C_HEADER, ...C_ROWS],
  `見出し1行＋${C_ROWS.length}行（うち最終行が小計行） / ${C_HEADER.length}列`,
);

writeXlsx(
  "sample-schema-uriage.xlsx",
  SCHEMA_SHEET_NAME,
  SCHEMA_HEADER,
  [],
  SCHEMA_COL_WIDTHS,
  `シート「${SCHEMA_SHEET_NAME}」 見出し1行だけ / ${SCHEMA_HEADER.length}列`,
);

console.log(`出力先: ${OUT_DIR}`);
for (const w of written) {
  console.log(`  ${w.file.padEnd(26)} ${String(w.bytes).padStart(6)} bytes  ${w.note}`);
}
