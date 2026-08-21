/**
 * /tools 共通 — 表ファイル（xlsx / CSV）の読み取り
 *
 * 1本目「請求書PDF 一括作成」(T-01) で作った汎用部だけをここへ移した。
 *
 * ⚠ **npm の `xlsx` パッケージは使わない。**公開版に既知の脆弱性が残っており、
 *    セキュリティを掲げるサイトに載せられない。zip 展開だけ fflate を使い、
 *    XML は DOM 非依存の自前スキャナで読む（Node でもブラウザでも同じコードが動く）。
 *
 * ⚠ ネットワークへは一切出ない。入力は必ず Uint8Array で受け取る。
 *
 * 使い方：バイト列 → Grid（`(Cell[] | undefined)[]`）へ落としてから、
 * 各ツールの業務ロジックへ渡す。Grid までが共通、そこから先が各ツールの領分。
 */
import { unzipSync } from "fflate";

/* ------------------------------------------------------------------ *
 * 内部の共通表現
 * ------------------------------------------------------------------ */

/** セル1つ。numeric は「元データが数値型だった」ことを表す（＝日付シリアル値の判定に使う） */
export interface Cell {
  text: string;
  numeric: boolean;
}

/** 表全体。行が飛んでいる場合（xlsx の sparse row）は undefined が入る */
export type Grid = (Cell[] | undefined)[];

export const EMPTY_CELL: Cell = { text: "", numeric: false };

/** 読み取り自体を続行できない致命的な問題（呼び出し元で握って利用者向けの文言にする） */
export class SheetReadError extends Error {}

/* ------------------------------------------------------------------ *
 * XML スキャナ（DOM 非依存）
 * ------------------------------------------------------------------ */

interface TagInfo {
  /** '<' の位置 */
  start: number;
  /** '>' の次の位置 */
  end: number;
  name: string;
  attrs: string;
  /** 終了タグ（</foo>） */
  close: boolean;
  /** 空要素タグ（<foo/>） */
  self: boolean;
}

/** 名前空間接頭辞を落とす（<x:row> → row） */
function localName(name: string): string {
  const i = name.indexOf(":");
  return i < 0 ? name : name.slice(i + 1);
}

/** 属性値の引用符の中にある '>' を誤検出しないように、タグの終わりを探す */
function findTagEnd(xml: string, from: number): number {
  let quote = 0;
  for (let i = from; i < xml.length; i++) {
    const c = xml.charCodeAt(i);
    if (quote !== 0) {
      if (c === quote) quote = 0;
    } else if (c === 34 || c === 39) {
      quote = c;
    } else if (c === 62) {
      return i;
    }
  }
  return -1;
}

/** 次のタグを返す。コメント・処理命令・DOCTYPE・CDATA は読み飛ばす */
function nextTag(xml: string, from: number): TagInfo | null {
  let i = from;
  for (;;) {
    const lt = xml.indexOf("<", i);
    if (lt < 0) return null;
    const c = xml.charCodeAt(lt + 1);
    if (c === 33) {
      // <!-- --> / <![CDATA[]]> / <!DOCTYPE>
      if (xml.startsWith("<!--", lt)) {
        const e = xml.indexOf("-->", lt + 4);
        i = e < 0 ? xml.length : e + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", lt)) {
        const e = xml.indexOf("]]>", lt + 9);
        i = e < 0 ? xml.length : e + 3;
        continue;
      }
      const gt = findTagEnd(xml, lt + 1);
      i = gt < 0 ? xml.length : gt + 1;
      continue;
    }
    if (c === 63) {
      const e = xml.indexOf("?>", lt + 2);
      i = e < 0 ? xml.length : e + 2;
      continue;
    }
    const gt = findTagEnd(xml, lt + 1);
    if (gt < 0) return null;
    let s = lt + 1;
    let close = false;
    if (xml.charCodeAt(s) === 47) {
      close = true;
      s++;
    }
    let e2 = s;
    while (e2 < gt) {
      const ch = xml.charCodeAt(e2);
      if (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 47) break;
      e2++;
    }
    let attrs = xml.slice(e2, gt);
    let self = false;
    if (attrs.endsWith("/")) {
      self = true;
      attrs = attrs.slice(0, -1);
    }
    return { start: lt, end: gt + 1, name: xml.slice(s, e2), attrs, close, self };
  }
}

const ATTR_RE_CACHE = new Map<string, RegExp>();

/** 属性値を取り出す。r と r:id のような紛らわしい組み合わせも取り違えない */
function getAttr(attrs: string, name: string): string | undefined {
  if (!attrs) return undefined;
  let re = ATTR_RE_CACHE.get(name);
  if (!re) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp("(?:^|[\\s])" + esc + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)')");
    ATTR_RE_CACHE.set(name, re);
  }
  const m = re.exec(attrs);
  if (!m) return undefined;
  return decodeXmlText(m[2] !== undefined ? m[2] : (m[3] ?? ""));
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

const ENTITY_RE = /&(?:#([xX][0-9A-Fa-f]+|[0-9]+)|([A-Za-z][A-Za-z0-9]*));/g;

/** XML のエンティティを戻す。CDATA の囲みと Excel の _x000D_ も落とす */
function decodeXmlText(raw: string): string {
  let s = raw;
  if (s.indexOf("<![CDATA[") >= 0) {
    s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  }
  if (s.indexOf("&") >= 0) {
    s = s.replace(ENTITY_RE, (m, num: string | undefined, name: string | undefined) => {
      if (num) {
        const hex = num[0] === "x" || num[0] === "X";
        const code = parseInt(hex ? num.slice(1) : num, hex ? 16 : 10);
        if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
          try {
            return String.fromCodePoint(code);
          } catch {
            return m;
          }
        }
        return m;
      }
      const hit = name ? NAMED_ENTITIES[name] : undefined;
      return hit === undefined ? m : hit;
    });
  }
  if (s.indexOf("_x00") >= 0) {
    // Excel は改行などの制御文字を _x000D_ の形で書き出す
    s = s.replace(/_x000D_/g, "").replace(/_x000A_/g, "\n");
  }
  return s;
}

/** 対応する終了タグの '<' の位置。入れ子も数える。見つからなければ -1 */
function findClose(xml: string, from: number, name: string, limit: number): number {
  let i = from;
  let depth = 0;
  while (i < limit) {
    const t = nextTag(xml, i);
    if (!t || t.start >= limit) return -1;
    if (localName(t.name) === name) {
      if (t.close) {
        if (depth === 0) return t.start;
        depth--;
      } else if (!t.self) {
        depth++;
      }
    }
    i = t.end;
  }
  return -1;
}

/**
 * 範囲内の <t> をすべて連結する。
 * リッチテキスト（<r><t>…</t></r> の分割）は連結し、
 * ふりがな（<rPh><t>…</t></rPh>）は本文ではないので飛ばす。
 */
function collectTexts(xml: string, from: number, to: number): string {
  let out = "";
  let i = from;
  let skip = 0;
  while (i < to) {
    const t = nextTag(xml, i);
    if (!t || t.start >= to) break;
    const ln = localName(t.name);
    if (ln === "rPh") {
      if (!t.self) {
        if (t.close) {
          if (skip > 0) skip--;
        } else {
          skip++;
        }
      }
      i = t.end;
      continue;
    }
    if (ln === "t" && !t.close && skip === 0) {
      if (t.self) {
        i = t.end;
        continue;
      }
      const close = findClose(xml, t.end, "t", to);
      const stop = close < 0 ? to : close;
      out += decodeXmlText(xml.slice(t.end, stop));
      i = stop;
      continue;
    }
    i = t.end;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * xlsx の読み取り
 * ------------------------------------------------------------------ */

export function decodeUtf8(bytes: Uint8Array): string {
  const s = new TextDecoder("utf-8").decode(bytes);
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** sharedStrings.xml → 文字列テーブル */
function parseSharedStrings(xml: string | null): string[] {
  const out: string[] = [];
  if (!xml) return out;
  let i = 0;
  while (i < xml.length) {
    const t = nextTag(xml, i);
    if (!t) break;
    if (localName(t.name) === "si" && !t.close) {
      if (t.self) {
        out.push("");
        i = t.end;
        continue;
      }
      const close = findClose(xml, t.end, "si", xml.length);
      const stop = close < 0 ? xml.length : close;
      out.push(collectTexts(xml, t.end, stop));
      i = stop;
      continue;
    }
    i = t.end;
  }
  return out;
}

/** "C12" → 列 index（0始まり）。列名が無ければ -1 */
function colOfRef(ref: string): number {
  let n = 0;
  let seen = false;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c >= 65 && c <= 90) {
      n = n * 26 + (c - 64);
      seen = true;
    } else if (c >= 97 && c <= 122) {
      n = n * 26 + (c - 96);
      seen = true;
    } else {
      break;
    }
  }
  return seen ? n - 1 : -1;
}

/** "C12" → 行番号（1始まり）。数字が無ければ -1 */
function rowOfRef(ref: string): number {
  const m = /(\d+)\s*$/.exec(ref);
  return m ? parseInt(m[1], 10) : -1;
}

/**
 * worksheet の sheetData を読む。
 * 行番号・列番号は r 属性から決めるので、空セルで列が飛んでいてもズレない。
 */
function parseSheetXml(xml: string, sst: string[]): Grid {
  const grid: Grid = [];
  let i = 0;
  let rowIdx = -1;
  let nextRow = 0;
  let nextCol = 0;
  while (i < xml.length) {
    const t = nextTag(xml, i);
    if (!t) break;
    const ln = localName(t.name);

    if (ln === "row") {
      if (t.close) {
        rowIdx = -1;
        i = t.end;
        continue;
      }
      const r = getAttr(t.attrs, "r");
      const parsed = r ? parseInt(r, 10) : NaN;
      rowIdx = Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : nextRow;
      nextRow = rowIdx + 1;
      nextCol = 0;
      if (!grid[rowIdx]) grid[rowIdx] = [];
      if (t.self) rowIdx = -1;
      i = t.end;
      continue;
    }

    if (ln === "c" && !t.close) {
      const ref = getAttr(t.attrs, "r") ?? "";
      let col = colOfRef(ref);
      if (col < 0) col = nextCol;
      nextCol = col + 1;
      let row = rowIdx;
      if (row < 0) {
        const rr = rowOfRef(ref);
        row = rr > 0 ? rr - 1 : nextRow;
      }
      if (!grid[row]) grid[row] = [];

      if (t.self) {
        i = t.end;
        continue;
      }
      const close = findClose(xml, t.end, "c", xml.length);
      const stop = close < 0 ? xml.length : close;
      const cell = readCell(xml, t.end, stop, getAttr(t.attrs, "t") ?? "n", sst);
      if (cell) grid[row]![col] = cell;
      i = stop;
      continue;
    }

    i = t.end;
  }
  return grid;
}

/** <c> の中身を1セルに変換する */
function readCell(xml: string, from: number, to: number, type: string, sst: string[]): Cell | null {
  if (type === "inlineStr") {
    const text = collectTexts(xml, from, to);
    return text === "" ? null : { text, numeric: false };
  }

  // <v> を探す（<f> の数式本体は読まない）
  let raw: string | null = null;
  let i = from;
  while (i < to) {
    const t = nextTag(xml, i);
    if (!t || t.start >= to) break;
    if (localName(t.name) === "v" && !t.close) {
      if (t.self) {
        raw = "";
        break;
      }
      const close = findClose(xml, t.end, "v", to);
      const stop = close < 0 ? to : close;
      raw = decodeXmlText(xml.slice(t.end, stop));
      break;
    }
    i = t.end;
  }
  if (raw === null) {
    // <v> が無い＝空セル。ただし <is> だけ持つ変則ケースは拾っておく
    const text = collectTexts(xml, from, to);
    return text === "" ? null : { text, numeric: false };
  }

  switch (type) {
    case "s": {
      const idx = parseInt(raw, 10);
      const text = Number.isFinite(idx) ? (sst[idx] ?? "") : "";
      return text === "" ? null : { text, numeric: false };
    }
    case "str":
    case "e":
    case "d":
      return raw === "" ? null : { text: raw, numeric: false };
    case "b":
      return { text: raw === "1" ? "TRUE" : "FALSE", numeric: false };
    default:
      return raw === "" ? null : { text: raw, numeric: true };
  }
}

/** OPC のパス解決（rels の Target → zip 内のパス） */
function resolvePart(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const out: string[] = [];
  for (const p of (base + target).split("/")) {
    if (p === "" || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

/** xlsx を開き、対象シートの表を返す */
export function readXlsx(bytes: Uint8Array): { grid: Grid; sheetName: string } {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new SheetReadError(
      "Excelファイルを開けませんでした。ファイルが壊れているか、.xlsx 形式ではない可能性があります。"
    );
  }
  const get = (p: string): string | null => {
    const f = files[p];
    return f ? decodeUtf8(f) : null;
  };

  const wb = get("xl/workbook.xml");
  if (!wb) {
    throw new SheetReadError(
      "Excelファイルの構造を読み取れませんでした（xl/workbook.xml が見つかりません）。テンプレートをそのまま使ってください。"
    );
  }

  // シート一覧
  const sheets: { name: string; rid: string }[] = [];
  let i = 0;
  while (i < wb.length) {
    const t = nextTag(wb, i);
    if (!t) break;
    if (localName(t.name) === "sheet" && !t.close) {
      sheets.push({
        name: getAttr(t.attrs, "name") ?? "",
        rid: getAttr(t.attrs, "r:id") ?? getAttr(t.attrs, "id") ?? "",
      });
    }
    i = t.end;
  }

  // rId → パス
  const rels: Record<string, string> = {};
  const relXml = get("xl/_rels/workbook.xml.rels");
  if (relXml) {
    let j = 0;
    while (j < relXml.length) {
      const t = nextTag(relXml, j);
      if (!t) break;
      if (localName(t.name) === "Relationship" && !t.close) {
        const id = getAttr(t.attrs, "Id");
        const target = getAttr(t.attrs, "Target");
        if (id && target) rels[id] = resolvePart("xl/", target);
      }
      j = t.end;
    }
  }

  // 「明細」シートを優先し、無ければ先頭シート
  const picked = sheets.find((s) => normalizeHeader(s.name) === "明細") ?? sheets[0];
  let sheetXml: string | null = null;
  if (picked && picked.rid && rels[picked.rid]) sheetXml = get(rels[picked.rid]);
  if (!sheetXml) sheetXml = get("xl/worksheets/sheet1.xml");
  if (!sheetXml) {
    throw new SheetReadError("Excelファイルの中にワークシートが見つかりませんでした。");
  }

  const sst = parseSharedStrings(get("xl/sharedStrings.xml"));
  return { grid: parseSheetXml(sheetXml, sst), sheetName: picked?.name ?? "" };
}

/* ------------------------------------------------------------------ *
 * CSV の読み取り
 * ------------------------------------------------------------------ */

/**
 * BOM があれば UTF-8。無ければまず UTF-8 で厳密デコードし、
 * 失敗したら Shift_JIS で読み直す（日本の Excel が吐く CSV は Shift_JIS が多いため）。
 */
export function decodeCsvBytes(bytes: Uint8Array): { text: string; encoding: "utf-8" | "shift_jis" } {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), encoding: "utf-8" };
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    try {
      return { text: new TextDecoder("shift_jis").decode(bytes), encoding: "shift_jis" };
    } catch {
      // Shift_JIS 非対応の実行環境（ICU を削った Node など）向けの最後の手段
      return { text: new TextDecoder("utf-8").decode(bytes), encoding: "utf-8" };
    }
  }
}

/** RFC4180 準拠（"" エスケープ・フィールド内改行に対応） */
export function parseCsv(text: string): { grid: Grid; lines: number[] } {
  const grid: Grid = [];
  const lines: number[] = [];
  let row: Cell[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let recordStart = 1;

  const pushField = () => {
    row.push(field === "" ? EMPTY_CELL : { text: field, numeric: false });
    field = "";
  };
  const pushRow = () => {
    pushField();
    grid.push(row);
    lines.push(recordStart);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      line++;
      pushRow();
      recordStart = line;
      continue;
    }
    if (ch === "\n") {
      line++;
      pushRow();
      recordStart = line;
      continue;
    }
    field += ch;
  }
  if (field !== "" || row.length > 0) pushRow();
  return { grid, lines };
}

/* ------------------------------------------------------------------ *
 * 値の正規化
 * ------------------------------------------------------------------ */

/** 全角英数記号 → 半角、全角スペース → 半角スペース */
export function toHalfWidth(s: string): string {
  return s
    .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, " ");
}

/** 見出し名の照合用。空白と括弧を落とす */
export function normalizeHeader(s: string): string {
  return toHalfWidth(s)
    .replace(/[\s\u3000]+/g, "")
    .replace(/[()［］\[\]【】]/g, "")
    .trim();
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function toIso(y: number, m: number, d: number): string | null {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (y < 1900 || y > 2999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Excel のシリアル値 → YYYY-MM-DD（1900年日付システム）
 *
 * Excel は 1900年を（実際には平年なのに）うるう年として扱うため、
 * シリアル 61（1900-03-01）以降は実日数より1日多い。ここで1を引いて補正する。
 */
export function serialToIso(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  let days = Math.floor(serial);
  if (days <= 0 || days > 401768) return null; // 401768 ≒ 3000-01-01
  if (days >= 61) days -= 1;
  const ms = Date.UTC(1899, 11, 31) + days * 86400000;
  const dt = new Date(ms);
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** 日付セル → YYYY-MM-DD。読めなければ null */
export function parseDateCell(cell: Cell): string | null {
  if (cell.numeric) {
    const n = Number(cell.text);
    return Number.isFinite(n) ? serialToIso(n) : null;
  }
  const s = toHalfWidth(cell.text).trim();
  if (!s) return null;

  let m = /^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/.exec(s);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));

  if (/^\d{5}$/.test(s)) {
    const n = Number(s);
    if (n >= 20000 && n <= 60000) return serialToIso(n);
  }
  return null;
}

/** 数値セル → number。読めなければ null */
export function parseNumberCell(raw: string): number | null {
  let s = toHalfWidth(raw).trim();
  if (!s) return null;
  s = s.replace(/[\s,]/g, "").replace(/[¥￥$]/g, "").replace(/円/g, "");
  if (!s) return null;
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function cellAt(grid: Grid, r: number, c: number): Cell {
  const row = grid[r];
  if (!row) return EMPTY_CELL;
  return row[c] ?? EMPTY_CELL;
}

export function rowIsEmpty(row: Cell[] | undefined): boolean {
  if (!row) return true;
  for (const c of row) {
    if (c && c.text.trim() !== "") return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * 見出し行の探索
 * ------------------------------------------------------------------ */

export interface HeaderMatch {
  /** 見出し行の行番号（0 始まり） */
  index: number;
  /** 正規化した見出し文字列 → 列番号 */
  map: Map<string, number>;
  /** 必須列がいくつ当たったか */
  hits: number;
}

/**
 * 先頭 scanRows 行から、必須列が最も多く一致する行を見出しとみなす。
 *
 * 表の上に表題や注記が数行あっても拾えるようにするための走査。
 * columns に無い見出しは黙って無視する（余計な列があっても読める）。
 */
export function findHeaderRow(
  grid: Grid,
  columns: readonly string[],
  required: readonly string[],
  scanRows: number,
): HeaderMatch | null {
  const known = new Set<string>(columns.map((c) => normalizeHeader(c)));
  const req = new Set<string>(required.map((c) => normalizeHeader(c)));
  let best: HeaderMatch | null = null;
  const scanTo = Math.min(grid.length, scanRows);

  for (let r = 0; r < scanTo; r++) {
    const row = grid[r];
    if (!row) continue;
    const map = new Map<string, number>();
    let hits = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell) continue;
      const key = normalizeHeader(cell.text);
      if (!key || !known.has(key) || map.has(key)) continue;
      map.set(key, c);
      if (req.has(key)) hits++;
    }
    if (hits > 0 && (!best || hits > best.hits)) best = { index: r, map, hits };
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * 読み取りの指摘（全ツール共通）
 * ------------------------------------------------------------------ */

/**
 * 入力を読んだときに見つけた問題。
 *
 * ⚠ level が "error" の行は結果に混ぜないこと。
 *    読めなかった値を 0 や空文字で埋めて通すと、利用者は間違いに気づけない。
 *    落としたうえで「◯行を載せていません」と画面に明示する。
 */
export interface ToolIssue {
  /** 元ファイル上の行番号。ファイル全体の問題なら 0 */
  line: number;
  /** 列見出し（分かる場合） */
  column?: string;
  level: "error" | "warn";
  message: string;
}
