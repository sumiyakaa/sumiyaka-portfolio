/**
 * 請求書PDF一括作成ツール — 共通の型契約
 *
 * ⚠ この層は「ブラウザ内で完結する」ことが設計の前提（設計計画書 §9-2 でB確定）。
 *    ここに置く関数は一切ネットワークへ出ない。fetch はフォント資産の取得のみ許可。
 *
 * ⚠ 汎用版は「整った入力」しか受け付けない（設計計画書 §9-3-A）。
 *    ゆえに入力はテンプレート形式の1シートに限定し、崩れた台帳は素直にエラーにする。
 */

import type { ToolIssue } from "../_shared/sheetReader";

/** 適用税率。0 は不課税・非課税をまとめて扱う */
export type TaxRate = 10 | 8 | 0;

/** 消費税の端数処理。税率ごとに1回だけ適用する */
export type Rounding = "floor" | "round" | "ceil";

/** 台帳1行 ＝ 明細1行 */
export interface LedgerRow {
  /** 請求書番号。同じ番号の行が1枚の請求書にまとまる */
  invoiceNo: string;
  /** 請求日 YYYY-MM-DD */
  issueDate: string;
  /** 支払期日 YYYY-MM-DD（空可） */
  dueDate: string;
  /** 取引先名 */
  clientName: string;
  /** 敬称（御中／様） */
  clientHonorific: string;
  /** 取引先 郵便番号（空可） */
  clientZip: string;
  /** 取引先 住所（空可） */
  clientAddress: string;
  /** 件名（空可） */
  subject: string;
  /** 品目 */
  itemName: string;
  quantity: number;
  /** 単位（式・個・時間 など。空可） */
  unit: string;
  unitPrice: number;
  taxRate: TaxRate;
  /** 軽減税率の対象品目である旨。8% なら自動で true */
  reduced: boolean;
  /** 明細の備考（空可） */
  note: string;
  /** 元ファイル上の行番号（1始まり・ヘッダー行を含む）。エラー表示に使う */
  sourceLine: number;
}

/** 読み取り・検証で見つかった指摘 */
/** 全ツール共通の型を使う（新規ツールは ToolIssue を直接使ってよい） */
export type ParseIssue = ToolIssue;

export interface ParseResult {
  rows: LedgerRow[];
  issues: ParseIssue[];
  /** 読み込んだファイル名 */
  sourceName: string;
}

/** 明細（計算済み） */
export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** 数量 × 単価（税抜） */
  amount: number;
  taxRate: TaxRate;
  reduced: boolean;
  note: string;
}

/** 税率ごとに区分した集計（適格請求書の記載要件 4・5） */
export interface TaxLine {
  rate: TaxRate;
  /** 税率ごとに区分して合計した対価の額（税抜） */
  taxable: number;
  /** 税率ごとに区分した消費税額等 */
  tax: number;
  reduced: boolean;
}

/** 1枚の請求書 */
export interface InvoiceDoc {
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  client: {
    name: string;
    honorific: string;
    zip: string;
    address: string;
  };
  subject: string;
  items: InvoiceItem[];
  taxLines: TaxLine[];
  /** 税抜合計 */
  subtotal: number;
  /** 消費税合計 */
  taxTotal: number;
  /** 税込合計（ご請求金額） */
  total: number;
  /** 明細の備考をまとめたもの */
  notes: string[];
}

/** 振込先 */
export interface BankAccount {
  name: string;
  branch: string;
  /** 普通／当座 など */
  type: string;
  number: string;
  holder: string;
}

/** 発行者（自社）情報。localStorage に保存され、端末の外へは出ない */
export interface Issuer {
  companyName: string;
  /** 適格請求書発行事業者の登録番号（T + 13桁） */
  registrationNo: string;
  zip: string;
  address: string;
  tel: string;
  email: string;
  personName: string;
  bank: BankAccount;
  /** 末尾の但し書き（振込手数料の負担など） */
  closingNote: string;
  /** 角印・ロゴ（data URL）。ブラウザ内でPDFへ埋め込むだけ */
  sealDataUrl: string;
  logoDataUrl: string;
}

export interface CalcOptions {
  rounding: Rounding;
}

/** 適格請求書の記載要件チェック結果 */
export interface ComplianceCheck {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
}

export const DEFAULT_CALC_OPTIONS: CalcOptions = { rounding: "floor" };

/** テンプレートの列見出し（この順に並ぶ。読み取りは見出し名で照合する） */
export const LEDGER_COLUMNS = [
  "請求書番号",
  "請求日",
  "支払期日",
  "取引先名",
  "敬称",
  "郵便番号",
  "住所",
  "件名",
  "品目",
  "数量",
  "単位",
  "単価",
  "税率",
  "備考",
] as const;

export type LedgerColumn = (typeof LEDGER_COLUMNS)[number];

/**
 * 必須列。これが欠けている台帳は読み取りエラーにする。
 * （値が空の行は許容する＝2行目以降で請求日や取引先名を省く書き方が一般的なため）
 */
export const LEDGER_REQUIRED_COLUMNS = [
  "請求書番号",
  "請求日",
  "取引先名",
  "品目",
  "数量",
  "単価",
] as const satisfies readonly LedgerColumn[];

/** 見出し行を探す範囲（先頭から何行目までを走査するか） */
export const LEDGER_HEADER_SCAN_ROWS = 10;

/** 台帳1ファイルあたりの明細行の上限。超えたらテンプレートの想定外としてエラーにする */
export const MAX_LEDGER_ROWS = 2000;
