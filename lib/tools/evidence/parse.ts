/**
 * 電帳法ファイル名 一括リネーム — 台帳の読み取り（.xlsx / .csv）
 *
 * ⚠ この層は一切ネットワークへ出ない。fetch / XMLHttpRequest / WebSocket を使わない。
 *    受け取るのは File から読んだバイト列だけで、結果は呼び出し元へ返すのみ。
 *
 * ⚠ npm の `xlsx` パッケージは使わない（公開版に既知の脆弱性が残っているため）。
 *    zip の展開だけ fflate を使い、XML は DOM 非依存の自前スキャナで読む
 *    （`_shared/sheetReader` に実装済み。Node でもブラウザでも同じコードが動く）。
 *
 * ⚠ 汎用版は「整った入力」しか受け付けない。
 *    崩れた台帳は推測で直さず、素直に ParseIssue（error）として返す。
 *
 * ⚠ **error のある行は結果に混ぜない。** 読めなかった値を 0 や空文字で埋めて通すと、
 *    利用者は間違いに気づけないまま証憑に誤った名前が付く。落としたうえで指摘を出す。
 *
 * ⚠ 和暦は読まない。国税庁「電子帳簿保存法一問一答【電子取引関係】」問50 に
 *    「混在は抽出機能の妨げとなる」とあり、T-03 は西暦へ統一する方針のため、
 *    和暦で書かれたセルは「読み取れません」として error にする（これが正しい挙動）。
 */

import {
  EMPTY_CELL,
  SheetReadError,
  cellAt,
  decodeCsvBytes,
  findHeaderRow,
  isZip,
  normalizeHeader,
  parseCsv,
  parseDateCell,
  parseNumberCell,
  readXlsx,
  rowIsEmpty,
  toHalfWidth,
} from "../_shared/sheetReader";
import type { Grid } from "../_shared/sheetReader";
import {
  LEDGER_COLUMNS,
  LEDGER_HEADER_SCAN_ROWS,
  LEDGER_REQUIRED_COLUMNS,
  MAX_LEDGER_ROWS,
} from "./types";
import type { LedgerRow, ParseIssue, ParseResult } from "./types";

/**
 * 取引金額の上限（絶対値）。これ以上は「13桁以上」＝入力ミスとみなす。
 * 1,000,000,000,000（1兆）がちょうど13桁。
 */
const AMOUNT_LIMIT = 1e12;

/**
 * 台帳内の重複判定に使うキー。
 *
 * ファイル名そのもの（パスを含む場合はパスごと）で見る。
 * `2024/01/請求書.pdf` と `2024/02/請求書.pdf` は別のファイルなので重複ではない。
 * 大小文字・全角半角・パス区切りの差だけの行は、同じファイルを指しているので重複とみなす。
 */
function duplicateKey(value: string): string {
  return toHalfWidth(value.normalize("NFC"))
    .replace(/\\/g, "/")
    .trim()
    .toLowerCase();
}

/* ------------------------------------------------------------------ *
 * 本体
 * ------------------------------------------------------------------ */

export async function parseLedger(input: { name: string; bytes: Uint8Array }): Promise<ParseResult> {
  const sourceName = input.name;
  const issues: ParseIssue[] = [];
  const rows: LedgerRow[] = [];
  const fail = (message: string): ParseResult => {
    issues.push({ line: 0, level: "error", message });
    return { rows: [], issues, sourceName };
  };

  const bytes = input.bytes;
  if (!bytes || bytes.length === 0) return fail("ファイルが空です。");

  let grid: Grid;
  let lineOf: (rowIndex: number) => number;

  if (isZip(bytes)) {
    try {
      grid = readXlsx(bytes).grid;
    } catch (e) {
      return fail(e instanceof SheetReadError ? e.message : "Excelファイルを読み取れませんでした。");
    }
    // xlsx は行の r 属性そのものが Excel 上の行番号
    lineOf = (i) => i + 1;
  } else if (/\.xls$/i.test(sourceName)) {
    return fail(
      "旧形式の .xls には対応していません。Excel で「名前を付けて保存」→ .xlsx か CSV に変換してからお試しください。"
    );
  } else if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    return fail(
      "旧形式の Excel ファイル（.xls）のようです。.xlsx か CSV に変換してからお試しください。"
    );
  } else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return fail("PDF は読み取れません。台帳の .xlsx か CSV をお使いください。");
  } else {
    const decoded = decodeCsvBytes(bytes);
    const csv = parseCsv(decoded.text);
    grid = csv.grid;
    lineOf = (i) => csv.lines[i] ?? i + 1;
  }

  if (grid.length === 0 || grid.every((r) => rowIsEmpty(r))) {
    return fail("シートが空です。テンプレートに沿って入力してから読み込ませてください。");
  }

  /* 見出し行を探す（先頭10行を走査するので、注記行が上にあっても・列の順序が違っても読める） */
  const header = findHeaderRow(
    grid,
    LEDGER_COLUMNS,
    LEDGER_REQUIRED_COLUMNS,
    LEDGER_HEADER_SCAN_ROWS
  );
  if (!header) {
    return fail(
      `見出し行が見つかりませんでした。「${LEDGER_COLUMNS.join("／")}」の見出しの行を置いてください。テンプレートの見出しをそのままお使いください。`
    );
  }

  const headerLine = lineOf(header.index);
  const col = (name: string): number => header.map.get(normalizeHeader(name)) ?? -1;

  const missing = LEDGER_REQUIRED_COLUMNS.filter((c) => col(c) < 0);
  if (missing.length > 0) {
    for (const name of missing) {
      issues.push({
        line: 0,
        column: name,
        level: "error",
        message: `『${name}』の列が見つかりません。テンプレートの見出しをそのままお使いください。`,
      });
    }
    return { rows: [], issues, sourceName };
  }

  /* 行数の上限は、読み取る前に空行を除いた実データの行数で判定する */
  let dataRows = 0;
  for (let r = header.index + 1; r < grid.length; r++) {
    if (!rowIsEmpty(grid[r])) dataRows++;
  }
  if (dataRows === 0) {
    issues.push({
      line: headerLine,
      level: "error",
      message: "見出し行の下に台帳の行がありません。1行に1件で入力してください。",
    });
    return { rows: [], issues, sourceName };
  }
  if (dataRows > MAX_LEDGER_ROWS) {
    return fail(`台帳が${MAX_LEDGER_ROWS}行を超えています。分けて読み込んでください。`);
  }

  const cName = col("元のファイル名");
  const cDate = col("取引年月日");
  const cVendor = col("取引先");
  const cAmount = col("取引金額");
  const cDocType = col("書類の種類");
  const cNote = col("備考");

  const text = (r: number, c: number): string => (c < 0 ? "" : cellAt(grid, r, c).text.trim());

  /** 重複判定用。採用した行だけを登録する（落とした行と重複扱いにしない） */
  const seen = new Map<string, number>();

  for (let r = header.index + 1; r < grid.length; r++) {
    if (rowIsEmpty(grid[r])) continue; // 空行は指摘を出さずに飛ばす
    const line = lineOf(r);
    let dropped = false;

    /* 元のファイル名 */
    const originalName = text(r, cName);
    if (!originalName) {
      issues.push({
        line,
        column: "元のファイル名",
        level: "error",
        message: `元のファイル名が空です。`,
      });
      dropped = true;
    }

    /* 取引年月日 */
    const dateCell = cDate < 0 ? EMPTY_CELL : cellAt(grid, r, cDate);
    const iso = dateCell.text.trim() === "" ? null : parseDateCell(dateCell);
    if (!iso) {
      issues.push({
        line,
        column: "取引年月日",
        level: "error",
        message: `取引年月日を読み取れません（2021/1/31 の形でご記入ください）。`,
      });
      dropped = true;
    }

    /* 取引先 */
    const vendor = text(r, cVendor);
    if (!vendor) {
      issues.push({
        line,
        column: "取引先",
        level: "error",
        message: `取引先が空です。`,
      });
      dropped = true;
    }

    /* 取引金額 */
    const amountRaw = text(r, cAmount);
    const amount = parseNumberCell(amountRaw);
    if (amount === null) {
      issues.push({
        line,
        column: "取引金額",
        level: "error",
        message: `取引金額を読み取れません。`,
      });
      dropped = true;
    } else if (!Number.isInteger(amount)) {
      issues.push({
        line,
        column: "取引金額",
        level: "error",
        message: `取引金額に小数が含まれています。円単位の整数でご記入ください。`,
      });
      dropped = true;
    } else if (Math.abs(amount) >= AMOUNT_LIMIT) {
      issues.push({
        line,
        column: "取引金額",
        level: "error",
        message: `取引金額の桁が想定を超えています。`,
      });
      dropped = true;
    }

    /* 台帳内での重複（2件目以降を落とす） */
    if (!dropped) {
      const key = duplicateKey(originalName);
      const first = seen.get(key);
      if (first !== undefined) {
        issues.push({
          line,
          column: "元のファイル名",
          level: "error",
          message: `元のファイル名『${originalName}』が${first}行目と重複しています。`,
        });
        dropped = true;
      } else {
        seen.set(key, line);
      }
    }

    if (dropped) continue;

    rows.push({
      originalName,
      date: iso as string,
      vendor,
      amount: amount as number,
      docType: text(r, cDocType),
      note: text(r, cNote),
      sourceLine: line,
    });
  }

  return { rows, issues, sourceName };
}
