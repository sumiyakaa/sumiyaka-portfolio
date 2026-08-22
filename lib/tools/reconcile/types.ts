/**
 * 入金消込 突合ツール — 共通の型契約
 *
 * ⚠ この層は「ブラウザ内で完結する」ことが設計の前提。
 *    ここに置く関数は一切ネットワークへ出ない（fetch / XMLHttpRequest / sendBeacon を書かない）。
 *
 * ⚠ 汎用版は「整った入力」しか受け付けない。
 *    請求台帳は配布テンプレートの列名だけを読む。
 *    銀行明細は「銀行が出したそのままの形」を読むが、見出し行が無いものは推測しない。
 */

import type { ToolIssue } from "../_shared/sheetReader";

/** 読み取り・検証で見つかった指摘（全ツール共通の型をそのまま使う） */
export type ParseIssue = ToolIssue;

/* ================================================================
 * 1. 請求台帳（配布テンプレート）
 * ================================================================ */

/** 台帳1行 ＝ 請求1件 */
export interface InvoiceEntry {
  /** 請求番号。台帳の中で一意であること */
  invoiceNo: string;
  /** 請求日 YYYY-MM-DD（空可） */
  issueDate: string;
  /** 支払期日 YYYY-MM-DD（空可。空なら入金日の許容判定をしない） */
  dueDate: string;
  /** 取引先名（表示用。漢字でよい） */
  clientName: string;
  /** 振込名義（カナ）。空なら clientName から照合キーを作る */
  payerName: string;
  /** 請求額（税込・円・整数） */
  amount: number;
  /** 備考（出力CSVへそのまま通す） */
  note: string;
  /** 照合キー ＝ normalizeMatchKey(payerName || clientName) */
  key: string;
  /** 元ファイル上の行番号（1始まり・見出し行を含む） */
  sourceLine: number;
}

/* ================================================================
 * 2. 銀行の入出金明細
 * ================================================================ */

export type StatementDirection = "credit" | "debit";

/** 明細1行 */
export interface StatementEntry {
  /** 取引日 YYYY-MM-DD */
  date: string;
  /** 摘要（当たった摘要列を左から連結した表示用の文字列） */
  description: string;
  /** 摘要から取り出した振込依頼人名（照合キーを作る前の文字列） */
  payerRaw: string;
  /** 照合キー ＝ normalizeMatchKey(payerRaw) */
  key: string;
  /** 金額（円・整数・常に正）。入金・出金の別は direction が持つ */
  amount: number;
  direction: StatementDirection;
  /** 元ファイル上の行番号 */
  sourceLine: number;
}

/** 明細CSVの読み取りで当てた列。画面の「読めました」表示に使う */
export interface StatementLayout {
  /** 推定した金融機関名。**表示だけに使い、読み取りロジックには影響させない** */
  guessedBank: string;
  /** 金額の持ち方 */
  amountShape: "twoColumn" | "signed" | "kindColumn";
  dateHeader: string;
  descHeaders: string[];
  creditHeader: string;
  debitHeader: string;
  kindHeader: string;
  encoding: "utf-8" | "shift_jis";
  /** 対象外にした出金行の数 */
  skippedDebits: number;
}

/* ================================================================
 * 3. 読み取り結果
 * ================================================================ */

export interface LedgerParseResult {
  entries: InvoiceEntry[];
  issues: ParseIssue[];
  sourceName: string;
}

export interface StatementParseResult {
  entries: StatementEntry[];
  issues: ParseIssue[];
  sourceName: string;
  layout: StatementLayout | null;
}

/* ================================================================
 * 4. 突合の結果
 * ================================================================ */

/** 画面の3色。これ以外の区分を増やさない */
export type MatchStatus = "matched" | "review" | "unpaid";

/** なぜその判定になったのか。画面と出力CSVに1行で出す */
export type MatchReason =
  /** 名義と金額が完全に一致した */
  | "exact"
  /** 振込手数料とみられる差額があるが、範囲内で一致した */
  | "feeDeducted"
  /** 複数の請求が1本の入金にまとまっている */
  | "combined"
  /** 1件の請求が複数回に分けて入金されている */
  | "split"
  /** 入金が請求に足りない */
  | "short"
  /** 入金が請求を超えている */
  | "over"
  /** 名義が途中で切れている（前方一致） */
  | "prefix"
  /** 同じ条件の候補が複数あり、機械では決められない */
  | "ambiguous"
  /** 名義も金額も合うが、入金日が許容範囲の外にある */
  | "dateOutOfRange"
  /** どの請求にも結びつかない入金 */
  | "orphan"
  /** 入金が見つからない（未入金） */
  | "none";

/** 確度。スコアの数値ではなく3段階で持つ */
export type MatchConfidence = "exact" | "likely" | "none";

/**
 * 突合の1グループ。
 * 単独一致なら invoices 1件・payments 1件。
 * 合算入金なら invoices 複数・payments 1件。分割入金なら invoices 1件・payments 複数。
 * 未入金なら payments 0件。引き当たらない入金なら invoices 0件。
 */
export interface MatchRow {
  /** グループ番号（1始まり）。出力CSVで複数行を束ねるのに使う */
  group: number;
  status: MatchStatus;
  reason: MatchReason;
  confidence: MatchConfidence;
  invoices: InvoiceEntry[];
  payments: StatementEntry[];
  /** 請求額の合計 */
  invoiceTotal: number;
  /** 入金額の合計 */
  paymentTotal: number;
  /** invoiceTotal - paymentTotal。プラスなら不足、マイナスなら過入金 */
  diff: number;
  /** 画面と出力CSVに出す一行説明（日本語・完成文） */
  note: string;
}

export interface MatchResult {
  /** 表示順に並んだ全グループ */
  rows: MatchRow[];
  counts: { matched: number; review: number; unpaid: number };
  /** 消込できた金額（matched の invoiceTotal 合計） */
  clearedAmount: number;
  /** 未入金の金額（unpaid の invoiceTotal 合計） */
  unpaidAmount: number;
  /** 突合の対象になった請求件数・入金件数 */
  invoiceCount: number;
  paymentCount: number;
}

/* ================================================================
 * 5. オプション
 * ================================================================ */

export interface MatchOptions {
  /** 振込手数料として許容する差額の上限（円）。0 で無効 */
  feeTolerance: number;
  /** 手数料差引を「自動一致」に含めるか。false なら「要確認」へ回す */
  feeAsMatched: boolean;
  /** 支払期日より何日前までの入金を同じ請求とみなすか */
  daysBefore: number;
  /** 支払期日より何日後までの入金を同じ請求とみなすか */
  daysAfter: number;
  /** 合算入金（1入金:複数請求）を探すか */
  findCombined: boolean;
  /** 分割入金（複数入金:1請求）を探すか */
  findSplit: boolean;
}

export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
  feeTolerance: 880,
  feeAsMatched: true,
  daysBefore: 60,
  daysAfter: 90,
  findCombined: true,
  findSplit: true,
};

/** 画面のプルダウンに出す手数料上限の選択肢（円） */
export const FEE_TOLERANCE_CHOICES = [0, 330, 550, 880, 990] as const;

/* ================================================================
 * 6. 列定義と上限
 * ================================================================ */

/** 請求台帳テンプレートの列見出し（この順に並ぶ。読み取りは見出し名で照合する） */
export const LEDGER_COLUMNS = [
  "請求番号",
  "請求日",
  "支払期日",
  "取引先名",
  "振込名義",
  "請求額",
  "備考",
] as const;

export type LedgerColumn = (typeof LEDGER_COLUMNS)[number];

/** これが欠けている台帳は読み取りエラーにする */
export const LEDGER_REQUIRED_COLUMNS = [
  "請求番号",
  "取引先名",
  "請求額",
] as const satisfies readonly LedgerColumn[];

export const LEDGER_HEADER_SCAN_ROWS = 10;
export const MAX_LEDGER_ROWS = 3000;

/**
 * 銀行入出金明細の見出し別名。
 *
 * ⚠ 銀行ごとに分岐を書かない。ここに語を足すだけで対応銀行が増える設計にする。
 * ⚠ desc に「メモ」「備考」を入れないこと（利用者の自由記入欄が依頼人名を上書きする）。
 */
export const STATEMENT_ALIASES = {
  date: [
    "日付", "取引日", "お取引日", "お取り引き日", "年月日", "取扱日",
    "計上日", "勘定日", "受付日", "取引年月日", "お取引年月日",
  ],
  /** 入金列（2列方式） */
  credit: [
    "預かり金額", "お預り金額", "お預かり金額", "預入金額", "お預け入れ額",
    "お預入れ", "預入", "入金額", "入金金額", "受取額", "入金(円)", "入金",
  ],
  /** 出金列（2列方式） */
  debit: [
    "支払い金額", "お支払金額", "お支払い金額", "支払金額", "支払額",
    "出金額", "出金金額", "お引き出し額", "お引出し", "引出", "出金(円)", "出金",
  ],
  /** 正負1列方式・区分列方式で使う金額列 */
  signed: ["入出金(円)", "入出金金額", "入出金額", "取引金額", "金額"],
  /** 区分列方式の区分（受入／払出 など） */
  kind: ["受払区分", "入払区分", "入出金区分", "取引区分", "区分"],
  /** 摘要（左から順に連結。いちばん右の空でない列を依頼人名として採る） */
  desc: [
    "摘要", "摘要内容", "お取り扱い内容", "お取扱内容", "お取引内容",
    "取引内容", "入出金先内容", "内容", "詳細1", "詳細2", "取引明細",
  ],
  balance: ["差引残高", "残高", "残高(円)", "差し引き残高", "取引後残高", "差引金額"],
} as const;

/** findHeaderRow へ渡す全見出し語（別名をすべて平らに並べたもの） */
export const STATEMENT_COLUMNS: readonly string[] = [
  ...STATEMENT_ALIASES.date,
  ...STATEMENT_ALIASES.credit,
  ...STATEMENT_ALIASES.debit,
  ...STATEMENT_ALIASES.signed,
  ...STATEMENT_ALIASES.kind,
  ...STATEMENT_ALIASES.desc,
  ...STATEMENT_ALIASES.balance,
];

/** 明細の必須＝日付だけ。金額列の当て方は3通りあるので parse 側で判定する */
export const STATEMENT_REQUIRED_COLUMNS: readonly string[] = [
  ...STATEMENT_ALIASES.date,
];

export const STATEMENT_HEADER_SCAN_ROWS = 12;
export const MAX_STATEMENT_ROWS = 5000;

/* ================================================================
 * 7. 照合の定数
 * ================================================================ */

/** 合算入金の全探索を許す件数の上限（2^n の n）。超えたら貪欲法1通りだけ試す */
export const MAX_COMBINE_BITS = 12;

/** 前方一致を許す最小の文字数。これ未満だと短い社名で誤爆する */
export const MIN_PREFIX_LEN = 6;

/* ================================================================
 * 8. 表示の語（画面と出力CSVで同じ文字列を使う＝二重管理しない）
 * ================================================================ */

export const STATUS_LABELS: Record<MatchStatus, string> = {
  matched: "自動一致",
  review: "要確認",
  unpaid: "未入金",
};

export const REASON_LABELS: Record<MatchReason, string> = {
  exact: "完全一致",
  feeDeducted: "手数料差引",
  combined: "合算入金",
  split: "分割入金",
  short: "入金不足",
  over: "過入金",
  prefix: "名義が前方一致",
  ambiguous: "候補が複数",
  dateOutOfRange: "入金日が範囲外",
  orphan: "請求が見つからない",
  none: "入金なし",
};

/**
 * "2026-07-31" → "2026/07/31"。読めなければそのまま返す。
 *
 * ⚠ 整形は本来 `_shared/format` に寄せる約束だが、そこに YYYY/MM/DD 形式が無い。
 *    `_shared` は5体が並走している間は触らない決まりなので、ここに置いている
 *    （他ツールでも要るようなら `_shared/format` へ移すのが正しい）。
 */
export function formatIsoSlash(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : iso;
}

/** 出力CSVの列（この順に出す） */
export const RESULT_COLUMNS = [
  "グループ",
  "状態",
  "判定理由",
  "請求番号",
  "請求日",
  "支払期日",
  "取引先名",
  "請求額",
  "入金日",
  "摘要",
  "入金額",
  "差額",
  "備考",
] as const;
