/**
 * 入金消込 突合ツール — サンプルデータ
 *
 * ⚠ 取引先・氏名・金額はすべて **架空** です。実在の企業・個人とは関係ありません。
 *
 * ページを開いた瞬間から3色（自動一致／要確認／未入金）が並んでいる状態を作るためのもの。
 * 主要な区分がすべて1画面に出るよう組んである。
 *   自動一致 … 完全一致2件・手数料差引2件
 *   要確認 …… 合算入金・分割入金・過入金・名義の前方一致・請求の無い入金
 *   未入金 …… 2件（うち1件は振込名義が空＝warn の見本）
 *
 * ⚠ 照合キーは normalizeMatchKey で作る。手で書いた文字列を持たない
 *    （名寄せの規則を変えたときにサンプルだけ古いまま残るのを防ぐ）。
 */

import { extractPayer, normalizeMatchKey } from "./normalize";
import type {
  InvoiceEntry,
  ParseIssue,
  StatementEntry,
  StatementLayout,
} from "./types";

export const SAMPLE_LEDGER_NAME = "請求台帳サンプル.xlsx";
export const SAMPLE_STATEMENT_NAME = "入出金明細サンプル.csv";

/* ------------------------------------------------------------------ *
 * 請求台帳（12件）
 * ------------------------------------------------------------------ */

interface SampleInvoice {
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  payerName: string;
  amount: number;
  note?: string;
}

const LEDGER_SOURCE: SampleInvoice[] = [
  {
    invoiceNo: "INV-2026-101",
    issueDate: "2026-07-05",
    dueDate: "2026-07-31",
    clientName: "株式会社ミナトデザイン",
    payerName: "ｶ)ﾐﾅﾄﾃﾞｻﾞｲﾝ",
    amount: 148500,
    note: "6月分 保守運用",
  },
  {
    invoiceNo: "INV-2026-102",
    issueDate: "2026-07-06",
    dueDate: "2026-07-31",
    clientName: "合同会社あおば工房",
    payerName: "ﾄﾞ)ｱｵﾊﾞｺｳﾎﾞｳ",
    amount: 135300,
  },
  {
    invoiceNo: "INV-2026-103",
    issueDate: "2026-07-08",
    dueDate: "2026-07-31",
    clientName: "有限会社みどり不動産",
    payerName: "ﾕ)ﾐﾄﾞﾘﾌﾄﾞｳｻﾝ",
    amount: 528000,
  },
  {
    invoiceNo: "INV-2026-104",
    issueDate: "2026-07-10",
    dueDate: "2026-08-31",
    clientName: "さくら歯科クリニック",
    payerName: "ｻｸﾗｼｶｸﾘﾆﾂｸ",
    amount: 396000,
    note: "内装撮影一式",
  },
  {
    invoiceNo: "INV-2026-105",
    issueDate: "2026-07-12",
    dueDate: "2026-07-31",
    clientName: "株式会社ヒノデ物産",
    payerName: "ｶ)ﾋﾉﾃﾞﾌﾞﾂｻﾝ",
    amount: 66000,
  },
  {
    invoiceNo: "INV-2026-106",
    issueDate: "2026-07-15",
    dueDate: "2026-07-31",
    clientName: "株式会社ヒノデ物産",
    payerName: "ｶ)ﾋﾉﾃﾞﾌﾞﾂｻﾝ",
    amount: 88000,
  },
  {
    invoiceNo: "INV-2026-107",
    issueDate: "2026-07-18",
    dueDate: "2026-07-31",
    clientName: "株式会社ヒノデ物産",
    payerName: "ｶ)ﾋﾉﾃﾞﾌﾞﾂｻﾝ",
    amount: 44000,
    note: "追加分",
  },
  {
    invoiceNo: "INV-2026-108",
    issueDate: "2026-07-20",
    dueDate: "2026-08-20",
    clientName: "立花写真事務所",
    payerName: "ﾀﾁﾊﾞﾅｼﾔｼﾝｼﾞﾑｼﾖ",
    amount: 220000,
  },
  {
    invoiceNo: "INV-2026-109",
    issueDate: "2026-07-22",
    dueDate: "2026-08-20",
    clientName: "株式会社カワセ精機",
    payerName: "ｶ)ｶﾜｾｾｲｷ",
    amount: 176000,
  },
  {
    invoiceNo: "INV-2026-110",
    issueDate: "2026-07-24",
    dueDate: "2026-08-20",
    clientName: "株式会社ナガレヤマ商会システム部",
    payerName: "ｶ)ﾅｶﾞﾚﾔﾏｼﾖｳｶｲｼｽﾃﾑ",
    amount: 99000,
  },
  {
    invoiceNo: "INV-2026-111",
    issueDate: "2026-07-25",
    dueDate: "2026-08-31",
    clientName: "株式会社オオゾラ印刷",
    payerName: "ｶ)ｵｵｿﾞﾗｲﾝｻﾂ",
    amount: 253000,
  },
  {
    invoiceNo: "INV-2026-112",
    issueDate: "2026-07-28",
    dueDate: "2026-08-31",
    clientName: "藤井 亮太",
    payerName: "",
    amount: 55000,
    note: "個人のお客様",
  },
];

/** 見出しが1行目にある前提で、2行目から振る */
export const SAMPLE_LEDGER: InvoiceEntry[] = LEDGER_SOURCE.map((row, i) => ({
  invoiceNo: row.invoiceNo,
  issueDate: row.issueDate,
  dueDate: row.dueDate,
  clientName: row.clientName,
  payerName: row.payerName,
  amount: row.amount,
  note: row.note ?? "",
  key: normalizeMatchKey(row.payerName || row.clientName),
  sourceLine: i + 2,
}));

/**
 * サンプルを読み込んだときに出す指摘。
 * 振込名義が空の1件だけ（画面の「指摘」欄が最初から成立するように）。
 */
export const SAMPLE_LEDGER_ISSUES: ParseIssue[] = [
  {
    line: 13,
    column: "振込名義",
    level: "warn",
    message:
      "振込名義が空です。取引先名「藤井 亮太」から照合しますが、漢字・ひらがなは銀行の明細と当たりません。カナの振込名義を入れると精度が上がります。",
  },
];

/* ------------------------------------------------------------------ *
 * 入出金明細（13行・うち出金3行）
 * ------------------------------------------------------------------ */

interface SampleStatement {
  date: string;
  description: string;
  amount: number;
  debit?: boolean;
}

const STATEMENT_SOURCE: SampleStatement[] = [
  { date: "2026-07-28", description: "振込 ｶ)ﾐﾅﾄﾃﾞｻﾞｲﾝ", amount: 148500 },
  { date: "2026-07-29", description: "振込 ﾄﾞ)ｱｵﾊﾞｺｳﾎﾞｳ", amount: 135300 },
  { date: "2026-07-30", description: "振込 ﾕ)ﾐﾄﾞﾘﾌﾄﾞｳｻﾝ", amount: 527450 },
  { date: "2026-07-30", description: "電気料金", amount: 12480, debit: true },
  { date: "2026-07-31", description: "振込 ｻｸﾗｼｶｸﾘﾆﾂｸ", amount: 395120 },
  { date: "2026-07-31", description: "振込 ｶ)ﾋﾉﾃﾞﾌﾞﾂｻﾝ", amount: 198000 },
  { date: "2026-08-05", description: "振込 ﾀﾁﾊﾞﾅｼﾔｼﾝｼﾞﾑｼﾖ", amount: 100000 },
  { date: "2026-08-10", description: "家賃 ｶ)ｻｶｴﾌﾄﾞｳｻﾝ", amount: 180000, debit: true },
  { date: "2026-08-18", description: "振込 ﾀﾁﾊﾞﾅｼﾔｼﾝｼﾞﾑｼﾖ", amount: 120000 },
  { date: "2026-08-19", description: "振込 ｶ)ｶﾜｾｾｲｷ", amount: 180000 },
  { date: "2026-08-20", description: "振込 ｶ)ﾅｶﾞﾚﾔﾏｼﾖｳｶｲ", amount: 99000 },
  { date: "2026-08-21", description: "振込 ｶ)ﾂｷﾉﾜｼﾖｳｼﾞ", amount: 71500 },
  { date: "2026-08-25", description: "口座振替 ｸﾚｼﾞﾂﾄｶｰﾄﾞ", amount: 43200, debit: true },
];

export const SAMPLE_STATEMENT: StatementEntry[] = STATEMENT_SOURCE.map((row, i) => {
  const payerRaw = extractPayer(row.description);
  return {
    date: row.date,
    description: row.description,
    payerRaw,
    key: normalizeMatchKey(payerRaw),
    amount: row.amount,
    direction: row.debit ? "debit" : "credit",
    sourceLine: i + 2,
  };
});

/** サンプルの明細を読んだことにする「読めた列」の表示 */
export const SAMPLE_STATEMENT_LAYOUT: StatementLayout = {
  guessedBank: "",
  amountShape: "twoColumn",
  dateHeader: "日付",
  descHeaders: ["摘要"],
  creditHeader: "入金額",
  debitHeader: "出金額",
  kindHeader: "",
  encoding: "utf-8",
  skippedDebits: STATEMENT_SOURCE.filter((r) => r.debit).length,
};
