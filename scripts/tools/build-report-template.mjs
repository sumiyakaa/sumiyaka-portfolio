/**
 * 月次レポートPDF — 売上表テンプレート（.xlsx / .csv）の生成
 *
 *   npx --yes tsx scripts/tools/build-report-template.mjs
 *   （`_shared/xlsxWriter.ts` を読むので tsx 経由で動かす。素の node では動かない）
 *
 * 出力：
 *   public/tools/report/monthly-sales-template.xlsx
 *   public/tools/report/monthly-sales-template.csv   （UTF-8 BOM付き＝Excelで文字化けしない）
 *
 * ⚠ npm の xlsx パッケージは使わない（既知の脆弱性のため）。zip 化は fflate のみ。
 * ⚠ 見出しは lib/tools/report/types.ts の SALES_COLUMNS から取る。
 *    ハードコードしないので、型の定義とテンプレートが食い違うことがない。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildCsv, buildXlsx } from "../../lib/tools/_shared/xlsxWriter";
import { SALES_COLUMNS } from "../../lib/tools/report/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const OUT_DIR = resolve(ROOT, "public/tools/report");
const OUT_XLSX = resolve(OUT_DIR, "monthly-sales-template.xlsx");
const OUT_CSV = resolve(OUT_DIR, "monthly-sales-template.csv");

/** 記入例。値は SALES_COLUMNS と同じ並び（日付・金額・件数・商品-サービス・取引先） */
const EXAMPLES = [
  ["2026-04-10", 480000, 3, "定期保守", "株式会社あさひ商会"],
  ["2026-04-18", 260000, 1, "受託開発", "峰岸製作所"],
  ["2026-04-28", 120000, 2, "ライセンス", "南部フーズ"],
  ["2026-05-12", 510000, 3, "定期保守", "株式会社あさひ商会"],
  ["2026-05-20", 340000, 1, "受託開発", "ライトウェル合同会社"],
  ["2026-05-29", 96000, 4, "物販", "カネマツ電機"],
];

/** 列ごとの説明（記入ガイドのシート） */
const COLUMN_GUIDE = [
  [
    "日付",
    "必須。2026/05/31・2026-05-31・2026年5月31日 のいずれでも読み取ります。Excelの日付書式のセルもそのまま使えます。月ごとに集計済みの表なら「2026/05」のように月までの表記でも構いません（月へ畳んで集計します）。",
  ],
  [
    "金額",
    "必須。数値で入力します。カンマや円記号が混じっていても読み取ります。税込・税抜はどちらでも構いません（レポートは合計しか出しません）。返品・値引きはマイナスのまま入れてください。",
  ],
  [
    "件数",
    "任意。その行が何件ぶんかを入れます。空欄なら「1行＝1件」として数えます。月ごとに集計済みの表なら、その月の件数を入れてください。平均単価は 金額 ÷ 件数 で出します。",
  ],
  [
    "商品・サービス",
    "任意。区分別ランキングの軸になります。空欄の行は「（未分類）」にまとめます。",
  ],
  ["取引先", "任意。こちらも区分別ランキングの軸に選べます。空欄の行は「（未分類）」にまとめます。"],
];

const GUIDE_NOTES = [
  "1行 ＝ 明細1行です。日々の明細でも、月ごとに集計済みの表でも、同じ形で読み込めます。",
  "読み取ったあとは必ず「年月」へ畳んで集計します。ですから、1か月に何行あっても構いません。",
  "前年同月比を出すには、対象月とその12か月前が要ります（＝13か月ぶん）。足りないときは前年同月比を出さず「—」と書きます。0% では埋めません。",
  "データが1行も無い月は、売上0円の月とは区別します。棒グラフに0円の棒は描かず、「集計から除いた月」として本文に明記します。",
  "読み取れなかった行は、0円として通さずに落とします。落とした行数は画面に出ます。",
  "スキャンした画像やPDFの売上表は読み取れません。この Excel か CSV の形で入力してください。",
  "読み取るのは「明細」シートだけです。このシート（記入ガイド）は読み取りません。",
  "明細は 20,000 行までです。それを超えるときは期間で分けてください。",
  "行や列を増やしても構いませんが、1行目の見出しの文字は変えないでください（見出しの名前で列を探しています）。",
  "読み込んだファイルはブラウザの中だけで処理され、どこにも送信されません。",
];

const sheetRows = EXAMPLES.map((row) => [
  { kind: "date", iso: row[0] },
  row[1],
  row[2],
  row[3],
  row[4],
]);

const xlsx = buildXlsx([
  {
    name: "明細",
    header: [...SALES_COLUMNS],
    rows: sheetRows,
    colWidths: [13, 12, 8, 20, 24],
  },
  {
    name: "記入ガイド",
    header: ["項目", "説明"],
    rows: [
      ...COLUMN_GUIDE,
      ["", ""],
      ["読み取りの決まり", ""],
      ...GUIDE_NOTES.map((note, i) => [`${i + 1}`, note]),
    ],
    colWidths: [18, 96],
  },
]);

const csv = buildCsv([[...SALES_COLUMNS], ...EXAMPLES.map((row) => [...row])]);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_XLSX, xlsx);
writeFileSync(OUT_CSV, csv, "utf8");

console.log(`書き出しました：`);
console.log(`  ${OUT_XLSX}  (${xlsx.length.toLocaleString("ja-JP")} bytes)`);
console.log(`  ${OUT_CSV}  (${Buffer.byteLength(csv, "utf8").toLocaleString("ja-JP")} bytes)`);
