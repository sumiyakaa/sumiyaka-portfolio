/**
 * 電帳法ファイル名 一括リネーム — 配布物の生成
 *
 *   node scripts/tools/build-evidence-template.mjs
 *
 * 出力：
 *   public/tools/evidence/evidence-ledger-template.xlsx   台帳テンプレート
 *   public/tools/evidence/evidence-ledger-template.csv    同上（UTF-8 BOM付き＝Excelで文字化けしない）
 *   public/tools/evidence/evidence-sample.zip             ダミー証憑8点＋記入済み台帳
 *
 * ⚠ npm の xlsx パッケージは使わない（既知の脆弱性のため）。zip 化は fflate のみ。
 * ⚠ 見出しは lib/tools/evidence/types.ts の LEDGER_COLUMNS から読み出す。
 *    サンプルの中身は lib/tools/evidence/sample.ts の SAMPLE_RECORDS から読み出す。
 *    ハードコードしないので、型・画面のサンプル・配布物が食い違うことがない。
 * ⚠ ダミー証憑は外部ライブラリを使わずに自前で組む。
 *    PNG …… node:zlib で最小構成（グレースケール・無地）
 *    JPEG … ベースライン（グレースケール・無地）を標準ハフマン表で組む
 *    PDF …… %PDF-1.4 から %%EOF までテキストで直接組む（pdf-lib は使わない）
 *    HEIC は作れないので、サンプルZIPの #7 だけ .jpg に差し替える
 *    （sample.ts の画面用データは .HEIC のまま）
 */

import { zipSync, strToU8 } from "fflate";
import { deflateSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const TYPES_TS = resolve(ROOT, "lib/tools/evidence/types.ts");
const SAMPLE_TS = resolve(ROOT, "lib/tools/evidence/sample.ts");
const OUT_DIR = resolve(ROOT, "public/tools/evidence");
const OUT_XLSX = resolve(OUT_DIR, "evidence-ledger-template.xlsx");
const OUT_CSV = resolve(OUT_DIR, "evidence-ledger-template.csv");
const OUT_ZIP = resolve(OUT_DIR, "evidence-sample.zip");

/** zip の更新日時を固定して、同じ入力からは同じバイト列が出るようにする */
const FIXED_MTIME = new Date("2026-01-01T00:00:00Z");

/* ---------------------------------------------------------------- *
 * 型定義・サンプルの読み出し
 * ---------------------------------------------------------------- */

function readLedgerColumns() {
  const src = readFileSync(TYPES_TS, "utf8");
  const m = /export const LEDGER_COLUMNS\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(src);
  if (!m) throw new Error("types.ts から LEDGER_COLUMNS を取り出せませんでした。");
  const names = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  if (names.length === 0) throw new Error("LEDGER_COLUMNS が空です。");
  return names;
}

function readSampleRecords() {
  const src = readFileSync(SAMPLE_TS, "utf8");
  const m = /const SAMPLE_RECORDS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(src);
  if (!m) throw new Error("sample.ts から SAMPLE_RECORDS を取り出せませんでした。");
  const out = [];
  for (const block of m[1].matchAll(/\{([^{}]*)\}/g)) {
    const body = block[1];
    const str = (key) => {
      const hit = new RegExp(`${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(body);
      if (!hit) throw new Error(`SAMPLE_RECORDS の ${key} を読み取れませんでした。`);
      return hit[1];
    };
    const num = (key) => {
      const hit = new RegExp(`${key}\\s*:\\s*(-?\\d+)`).exec(body);
      if (!hit) throw new Error(`SAMPLE_RECORDS の ${key} を読み取れませんでした。`);
      return Number(hit[1]);
    };
    out.push({
      fileName: str("fileName"),
      date: str("date"),
      vendor: str("vendor"),
      amount: num("amount"),
      docType: str("docType"),
    });
  }
  if (out.length === 0) throw new Error("SAMPLE_RECORDS が空です。");
  return out;
}

const COLUMNS = readLedgerColumns();
const SAMPLES = readSampleRecords();

/* ---------------------------------------------------------------- *
 * テンプレートの中身
 * ---------------------------------------------------------------- */

/** 1行目に置く注記（見出しは2行目。findHeaderRow が先頭10行を走査するので読み取れる） */
const NOTE_ROW =
  "※ 「元のファイル名」には、いま付いている名前を拡張子まで含めて書いてください。 ※ 取引年月日は西暦で。 ※ 取引金額は円・整数（カンマや「円」が入っていても読めます）。";

/** 記入例2行。値は COLUMNS と同じ並び */
const EXAMPLES = [
  ["IMG_4821.jpg", "2021/1/31", "㈱霞商店", 110000, "請求書", ""],
  [
    "scan_0002.pdf",
    "2021/2/15",
    "国税工務店㈱",
    88000,
    "請求書",
    "同じ名前のファイルが別のフォルダにあるときは 2021/02/scan_0002.pdf のように書きます",
  ],
];

/** 列ごとの説明（記入ガイドシート） */
const COLUMN_GUIDE = {
  元のファイル名:
    "いま付いているファイル名を、拡張子まで含めて書いてください。別のフォルダに同じ名前のファイルがあるときは、2021/02/scan_0002.pdf のようにフォルダを含めて書いてください。必須です。",
  取引年月日:
    "2021/1/31・2021-01-31・20210131 のいずれでも読み取ります。Excelの日付書式のセルもそのまま使えます。西暦でご記入ください（和暦は読み取れません）。必須です。",
  取引先: "取引先の名称。付け替えたあとのファイル名にそのまま入ります。必須です。",
  取引金額:
    "円・整数で入力します。カンマや「円」「¥」が混じっていても読み取ります。返金などのマイナスも書けます。小数は読み取れません。必須です。",
  書類の種類: "請求書・領収書・注文書 など。索引簿にそのまま出ます。空欄でも構いません。",
  備考: "索引簿の備考欄へそのまま流します。空欄でも構いません。",
};

const GUIDE_NOTES = [
  "1行 ＝ 証憑1件です。読み込む証憑ファイルの数だけ行を作ってください。",
  "読み取るのは1枚目の「明細」シートだけです。このシート（記入ガイド）は読み取りません。",
  "1行目の注記と2行目の見出しは消さないでください。見出しの名前で列を探しているので、列の順序は入れ替えても構いません。",
  "台帳は 500 行までです。それを超えるときはファイルを分けてください。",
  "スキャンした画像やPDFの中身から日付・取引先・金額を読み取ることはしません。ここに書いていただいた内容だけを使います。",
  "取引年月日は西暦で統一しています。国税庁「電子帳簿保存法一問一答【電子取引関係】」問50 には、日付は和暦でも西暦でも構わないが、混在は抽出機能の妨げとなることからどちらかに統一する必要がある、と書かれています。",
  "このツールが行うのは、ファイル名の付け替えと索引簿の作成だけです。電子帳簿保存法の要件を満たすことを保証するものではありません。",
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

/** 共有文字列テーブル（ブックごとに1つ作る） */
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

/** 1セル分の XML。空の値はセルごと省く */
function cellXml(sst, rowNo, colIndex, value, styleIndex) {
  if (value === null || value === undefined || value === "") return "";
  const ref = `${colLetter(colIndex)}${rowNo}`;
  const s = styleIndex ? ` s="${styleIndex}"` : "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${s} t="s"><v>${sst.add(String(value))}</v></c>`;
}

function rowXml(sst, rowNo, values, styleIndex, heightAttr = "") {
  const cells = values.map((v, i) => cellXml(sst, rowNo, i, v, styleIndex)).join("");
  return `<row r="${rowNo}"${heightAttr}>${cells}</row>`;
}

function sheetXml({ colsXml, rowsXml, lastCol, lastRow, freezeRows }) {
  const view =
    freezeRows > 0
      ? `<sheetView tabSelected="1" workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${freezeRows + 1}" sqref="A${freezeRows + 1}"/></sheetView>`
      : `<sheetView workbookViewId="0"/>`;
  return (
    XML_DECL +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${colLetter(Math.max(lastCol, 0))}${Math.max(lastRow, 1)}"/>` +
    `<sheetViews>${view}</sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/>` +
    (colsXml ? `<cols>${colsXml}</cols>` : "") +
    `<sheetData>${rowsXml}</sheetData>` +
    `<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>` +
    `</worksheet>`
  );
}

/* ---------------------------------------------------------------- *
 * 書式（styles.xml）
 *   0: 標準 / 1: 見出し（太字＋薄い地色＋罫線） / 2: 折り返し表示 / 3: 注記（薄い文字）
 * ---------------------------------------------------------------- */

const FONT = '<name val="游ゴシック"/><family val="3"/><charset val="128"/>';

const STYLES_XML =
  XML_DECL +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="3">` +
  `<font><sz val="11"/><color rgb="FF1F1C1C"/>${FONT}</font>` +
  `<font><b/><sz val="11"/><color rgb="FF1F1C1C"/>${FONT}</font>` +
  `<font><sz val="10"/><color rgb="FF7A736B"/>${FONT}</font>` +
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
  `<cellXfs count="4">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="標準" xfId="0" builtinId="0"/></cellStyles>` +
  `<dxfs count="0"/>` +
  `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>` +
  `</styleSheet>`;

/* ---------------------------------------------------------------- *
 * ブックの組み立て（OPC を自前で組む）
 * ---------------------------------------------------------------- */

const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/**
 * sheets = [{ name, colWidths, freezeRows, rows: [{ values, style, height }] }]
 */
function buildWorkbook(sheets) {
  const sst = new SharedStrings();

  const sheetXmls = sheets.map((sheet) => {
    const colsXml = (sheet.colWidths ?? [])
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
      .join("");
    const rowsXml = sheet.rows
      .map((row, i) => rowXml(sst, i + 1, row.values, row.style ?? 0, row.height ?? ""))
      .join("");
    const lastCol = Math.max(0, ...sheet.rows.map((r) => r.values.length - 1));
    return sheetXml({
      colsXml,
      rowsXml,
      lastCol,
      lastRow: sheet.rows.length,
      freezeRows: sheet.freezeRows ?? 0,
    });
  });

  const overrides = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  const contentTypes =
    XML_DECL +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    overrides +
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
    sheets
      .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("") +
    `</sheets>` +
    `</workbook>`;

  const workbookRels =
    XML_DECL +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join("") +
    `<Relationship Id="rId${sheets.length + 1}" Type="${NS_REL}/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId${sheets.length + 2}" Type="${NS_REL}/sharedStrings" Target="sharedStrings.xml"/>` +
    `</Relationships>`;

  const files = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
    "xl/styles.xml": strToU8(STYLES_XML),
    // sharedStrings は全シートを組み立てたあとに確定する
    "xl/sharedStrings.xml": strToU8(sst.toXml()),
  };
  sheetXmls.forEach((xml, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml);
  });

  return zipSync(files, { level: 6, mtime: FIXED_MTIME });
}

/* ---------------------------------------------------------------- *
 * シートの中身
 * ---------------------------------------------------------------- */

/** 列幅（文字数）。COLUMNS と同じ並び */
const COL_WIDTHS = [30, 14, 26, 12, 12, 34];

/** 明細シート（1行目＝注記／2行目＝見出し／3行目から中身） */
function buildLedgerSheet(dataRows) {
  return {
    name: "明細",
    colWidths: COL_WIDTHS,
    freezeRows: 2,
    rows: [
      { values: [NOTE_ROW], style: 3, height: ' ht="22" customHeight="1"' },
      { values: COLUMNS, style: 1, height: ' ht="24" customHeight="1"' },
      ...dataRows.map((values) => ({ values, style: 0 })),
    ],
  };
}

function buildGuideSheet() {
  const rows = [
    {
      values: ["記入ガイド", "1行 ＝ 証憑1件です。1枚目の「明細」シートに入力してください。"],
      style: 1,
      height: ' ht="24" customHeight="1"',
    },
    { values: [] },
    { values: ["列の名前", "書き方"], style: 1 },
    ...COLUMNS.map((name) => ({
      values: [name, COLUMN_GUIDE[name] ?? ""],
      style: 2,
      height: ' ht="46" customHeight="1"',
    })),
    { values: [] },
    { values: ["注意事項", ""], style: 1 },
    ...GUIDE_NOTES.map((note) => ({
      values: ["", note],
      style: 2,
      height: ' ht="46" customHeight="1"',
    })),
  ];
  return { name: "記入ガイド", colWidths: [18, 92], freezeRows: 0, rows };
}

/* ---------------------------------------------------------------- *
 * CSV（UTF-8 BOM付き・CRLF）
 * ---------------------------------------------------------------- */

function csvField(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows) {
  return "﻿" + rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/* ---------------------------------------------------------------- *
 * ダミー証憑 — PNG（グレースケール・無地）
 * ---------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** 8bit グレースケールの無地 PNG */
function buildPng(width, height, gray) {
  const stride = width + 1; // 先頭1バイトはフィルタ種別
  const raw = Buffer.alloc(stride * height, gray);
  for (let y = 0; y < height; y++) raw[y * stride] = 0; // フィルタ 0（None）
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 0; // カラータイプ 0＝グレースケール
  ihdr[10] = 0; // 圧縮方式
  ihdr[11] = 0; // フィルタ方式
  ihdr[12] = 0; // インターレースなし
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- *
 * ダミー証憑 — JPEG（ベースライン・グレースケール・無地）
 *
 * 画素値を 128 にすると、レベルシフト後の DC 係数が 0 になる。
 * つまり全ブロックが「DC差分0（符号 00）＋EOB（符号 1010）」の6ビットだけで済むので、
 * DCT も量子化も実装せずに正しいベースライン JPEG が組める。
 * ハフマン表は JPEG 規格 Annex K の輝度用（標準表）をそのまま使う。
 * ---------------------------------------------------------------- */

const JPEG_DC_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const JPEG_DC_VALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const JPEG_AC_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const JPEG_AC_VALS = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
  0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0,
  0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
  0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
  0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7,
  0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
  0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
  0xf9, 0xfa,
];

function jpegMarker(marker, payload) {
  const head = Buffer.from([0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff]);
  return Buffer.concat([head, payload]);
}

/** 無地（画素値128相当）のベースライン JPEG */
function buildJpeg(width, height) {
  const jfif = Buffer.from([
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // version 1.1
    0x00, // 単位なし
    0x00, 0x01, 0x00, 0x01, // 密度 1x1
    0x00, 0x00, // サムネイルなし
  ]);

  // 量子化表（全て16の平坦な表）。DC係数が0なので値そのものは絵に影響しない
  const dqt = Buffer.concat([Buffer.from([0x00]), Buffer.alloc(64, 16)]);

  const sof = Buffer.from([
    0x08, // 精度 8bit
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x01, // 成分数 1（グレースケール）
    0x01, // 成分ID
    0x11, // サンプリング 1x1
    0x00, // 量子化表 0
  ]);

  const dhtDc = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(JPEG_DC_BITS),
    Buffer.from(JPEG_DC_VALS),
  ]);
  const dhtAc = Buffer.concat([
    Buffer.from([0x10]),
    Buffer.from(JPEG_AC_BITS),
    Buffer.from(JPEG_AC_VALS),
  ]);

  const sos = Buffer.from([
    0x01, // 成分数
    0x01, // 成分ID
    0x00, // DC表0 / AC表0
    0x00, // Ss
    0x3f, // Se
    0x00, // Ah/Al
  ]);

  // エントロピー符号：ブロックごとに DC差分0（"00"）＋ EOB（"1010"）
  const blocks = Math.ceil(width / 8) * Math.ceil(height / 8);
  const bits = [];
  let acc = 0;
  let nbits = 0;
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) {
      acc = (acc << 1) | ((value >> i) & 1);
      nbits++;
      if (nbits === 8) {
        bits.push(acc & 0xff);
        if ((acc & 0xff) === 0xff) bits.push(0x00); // バイトスタッフィング
        acc = 0;
        nbits = 0;
      }
    }
  };
  for (let i = 0; i < blocks; i++) {
    push(0b00, 2); // DC カテゴリ0
    push(0b1010, 4); // EOB
  }
  if (nbits > 0) {
    acc = (acc << (8 - nbits)) | ((1 << (8 - nbits)) - 1); // 余りは1で埋める
    bits.push(acc & 0xff);
    if ((acc & 0xff) === 0xff) bits.push(0x00);
  }

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    jpegMarker(0xe0, jfif), // APP0
    jpegMarker(0xdb, dqt), // DQT
    jpegMarker(0xc0, sof), // SOF0
    jpegMarker(0xc4, dhtDc), // DHT
    jpegMarker(0xc4, dhtAc), // DHT
    jpegMarker(0xda, sos), // SOS
    Buffer.from(bits),
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}

/* ---------------------------------------------------------------- *
 * ダミー証憑 — PDF（1ページ・A4・pdf-lib は使わない）
 * ---------------------------------------------------------------- */

/** label は ASCII のみ（標準14書体には日本語が無い）。丸括弧と \ は使わない */
function buildPdf(label) {
  const stream =
    `BT /F1 22 Tf 64 742 Td (${label}) Tj ET\n` +
    `BT /F1 11 Tf 64 712 Td (This is a dummy file for trying out the rename tool.) Tj ET\n` +
    `BT /F1 11 Tf 64 694 Td (It has no real content.) Tj ET\n` +
    `0.85 0.85 0.85 RG 1 w 64 668 m 531 668 l S\n`;

  const objects = [
    `<</Type/Catalog/Pages 2 0 R>>`,
    `<</Type/Pages/Kids[3 0 R]/Count 1>>`,
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>`,
    `<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>`,
    `<</Length ${Buffer.byteLength(stream, "latin1")}>>\nstream\n${stream}endstream`,
  ];

  const chunks = [];
  let offset = 0;
  const write = (s) => {
    const b = Buffer.from(s, "latin1");
    chunks.push(b);
    offset += b.length;
  };

  write("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(offset);
    write(`${i + 1} 0 obj\n${body}\nendobj\n`);
  });

  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \r\n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \r\n`;
  }
  write(xref);
  write(`trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return Buffer.concat(chunks);
}

/* ---------------------------------------------------------------- *
 * 書き出し
 * ---------------------------------------------------------------- */

mkdirSync(OUT_DIR, { recursive: true });

/* --- 1. 台帳テンプレート（.xlsx / .csv） --- */

const templateXlsx = buildWorkbook([buildLedgerSheet(EXAMPLES), buildGuideSheet()]);
const templateCsv = buildCsv([[NOTE_ROW], COLUMNS, ...EXAMPLES]);

writeFileSync(OUT_XLSX, templateXlsx);
writeFileSync(OUT_CSV, Buffer.from(templateCsv, "utf8"));

/* --- 2. サンプル一式（ZIP） --- */

/** 画面用データは .HEIC のままだが、HEIC は生成できないので ZIP の中だけ .jpg にする */
function zipFileName(name) {
  return /\.hei[cf]$/i.test(name) ? name.replace(/\.hei[cf]$/i, ".jpg") : name;
}

const SAMPLE_ROOT = "evidence-sample";
const SAMPLE_EVIDENCE_DIR = `${SAMPLE_ROOT}/証憑`;
const SAMPLE_LEDGER_NAME = `${SAMPLE_ROOT}/記入済み台帳.xlsx`;

const sampleLedgerRows = SAMPLES.map((rec) => [
  zipFileName(rec.fileName),
  rec.date.replace(/-/g, "/"),
  rec.vendor,
  rec.amount,
  rec.docType,
  "",
]);

const sampleLedgerXlsx = buildWorkbook([buildLedgerSheet(sampleLedgerRows)]);

const zipEntries = { [SAMPLE_LEDGER_NAME]: sampleLedgerXlsx };
const dummyLog = [];

SAMPLES.forEach((rec, i) => {
  const name = zipFileName(rec.fileName);
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const label = `SAMPLE EVIDENCE ${String(i + 1).padStart(2, "0")}`;
  let bytes;
  if (ext === "pdf") bytes = buildPdf(label);
  else if (ext === "png") bytes = buildPng(400, 560, 0xe8);
  else bytes = buildJpeg(400, 560);
  zipEntries[`${SAMPLE_EVIDENCE_DIR}/${name}`] = bytes;
  dummyLog.push(`  ${SAMPLE_EVIDENCE_DIR}/${name} (${bytes.length} bytes)`);
});

const sampleZip = zipSync(zipEntries, { level: 6, mtime: FIXED_MTIME });
writeFileSync(OUT_ZIP, sampleZip);

/* --- 3. ログ --- */

console.log(`列数        : ${COLUMNS.length}（${COLUMNS.join(" / ")}）`);
console.log(`記入例      : ${EXAMPLES.length} 行（注記1行＋見出し1行の下）`);
console.log(`xlsx        : ${OUT_XLSX} (${templateXlsx.length} bytes)`);
console.log(`csv         : ${OUT_CSV} (${Buffer.byteLength(templateCsv, "utf8")} bytes)`);
console.log(`sample zip  : ${OUT_ZIP} (${sampleZip.length} bytes)`);
console.log(`  ${SAMPLE_LEDGER_NAME} (${sampleLedgerXlsx.length} bytes・${SAMPLES.length} 行)`);
console.log(dummyLog.join("\n"));
