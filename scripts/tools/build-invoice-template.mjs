/**
 * 請求書PDF一括作成ツール — 台帳テンプレート（.xlsx / .csv）の生成
 *
 *   node scripts/tools/build-invoice-template.mjs
 *
 * 出力：
 *   public/tools/invoice/invoice-ledger-template.xlsx
 *   public/tools/invoice/invoice-ledger-template.csv   （UTF-8 BOM付き＝Excelで文字化けしない）
 *
 * ⚠ npm の xlsx パッケージは使わない（既知の脆弱性のため）。zip 化は fflate のみ。
 * ⚠ 見出しは lib/tools/invoice/types.ts の LEDGER_COLUMNS から読み出す。
 *    ハードコードしないので、型の定義とテンプレートが食い違うことがない。
 */

import { zipSync, strToU8 } from "fflate";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const TYPES_TS = resolve(ROOT, "lib/tools/invoice/types.ts");
const OUT_DIR = resolve(ROOT, "public/tools/invoice");
const OUT_XLSX = resolve(OUT_DIR, "invoice-ledger-template.xlsx");
const OUT_CSV = resolve(OUT_DIR, "invoice-ledger-template.csv");

/* ---------------------------------------------------------------- *
 * 見出しを types.ts から取り出す
 * ---------------------------------------------------------------- */

function readLedgerColumns() {
  const src = readFileSync(TYPES_TS, "utf8");
  const m = /export const LEDGER_COLUMNS\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(src);
  if (!m) throw new Error("types.ts から LEDGER_COLUMNS を取り出せませんでした。");
  const names = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  if (names.length === 0) throw new Error("LEDGER_COLUMNS が空です。");
  return names;
}

const COLUMNS = readLedgerColumns();

/* ---------------------------------------------------------------- *
 * 記入例と記入ガイド
 * ---------------------------------------------------------------- */

/** 記入例3行。値は COLUMNS と同じ並び。空文字は「空欄でよい」の意味 */
const EXAMPLES = [
  [
    "INV-2026-001",
    "2026/08/05",
    "2026/08/31",
    "株式会社ミナトデザイン",
    "御中",
    "100-0000",
    "東京都千代田区架空町1-2-3 サンプルビル4F",
    "2026年7月分 Webサイト保守運用",
    "Webサイト保守運用費（2026年7月分）",
    1,
    "式",
    50000,
    "10%",
    "",
  ],
  [
    "INV-2026-001",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "サーバー・ドメイン費用（2026年7月分）",
    1,
    "式",
    4500,
    "10%",
    "同じ請求書番号の行は1枚の請求書にまとまります",
  ],
  [
    "INV-2026-002",
    "2026/08/07",
    "2026/08/31",
    "合同会社あおば工房",
    "御中",
    "460-0000",
    "愛知県名古屋市中区仮想1-4-8",
    "商品撮影ディレクション",
    "撮影時 飲料・軽食（立替分）",
    1,
    "式",
    3240,
    "軽減8%",
    "軽減税率対象（飲食料品）",
  ],
];

/** 列ごとの説明（記入ガイドシート） */
const COLUMN_GUIDE = {
  請求書番号:
    "INV-2026-001 のように1枚につき1つの番号を入れます。同じ番号の行は1枚の請求書にまとまります。空欄のままにすると、取引先名ごとにまとめて自動採番します。",
  請求日:
    "2026/08/21・2026-08-21・2026年8月21日 のいずれでも読み取ります。Excelの日付書式のセルもそのまま使えます。同じ請求書の2行目以降は空欄で構いません（先頭行の値を使います）。",
  支払期日: "空欄でも構いません。書き方は請求日と同じです。",
  取引先名: "請求先の会社名・屋号・氏名。必須です。",
  敬称: "御中 または 様。空欄のときは「御中」になります。",
  郵便番号: "例：100-0000。空欄でも構いません。",
  住所: "空欄でも構いません。長い場合は折り返して表示されます。",
  件名: "請求書のタイトルの下に入ります。空欄でも構いません。",
  品目: "取引の内容。必須です。軽減税率の対象なら、何の飲食料品かが分かるように書いてください。",
  数量: "数値で入力します。必須です。カンマや円記号が混じっていても読み取ります。",
  単位: "式・個・時間・ページ・回 など。空欄でも構いません。",
  単価: "税抜の単価を数値で入力します。必須です。金額＝数量×単価（税抜）で計算します。",
  税率:
    "10 / 10% / 0.1 ＝ 標準税率10%。8 / 8% / 軽減8% ＝ 軽減税率8%。0 / 非課税 ＝ 非課税・不課税。空欄のときは10%として扱います。",
  備考: "明細ごとのメモ。請求書の備考欄にまとめて出ます。空欄でも構いません。",
};

const GUIDE_NOTES = [
  "1行 ＝ 明細1行です。1枚の請求書に複数の明細があるときは、同じ請求書番号で行を増やしてください。",
  "消費税は税率ごとに1回だけ計算します（適格請求書＝インボイスの要件）。明細ごとに出した端数は足し合わせません。",
  "スキャンした画像やPDFの台帳は読み取れません。この Excel か CSV の形で入力してください。",
  "読み取るのは1枚目の「明細」シートだけです。このシート（記入ガイド）は読み取りません。",
  "明細は 2000 行までです。それを超えるときはファイルを分けてください。",
  "行や列を増やしても構いませんが、1行目の見出しの文字は変えないでください（見出しの名前で列を探しています）。",
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

/** 共有文字列テーブル */
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

/**
 * 1セル分の XML。空の値はセルごと省く（＝実データの列飛びを再現する形になる）
 * @param {number} rowNo 1始まり
 */
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
const COL_WIDTHS = [16, 12, 12, 26, 6, 11, 34, 26, 34, 7, 7, 11, 10, 30];

const sheet1Cols = COLUMNS.map(
  (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${COL_WIDTHS[i] ?? 14}" customWidth="1"/>`
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
  out.push(rowXml(r++, ["記入ガイド", "1行 ＝ 明細1行です。1枚目の「明細」シートに入力してください。"], 1, ' ht="24" customHeight="1"'));
  r++; // 1行あける
  out.push(rowXml(r++, ["列の名前", "書き方"], 1));
  for (const name of COLUMNS) {
    out.push(rowXml(r++, [name, COLUMN_GUIDE[name] ?? ""], 2, ' ht="34" customHeight="1"'));
  }
  r++; // 1行あける
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
const NS_SS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

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
  `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS_SS}">` +
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

// sharedStrings は全シートを組み立てたあとに確定する
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

const csvText =
  "﻿" +
  [COLUMNS, ...EXAMPLES].map((row) => row.map(csvField).join(",")).join("\r\n") +
  "\r\n";

/* ---------------------------------------------------------------- *
 * 書き出し
 * ---------------------------------------------------------------- */

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_XLSX, zipped);
writeFileSync(OUT_CSV, Buffer.from(csvText, "utf8"));

console.log(`列数        : ${COLUMNS.length}（${COLUMNS.join(" / ")}）`);
console.log(`記入例      : ${EXAMPLES.length} 行`);
console.log(`xlsx        : ${OUT_XLSX} (${zipped.length} bytes)`);
console.log(`csv         : ${OUT_CSV} (${Buffer.byteLength(csvText, "utf8")} bytes)`);
