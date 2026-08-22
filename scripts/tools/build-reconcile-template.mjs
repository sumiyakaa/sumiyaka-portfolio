/**
 * 入金消込 突合ツール — 配布テンプレートの生成
 *
 *   node scripts/tools/build-reconcile-template.mjs
 *
 * 出力：
 *   public/tools/reconcile/reconcile-ledger-template.xlsx     請求台帳（明細＋記入ガイド）
 *   public/tools/reconcile/reconcile-ledger-template.csv      同上のCSV（UTF-8 BOM付き）
 *   public/tools/reconcile/reconcile-statement-template.csv   入出金明細の最小形（UTF-8 BOM付き）
 *
 * ⚠ npm の xlsx パッケージは使わない（既知の脆弱性のため）。zip 化は fflate のみ。
 * ⚠ 見出しは lib/tools/reconcile/types.ts の LEDGER_COLUMNS から読み出す。
 *    ハードコードしないので、型の定義とテンプレートが食い違うことがない。
 * ⚠ 明細テンプレートの3列も、types.ts の STATEMENT_ALIASES に載っていることを毎回確かめる。
 *    別名表から語を消したときに、配ったテンプレートだけ読めなくなるのを防ぐ。
 */

import { zipSync, strToU8 } from "fflate";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const TYPES_TS = resolve(ROOT, "lib/tools/reconcile/types.ts");
const OUT_DIR = resolve(ROOT, "public/tools/reconcile");
const OUT_XLSX = resolve(OUT_DIR, "reconcile-ledger-template.xlsx");
const OUT_CSV = resolve(OUT_DIR, "reconcile-ledger-template.csv");
const OUT_STATEMENT = resolve(OUT_DIR, "reconcile-statement-template.csv");

/* ---------------------------------------------------------------- *
 * 見出しを types.ts から取り出す
 * ---------------------------------------------------------------- */

const TYPES_SRC = readFileSync(TYPES_TS, "utf8");

function readLedgerColumns() {
  const m = /export const LEDGER_COLUMNS\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(TYPES_SRC);
  if (!m) throw new Error("types.ts から LEDGER_COLUMNS を取り出せませんでした。");
  const names = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  if (names.length === 0) throw new Error("LEDGER_COLUMNS が空です。");
  return names;
}

/** STATEMENT_ALIASES の中の1グループ（date / credit / desc …）の語を取り出す */
function readAliasGroup(name) {
  const m = new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`).exec(TYPES_SRC);
  if (!m) throw new Error(`types.ts から STATEMENT_ALIASES.${name} を取り出せませんでした。`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const COLUMNS = readLedgerColumns();

/** 最小テンプレートの3列。別名表に載っていなければ、ここで止める */
const STATEMENT_COLUMNS = ["日付", "摘要", "入金額"];
{
  const groups = { 日付: "date", 摘要: "desc", 入金額: "credit" };
  for (const [name, group] of Object.entries(groups)) {
    if (!readAliasGroup(group).includes(name)) {
      throw new Error(
        `明細テンプレートの見出し「${name}」が STATEMENT_ALIASES.${group} にありません。` +
          "テンプレートを配る前に別名表へ戻してください。",
      );
    }
  }
}

/* ---------------------------------------------------------------- *
 * 記入例と記入ガイド
 * ---------------------------------------------------------------- */

/** 記入例。値は COLUMNS と同じ並び */
const EXAMPLES = [
  [
    "INV-2026-101",
    "2026/07/05",
    "2026/07/31",
    "株式会社ミナトデザイン",
    "ｶ)ﾐﾅﾄﾃﾞｻﾞｲﾝ",
    148500,
    "6月分 保守運用",
  ],
  [
    "INV-2026-102",
    "2026/07/06",
    "2026/07/31",
    "合同会社あおば工房",
    "ﾄﾞ)ｱｵﾊﾞｺｳﾎﾞｳ",
    135300,
    "",
  ],
  [
    "INV-2026-103",
    "2026/07/08",
    "2026/08/31",
    "さくら歯科クリニック",
    "ｻｸﾗｼｶｸﾘﾆﾂｸ",
    396000,
    "振込手数料はご負担いただく取り決め",
  ],
];

const COLUMN_GUIDE = {
  請求番号:
    "INV-2026-101 のように1件につき1つの番号を入れます。必須です。台帳の中で重ならないようにしてください（重なっていても突合はできますが、どちらに当てるか迷う元になります）。",
  請求日:
    "2026/07/05・2026-07-05・2026年7月5日 のいずれでも読み取ります。Excelの日付書式のセルもそのまま使えます。空欄でも構いません（表示と書き出しにだけ使います）。",
  支払期日:
    "書き方は請求日と同じです。空欄でも構いません。空欄のときは、入金日が期日から離れているかどうかを見ません（日付で切り捨てて「入っているのに未入金」と出すのを避けるためです）。",
  取引先名: "請求先の会社名・屋号・氏名。必須です。漢字で構いません。",
  振込名義:
    "相手が振り込むときのカナ（ｶ)ﾐﾅﾄﾃﾞｻﾞｲﾝ など）。半角カナ・全角カナのどちらでも構いません。空欄のときは取引先名から照合しますが、漢字・ひらがなは銀行の明細と当たらないため、カナを入れておくと精度が上がります。",
  請求額:
    "税込・円で、実際に振り込まれる金額を数値で入れます。必須です。¥ やカンマ、「円」、全角数字が混じっていても読み取ります。0円以下の行は突合に含めません。",
  備考: "メモ。突合結果のCSVにそのまま引き継がれます。空欄でも構いません。",
};

const GUIDE_NOTES = [
  "1行 ＝ 請求1件です。1件の請求に複数の明細があるときは、合計した1行にまとめてください（請求書PDFの台帳とは粒度が違います）。",
  "読み取るのは1枚目の「明細」シートだけです。このシート（記入ガイド）は読み取りません。",
  "請求は 3000 行までです。それを超えるときは期間で分けてください。",
  "行や列を増やしても構いませんが、1行目の見出しの文字は変えないでください（見出しの名前で列を探しています）。",
  "銀行の入出金明細は、インターネットバンキングから CSV で書き出したものをそのままお使いください。見出し行があれば、多くの銀行の形をそのまま読み取ります。",
  "対応していない形の明細は、同梱の「reconcile-statement-template.csv」（日付／摘要／入金額の3列）へ貼り替えてください。",
  "読み込んだファイルはブラウザの中だけで処理され、どこにも送信されません。",
];

/* ---------------------------------------------------------------- *
 * XML の小道具
 * ---------------------------------------------------------------- */

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 0 → A, 25 → Z, 26 → AA */
function colLetter(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

class SharedStrings {
  constructor() {
    this.list = [];
    this.index = new Map();
    this.count = 0;
  }
  add(text) {
    this.count++;
    const hit = this.index.get(text);
    if (hit !== undefined) return hit;
    const i = this.list.length;
    this.list.push(text);
    this.index.set(text, i);
    return i;
  }
  toXml() {
    const items = this.list.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join("");
    return (
      XML_DECL +
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.count}" uniqueCount="${this.list.length}">${items}</sst>`
    );
  }
}

const sst = new SharedStrings();

function cell(rowNo, colIndex, value, styleIndex) {
  if (value === null || value === undefined || value === "") return "";
  const ref = `${colLetter(colIndex)}${rowNo}`;
  const s = styleIndex ? ` s="${styleIndex}"` : "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${s} t="s"><v>${sst.add(String(value))}</v></c>`;
}

function rowXml(rowNo, values, styleIndex, heightAttr = "") {
  const cells = values.map((v, i) => cell(rowNo, i, v, styleIndex)).join("");
  return `<row r="${rowNo}"${heightAttr}>${cells}</row>`;
}

function sheetXml({ cols, rows, lastCol, lastRow, freeze }) {
  const view = freeze
    ? `<sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>`
    : `<sheetView workbookViewId="0"/>`;
  return (
    XML_DECL +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${colLetter(lastCol)}${lastRow}"/>` +
    `<sheetViews>${view}</sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/>` +
    (cols ? `<cols>${cols}</cols>` : "") +
    `<sheetData>${rows}</sheetData>` +
    `<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>` +
    `</worksheet>`
  );
}

/* ---------------------------------------------------------------- *
 * シート1「明細」
 * ---------------------------------------------------------------- */

/** 列幅（文字数）。COLUMNS と同じ並び */
const COL_WIDTHS = [16, 12, 12, 28, 24, 12, 32];

const sheet1Cols = COLUMNS.map(
  (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${COL_WIDTHS[i] ?? 14}" customWidth="1"/>`,
).join("");

const sheet1Rows = [
  rowXml(1, COLUMNS, 1, ' ht="24" customHeight="1"'),
  ...EXAMPLES.map((vals, i) => rowXml(i + 2, vals, 0)),
].join("");

const sheet1 = sheetXml({
  cols: sheet1Cols,
  rows: sheet1Rows,
  lastCol: COLUMNS.length - 1,
  lastRow: EXAMPLES.length + 1,
  freeze: true,
});

/* ---------------------------------------------------------------- *
 * シート2「記入ガイド」
 * ---------------------------------------------------------------- */

function buildGuideSheet() {
  const out = [];
  let r = 1;
  out.push(
    rowXml(
      r++,
      ["記入ガイド", "1行 ＝ 請求1件です。1枚目の「明細」シートに入力してください。"],
      1,
      ' ht="24" customHeight="1"',
    ),
  );
  r++;
  out.push(rowXml(r++, ["列の名前", "書き方"], 1));
  for (const name of COLUMNS) {
    out.push(rowXml(r++, [name, COLUMN_GUIDE[name] ?? ""], 2, ' ht="34" customHeight="1"'));
  }
  r++;
  out.push(rowXml(r++, ["注意事項", ""], 1));
  for (const note of GUIDE_NOTES) {
    out.push(rowXml(r++, ["", note], 2, ' ht="34" customHeight="1"'));
  }
  return { rows: out.join(""), lastRow: r - 1 };
}

const guide = buildGuideSheet();

const sheet2 = sheetXml({
  cols: `<col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="92" customWidth="1"/>`,
  rows: guide.rows,
  lastCol: 1,
  lastRow: guide.lastRow,
  freeze: false,
});

/* ---------------------------------------------------------------- *
 * 書式（styles.xml）
 *   0: 標準 / 1: 見出し（太字＋薄い地色＋罫線） / 2: 折り返し表示（ガイド用）
 * ---------------------------------------------------------------- */

const FONT = '<name val="游ゴシック"/><family val="3"/><charset val="128"/>';

const stylesXml =
  XML_DECL +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2">` +
  `<font><sz val="11"/><color rgb="FF1F1C1C"/>${FONT}</font>` +
  `<font><b/><sz val="11"/><color rgb="FF1F1C1C"/>${FONT}</font>` +
  `</fonts>` +
  `<fills count="3">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFF1ECE3"/><bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="2">` +
  `<border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border><left/><right/><top/><bottom style="thin"><color rgb="FFCFC6B6"/></bottom><diagonal/></border>` +
  `</borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="3">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="標準" xfId="0" builtinId="0"/></cellStyles>` +
  `<dxfs count="0"/>` +
  `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>` +
  `</styleSheet>`;

/* ---------------------------------------------------------------- *
 * パッケージ
 * ---------------------------------------------------------------- */

const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const contentTypes =
  XML_DECL +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
  `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
  `</Types>`;

const rootRels =
  XML_DECL +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`;

const workbookXml =
  XML_DECL +
  `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS_REL}">` +
  `<workbookPr/>` +
  `<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="20000" windowHeight="12000"/></bookViews>` +
  `<sheets>` +
  `<sheet name="明細" sheetId="1" r:id="rId1"/>` +
  `<sheet name="記入ガイド" sheetId="2" r:id="rId2"/>` +
  `</sheets>` +
  `</workbook>`;

const workbookRels =
  XML_DECL +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="${NS_REL}/worksheet" Target="worksheets/sheet2.xml"/>` +
  `<Relationship Id="rId3" Type="${NS_REL}/styles" Target="styles.xml"/>` +
  `<Relationship Id="rId4" Type="${NS_REL}/sharedStrings" Target="sharedStrings.xml"/>` +
  `</Relationships>`;

const sharedStringsXml = sst.toXml();

const files = {
  "[Content_Types].xml": strToU8(contentTypes),
  "_rels/.rels": strToU8(rootRels),
  "xl/workbook.xml": strToU8(workbookXml),
  "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
  "xl/styles.xml": strToU8(stylesXml),
  "xl/sharedStrings.xml": strToU8(sharedStringsXml),
  "xl/worksheets/sheet1.xml": strToU8(sheet1),
  "xl/worksheets/sheet2.xml": strToU8(sheet2),
};

const zipped = zipSync(files, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") });

/* ---------------------------------------------------------------- *
 * CSV（UTF-8 BOM付き・CRLF）
 * ---------------------------------------------------------------- */

function csvField(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvText(rows) {
  return "﻿" + rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

const ledgerCsv = csvText([COLUMNS, ...EXAMPLES]);

/** 入出金明細の最小テンプレート。この3列だけあれば必ず読める */
const statementCsv = csvText([
  STATEMENT_COLUMNS,
  ["2026/07/28", "振込 ｶ)ﾐﾅﾄﾃﾞｻﾞｲﾝ", 148500],
  ["2026/07/29", "振込 ﾄﾞ)ｱｵﾊﾞｺｳﾎﾞｳ", 135300],
  ["2026/07/31", "振込 ｻｸﾗｼｶｸﾘﾆﾂｸ", 395120],
]);

/* ---------------------------------------------------------------- *
 * 書き出し
 * ---------------------------------------------------------------- */

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_XLSX, zipped);
writeFileSync(OUT_CSV, Buffer.from(ledgerCsv, "utf8"));
writeFileSync(OUT_STATEMENT, Buffer.from(statementCsv, "utf8"));

console.log(`台帳の列    : ${COLUMNS.length}（${COLUMNS.join(" / ")}）`);
console.log(`明細の列    : ${STATEMENT_COLUMNS.join(" / ")}（別名表との一致を確認済み）`);
console.log(`記入例      : ${EXAMPLES.length} 行`);
console.log(`xlsx        : ${OUT_XLSX} (${zipped.length} bytes)`);
console.log(`台帳csv     : ${OUT_CSV} (${Buffer.byteLength(ledgerCsv, "utf8")} bytes)`);
console.log(`明細csv     : ${OUT_STATEMENT} (${Buffer.byteLength(statementCsv, "utf8")} bytes)`);
