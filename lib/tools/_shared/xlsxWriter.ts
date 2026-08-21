/**
 * /tools 共通 — xlsx の書き出し（ブラウザ内）
 *
 * ⚠ **npm の `xlsx` パッケージは使わない。**公開版に既知の脆弱性が残っており、
 *    セキュリティを掲げるサイトに載せられない。zip 化だけ fflate を使い、
 *    OPC パッケージ（xlsx の中身）は自前で組む。
 *
 * ⚠ 文字列は sharedStrings ではなく **inlineStr** で書く。
 *    ・全文をメモリに溜める共有表が要らない
 *    ・`_shared/sheetReader.ts` の readCell が inlineStr を読めるので、
 *      「書いたものを自分で読み戻す」往復検証ができる（回帰を機械で見つけられる）
 *
 * ⚠ ネットワークへは一切出ない。戻り値は Uint8Array なので、
 *    Blob にして URL.createObjectURL でそのまま落とせる。
 *
 * 元になった実装＝`scripts/tools/build-invoice-template.mjs`（T-01 のテンプレート生成）。
 */
import { strToU8, zipSync } from "fflate";

/* ------------------------------------------------------------------ *
 * 値の型
 * ------------------------------------------------------------------ */

/** 日付セルとして書きたい値。iso は "YYYY-MM-DD" */
export interface XlsxDate {
  kind: "date";
  iso: string;
}

/** 1セルに置ける値。null / undefined / "" はセルごと省く */
export type XlsxCell = string | number | boolean | null | undefined | XlsxDate;

export interface XlsxSheetInput {
  /** シート名。31字まで。使えない文字は自動で落とす */
  name: string;
  /** 見出し行。渡すと太字＋地色＋1行目固定になる */
  header?: readonly string[];
  /** 本文。行ごとに列数が違ってもよい */
  rows: readonly (readonly XlsxCell[])[];
  /** 列幅（文字数）。省略すると Excel の既定 */
  colWidths?: readonly number[];
}

/* ------------------------------------------------------------------ *
 * 日付 ⇄ Excel シリアル値
 * ------------------------------------------------------------------ */

/**
 * "YYYY-MM-DD" → Excel のシリアル値。
 *
 * `sheetReader.ts` の serialToIso() の厳密な逆になるよう作ってある。
 * 1900年うるう年バグ（Excel は実在しない 1900-02-29 をシリアル 60 として持つ）は、
 * 60 以降を1つずらして吸収する。ゆえに serialToIso(isoToSerial(x)) === x が成り立つ。
 */
export function isoToSerial(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;

  let days = Math.round((dt.getTime() - Date.UTC(1899, 11, 31)) / 86400000);
  if (days >= 60) days += 1; // 実在しない 1900-02-29 のぶんを空ける
  return days > 0 ? days : null;
}

/* ------------------------------------------------------------------ *
 * XML の小道具
 * ------------------------------------------------------------------ */

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const BACKSLASH = String.fromCharCode(92);
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** XML 1.0 に置けない文字を落とす。混ざっていると Excel が「修復」を出す */
function stripInvalidXmlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const c = ch.codePointAt(0) ?? 0;
    if (c === 0x09 || c === 0x0a || c === 0x0d) {
      out += ch;
      continue;
    }
    if (c < 0x20 || c === 0x7f) continue;
    if (c >= 0xd800 && c <= 0xdfff) continue;
    out += ch;
  }
  return out;
}

/** 0 → A, 25 → Z, 26 → AA */
export function colLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * シート名を Excel が受け付ける形へ直す。
 * 31字まで／`[ ] : * ? / \` は使えない／空にはできない。
 */
export function safeSheetName(name: string, fallback = "Sheet1"): string {
  const forbidden = ["[", "]", ":", "*", "?", "/", BACKSLASH];
  let out = "";
  for (const ch of String(name ?? "")) out += forbidden.includes(ch) ? "_" : ch;
  out = out.replace(/^'+|'+$/g, "").trim().slice(0, 31);
  return out === "" ? fallback : out;
}

/* ------------------------------------------------------------------ *
 * セル
 * ------------------------------------------------------------------ */

const STYLE_DEFAULT = 0;
const STYLE_HEADER = 1;
const STYLE_DATE = 2;

function isDate(value: XlsxCell): value is XlsxDate {
  return typeof value === "object" && value !== null && (value as XlsxDate).kind === "date";
}

function cellXml(rowNo: number, colIndex: number, value: XlsxCell, styleIndex: number): string {
  if (value === null || value === undefined || value === "") return "";
  const ref = `${colLetter(colIndex)}${rowNo}`;

  if (isDate(value)) {
    const serial = isoToSerial(value.iso);
    // 読めない日付は「黙って空にする」より、原文のまま文字で残すほうが事故が小さい
    if (serial === null) return inlineString(ref, value.iso, styleIndex);
    return `<c r="${ref}" s="${STYLE_DATE}"><v>${serial}</v></c>`;
  }

  const s = styleIndex === STYLE_DEFAULT ? "" : ` s="${styleIndex}"`;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return inlineString(ref, String(value), styleIndex);
}

function inlineString(ref: string, text: string, styleIndex: number): string {
  const s = styleIndex === STYLE_DEFAULT ? "" : ` s="${styleIndex}"`;
  const body = esc(stripInvalidXmlChars(text));
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${body}</t></is></c>`;
}

/* ------------------------------------------------------------------ *
 * シート
 * ------------------------------------------------------------------ */

function buildSheetXml(sheet: XlsxSheetInput): string {
  const bodyRows = sheet.rows;
  const hasHeader = Array.isArray(sheet.header) && sheet.header.length > 0;

  let lastCol = 0;
  if (hasHeader) lastCol = Math.max(lastCol, sheet.header!.length);
  for (const r of bodyRows) lastCol = Math.max(lastCol, r.length);
  if (lastCol === 0) lastCol = 1;

  const parts: string[] = [];
  let rowNo = 0;

  if (hasHeader) {
    rowNo += 1;
    const cells = sheet.header!.map((v, i) => cellXml(rowNo, i, v, STYLE_HEADER)).join("");
    parts.push(`<row r="${rowNo}">${cells}</row>`);
  }
  for (const row of bodyRows) {
    rowNo += 1;
    const cells = row.map((v, i) => cellXml(rowNo, i, v, STYLE_DEFAULT)).join("");
    parts.push(`<row r="${rowNo}">${cells}</row>`);
  }
  const lastRow = Math.max(rowNo, 1);

  const cols =
    sheet.colWidths && sheet.colWidths.length > 0
      ? `<cols>${sheet.colWidths
          .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
          .join("")}</cols>`
      : "";

  const view = hasHeader
    ? `<sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>`
    : `<sheetView workbookViewId="0"/>`;

  return (
    XML_DECL +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${colLetter(lastCol - 1)}${lastRow}"/>` +
    `<sheetViews>${view}</sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/>` +
    cols +
    `<sheetData>${parts.join("")}</sheetData>` +
    `<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>` +
    `</worksheet>`
  );
}

/* ------------------------------------------------------------------ *
 * 書式
 *   0: 標準 / 1: 見出し（太字＋薄い地色＋下罫） / 2: 日付（yyyy/mm/dd）
 * ------------------------------------------------------------------ */

const FONT = '<name val="游ゴシック"/><family val="3"/><charset val="128"/>';

const STYLES_XML =
  XML_DECL +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy/mm/dd"/></numFmts>` +
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
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="標準" xfId="0" builtinId="0"/></cellStyles>` +
  `<dxfs count="0"/>` +
  `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>` +
  `</styleSheet>`;

/* ------------------------------------------------------------------ *
 * パッケージ
 * ------------------------------------------------------------------ */

const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/** 書き出しの日時。実行ごとに変わると差分検証ができないので固定する */
const FIXED_MTIME = new Date("2026-01-01T00:00:00Z");

/**
 * xlsx を1つ組み立てる。
 *
 * ```ts
 * const bytes = buildXlsx([
 *   { name: "結果", header: ["日付", "取引先", "金額"], rows: [
 *     [{ kind: "date", iso: "2026-04-01" }, "株式会社サンプル", 120000],
 *   ]},
 * ]);
 * ```
 */
export function buildXlsx(sheets: readonly XlsxSheetInput[]): Uint8Array {
  const list = sheets.length > 0 ? sheets : [{ name: "Sheet1", rows: [] as XlsxCell[][] }];

  // シート名は重複できない
  const used = new Set<string>();
  const named = list.map((s, i) => {
    let name = safeSheetName(s.name, `Sheet${i + 1}`);
    let n = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = `_${n}`;
      name = `${name.slice(0, 31 - suffix.length)}${suffix}`;
      n += 1;
    }
    used.add(name.toLowerCase());
    return { ...s, name };
  });

  const contentTypes =
    XML_DECL +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    named
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
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
    named
      .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("") +
    `</sheets>` +
    `</workbook>`;

  const workbookRels =
    XML_DECL +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    named
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `<Relationship Id="rId${named.length + 1}" Type="${NS_REL}/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
    "xl/styles.xml": strToU8(STYLES_XML),
  };
  named.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(buildSheetXml(s));
  });

  return zipSync(files, { level: 6, mtime: FIXED_MTIME });
}

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */

export interface CsvOptions {
  /** 先頭に BOM を付ける（既定 true）。付けないと Excel が Shift_JIS と誤認する */
  bom?: boolean;
  /** 改行を CRLF にする（既定 true） */
  crlf?: boolean;
}

function csvField(value: XlsxCell): string {
  if (value === null || value === undefined) return "";
  const s = isDate(value) ? value.iso : String(value);
  const needsQuote =
    s.includes('"') || s.includes(",") || s.includes(CR) || s.includes(LF);
  return needsQuote ? `"${s.split('"').join('""')}"` : s;
}

/**
 * CSV を組み立てる（RFC4180・既定は UTF-8 BOM 付き・CRLF）。
 * 戻り値は文字列。Blob にするときは `new Blob([text], { type: "text/csv;charset=utf-8" })`。
 */
export function buildCsv(rows: readonly (readonly XlsxCell[])[], options: CsvOptions = {}): string {
  const nl = options.crlf === false ? LF : CR + LF;
  const body = rows.map((row) => row.map(csvField).join(",")).join(nl);
  const bom = options.bom === false ? "" : String.fromCharCode(0xfeff);
  return bom + body + nl;
}
