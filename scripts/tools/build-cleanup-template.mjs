/**
 * 名簿クレンジングツール（T-05） — 配布ファイルの生成
 *
 *   node scripts/tools/build-cleanup-template.mjs
 *
 * 出力：
 *   public/tools/cleanup/名簿テンプレート.xlsx   … きれいな空の形（見出しだけ＋記入ガイド）
 *   public/tools/cleanup/名簿テンプレート.csv    … 同上の CSV（UTF-8 BOM付き＝Excelで文字化けしない）
 *   public/tools/cleanup/名簿サンプル.xlsx       … 汚れ入りの架空サンプル（20行）
 *
 * ⚠ **テンプレート（＝きれいな空の形）とサンプル（＝汚れ入り）は別物なので、2つとも出す**（計画書 §12）。
 *
 * ⚠ npm の xlsx パッケージは使わない（既知の脆弱性のため）。zip 化は fflate のみ。
 *
 * ★ 見出しとサンプルの中身は `lib/tools/cleanup/sample.ts` から読み出す。ここでハードコードすると、
 *   画面に出るサンプルと配布ファイルが静かに食い違う。Node 24 は .ts をそのまま読めるので
 *   （共通仕様 §8-1）、型ストリップに任せて直接 import する。
 *   ⚠ sample.ts が `import type` 以外の import を持つと、この読み込みは壊れる（拡張子なし解決のため）。
 *     sample.ts 側は「parse.ts と _shared を import しない」契約なので、両立している。
 *
 * ★ xlsx の組み立ては `lib/tools/_shared/xlsxWriter.ts` をそのまま使う（**読むだけ・書き換えない**）。
 *   ブラウザの書き出しと同じコードを通すので、配布ファイルとツールの出力が構造的に一致する。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// package.json は共有ファイルなので触れない（"type":"module" を足せない）。
// .ts を読むたびに出る MODULE_TYPELESS_PACKAGE_JSON の警告だけを黙らせ、他の警告は素通しする。
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.code !== "MODULE_TYPELESS_PACKAGE_JSON") console.warn(w);
});

const { buildCsv, buildXlsx } = await import("../../lib/tools/_shared/xlsxWriter.ts");
const { sampleParseResult } = await import("../../lib/tools/cleanup/sample.ts");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const OUT_DIR = resolve(ROOT, "public/tools/cleanup");
const OUT_TEMPLATE_XLSX = resolve(OUT_DIR, "名簿テンプレート.xlsx");
const OUT_TEMPLATE_CSV = resolve(OUT_DIR, "名簿テンプレート.csv");
const OUT_SAMPLE_XLSX = resolve(OUT_DIR, "名簿サンプル.xlsx");

const LIST_SHEET = "名簿";
const GUIDE_SHEET = "記入ガイド";

const sample = sampleParseResult();
const HEADERS = sample.headers;

/** 列幅（文字数）。HEADERS と同じ並び */
const COL_WIDTHS = [6, 26, 14, 16, 18, 13, 42, 17, 26, 14, 24];

/* ---------------------------------------------------------------- *
 * 記入ガイド
 * ---------------------------------------------------------------- */

/** 見出し → [この列に入れるもの, 記入例] */
const COLUMN_GUIDE = {
  No: ["通し番号。無くても構いません。見出しから役割を推定できない列は「触らない」扱いになります。", "1"],
  会社名: ["会社名・団体名・屋号。㈱ や (株) のような表記ゆれはそのままで構いません。", "株式会社ミナトデザイン"],
  部署: ["部署名・課名。空欄でも構いません。", "営業部"],
  氏名: ["担当者名。姓と名の間の空白は、全角でも半角でも構いません。", "山田 太郎"],
  フリガナ: ["氏名の読み。ひらがなが混ざっていても構いません。", "ヤマダ タロウ"],
  郵便番号: ["郵便番号。ハイフンの有無・〒の有無は問いません。", "100-0001"],
  住所: ["所在地。丁目表記とハイフン表記の混在は、直さずにお知らせします。", "東京都千代田区架空町1-2-3"],
  電話番号: ["電話番号・FAX番号。括弧付きでも構いません。", "03-1234-5678"],
  メール: ["メールアドレス。", "yamada@example.com"],
  型番: ["型番・品番・管理番号・会員番号。この列は全角英数を半角へ寄せません（別の型番に化けるため）。", "SK-100A"],
  備考: ["自由記述。", "定期便あり"],
};

const GUIDE_NOTES = [
  "1行 ＝ 1件です。1行目の見出しはそのままにして、その下に名簿を貼り付けてください。",
  "読み取るのは先頭のシートだけです。このシート（記入ガイド）は読み取りません。",
  "列は増やしても減らしても構いません。見出しの名前から列の役割を推定し、画面でいつでも変更できます。",
  "役割を推定できなかった列は「触らない」扱いになります。分からない列を勝手に直すことはしません。",
  "結合セルのある表は読み取れません（左上以外が空として読まれます）。結合を解除してからお試しください。",
  "5,000行・40列までです。超えるときはファイルを分けてください。",
  "値の汚れ（全角と半角の混在・半角カナ・法人格の表記ゆれ・余分な空白）は、そのままで構いません。それを整えるのがこのツールです。",
  "重複している可能性のある行は候補として並べるだけで、行を自動では削除しません。",
  "整えた名簿は、Excel が郵便番号や電話番号の先頭の 0 を落とさないよう、すべて文字列として書き出します。",
  "読み込んだ名簿はこの端末の中だけで処理され、どこにも送信されません。",
];

function buildGuideRows() {
  const rows = [];
  for (const name of HEADERS) {
    const guide = COLUMN_GUIDE[name] ?? ["", ""];
    rows.push([name, guide[0], guide[1]]);
  }
  rows.push([]);
  rows.push(["注意事項", "", ""]);
  for (const note of GUIDE_NOTES) rows.push(["", note, ""]);
  return rows;
}

/* ---------------------------------------------------------------- *
 * サンプル（汚れ入り）
 * ---------------------------------------------------------------- */

/**
 * ⚠ `numericCells` に入っているセルだけ **数値として** 書く。
 *   これで「元の Excel で数値保存されていた郵便番号」を実ファイルでも再現でき、
 *   読み取り側の numericStoredCode（先頭の 0 が失われている）の実演になる。
 *   それ以外はすべて文字列のまま書く（数値化するとツールの価値が消える）。
 */
function buildSampleRows() {
  return sample.rows.map((row, r) =>
    row.cells.map((value, c) => {
      if (!sample.numericCells.has(`${r},${c}`)) return value;
      const n = Number(value);
      return Number.isFinite(n) && value.trim() !== "" ? n : value;
    }),
  );
}

/* ---------------------------------------------------------------- *
 * 書き出し
 * ---------------------------------------------------------------- */

const guideRows = buildGuideRows();
const sampleRows = buildSampleRows();

const templateXlsx = buildXlsx([
  { name: LIST_SHEET, header: HEADERS, rows: [], colWidths: COL_WIDTHS },
  { name: GUIDE_SHEET, header: ["列の名前", "この列に入れるもの", "記入例"], rows: guideRows, colWidths: [14, 62, 30] },
]);

const templateCsv = buildCsv([HEADERS]);

const sampleXlsx = buildXlsx([
  { name: LIST_SHEET, header: HEADERS, rows: sampleRows, colWidths: COL_WIDTHS },
]);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_TEMPLATE_XLSX, templateXlsx);
writeFileSync(OUT_TEMPLATE_CSV, Buffer.from(templateCsv, "utf8"));
writeFileSync(OUT_SAMPLE_XLSX, sampleXlsx);

const numericCount = sample.numericCells.size;
console.log(`列数            : ${HEADERS.length}（${HEADERS.join(" / ")}）`);
console.log(`テンプレート    : 見出しのみ ＋ 記入ガイド ${guideRows.length} 行`);
console.log(`サンプル        : ${sampleRows.length} 行（うち数値保存セル ${numericCount} 件）`);
console.log(`template.xlsx   : ${OUT_TEMPLATE_XLSX} (${templateXlsx.length} bytes)`);
console.log(`template.csv    : ${OUT_TEMPLATE_CSV} (${Buffer.byteLength(templateCsv, "utf8")} bytes)`);
console.log(`sample.xlsx     : ${OUT_SAMPLE_XLSX} (${sampleXlsx.length} bytes)`);
