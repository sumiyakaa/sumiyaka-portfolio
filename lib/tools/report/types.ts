/**
 * 月次レポートPDF — 共通の型契約
 *
 * ⚠ この層は「ブラウザ内で完結する」ことが設計の前提。
 *    ここに置く関数は一切ネットワークへ出ない（fetch は書体の取得のみ・別モジュール）。
 *
 * ⚠ 出せない値を 0 で埋めない。null で「出せない」を表す。
 *    前年同月のデータが無いのに前年同月比を 0% と書くのは、静かな嘘になる。
 *    「データが無い月」と「売上が 0 円の月」も決して混ぜない。
 */

import type { ToolIssue } from "../_shared/sheetReader";

/* ------------------------------------------------------------------ *
 * 入力
 * ------------------------------------------------------------------ */

/** 売上表 1 行。日々の明細でも、月次に集計済みの行でもよい */
export interface SalesRow {
  /** 計上日 YYYY-MM-DD */
  date: string;
  /** 金額（円）。税込・税抜は利用者の運用に委ねる */
  amount: number;
  /** 件数。列が空欄なら 1（1 行 ＝ 1 件） */
  count: number;
  /** 商品・サービス名（空なら "（未分類）"） */
  itemName: string;
  /** 取引先名（空なら "（未分類）"） */
  clientName: string;
  /** 元ファイル上の行番号（1 始まり・見出し行を含む）。指摘の表示に使う */
  sourceLine: number;
}

/** 全ツール共通の指摘型をそのまま使う */
export type ParseIssue = ToolIssue;

export interface ParseResult {
  rows: SalesRow[];
  issues: ParseIssue[];
  /** 読み込んだファイル名 */
  sourceName: string;
  /**
   * 読めずに落とした行数。
   * ⚠ 落としたことは必ず画面に出す。黙って減らすと、利用者は合計が合わない理由に気づけない。
   */
  droppedRows: number;
}

/* ------------------------------------------------------------------ *
 * 集計
 * ------------------------------------------------------------------ */

/** 年月。month は 1..12 */
export interface YearMonth {
  year: number;
  month: number;
}

/**
 * 1 か月ぶんの集計。
 * ⚠ データが 1 行も無い月は、この型を作らない（0 円の月と区別するため）。
 */
export interface MonthlyPoint {
  ym: YearMonth;
  /** "2026-05" 形式のキー */
  key: string;
  /** 売上合計（円） */
  amount: number;
  /** 件数合計 */
  count: number;
  /** 平均単価。count が 0 以下なら null */
  unitPrice: number | null;
  /** その月に集計した明細の行数（欠測の説明に使う） */
  rows: number;
}

/** 比率が出せない理由 */
export type Unavailable = "no-data" | "zero-base" | "negative-base";

/**
 * 2 時点の比較。
 * ⚠ 比率が出せないときに 0 を入れない。null と unavailable で表す。
 */
export interface Comparison {
  /** 比較対象の月キー（"2026-04"）。対象が定義できないなら null */
  baseKey: string | null;
  /** 比較対象の金額。データが無ければ null */
  baseAmount: number | null;
  /** 増減額（当月 − 比較対象）。baseAmount が null なら null */
  delta: number | null;
  /** 増減率（0.048 ＝ +4.8%）。base が null / 0 / 負 なら null */
  rate: number | null;
  /** 出せなかった理由。出せたときは null */
  unavailable: Unavailable | null;
}

/** 区分の軸。構成比・ランキングをどちらで割るか */
export type BreakdownAxis = "item" | "client";

/** 区分 1 件 */
export interface BreakdownEntry {
  name: string;
  amount: number;
  count: number;
  /** 構成比（0.333 ＝ 33.3%）。当月合計が 0 以下なら null */
  share: number | null;
  /** 前年同月との比較 */
  yoy: Comparison;
  /** 上位から漏れた区分をまとめた行なら true */
  isOthers: boolean;
}

/** 表示期間に含まれるが、データが 1 行も無かった月 */
export interface MissingMonth {
  key: string;
  ym: YearMonth;
}

/** 年度累計 */
export interface Cumulative {
  /** 期首月キー（"2026-04"） */
  startKey: string;
  /** 累計額 */
  amount: number;
  /** 集計した月数（欠測月は数えない） */
  months: number;
}

/**
 * レポート 1 枚ぶん。
 * PDF もプレビューも、この型だけを見て描く（＝紙と画面が食い違わない）。
 */
export interface ReportDoc {
  /** 対象月 */
  target: MonthlyPoint;
  /** 棒グラフに載せる月（古い順）。欠測月は含まない */
  series: MonthlyPoint[];
  /** 表示期間のうちデータが無かった月 */
  missing: MissingMonth[];
  /** 3 か月移動平均。series と同じ長さ。引けない位置は null */
  movingAverage: (number | null)[];
  /** 各月の前年同月の金額。series と同じ長さ。無い月は null */
  previousYear: (number | null)[];
  /** 前月比 */
  mom: Comparison;
  /** 前年同月比 */
  yoy: Comparison;
  /** 年度累計 */
  ytd: Cumulative;
  /** 前年同期との比較 */
  ytdYoy: Comparison;
  /** 区分別（降順・上位 N ＋「その他」） */
  breakdown: BreakdownEntry[];
  /** 区分の軸 */
  axis: BreakdownAxis;
  /** 要約文（1 文 ＝ 1 要素・優先順位の高い順） */
  summary: string[];
  /** 縦軸の上限（円）。0 起点 */
  axisMax: number;
  /** 縦軸の下限（円）。負の月が無ければ 0 */
  axisMin: number;
}

/* ------------------------------------------------------------------ *
 * 設定
 * ------------------------------------------------------------------ */

/** 表題・作成者。localStorage に保存され、端末の外へは出ない */
export interface ReportMeta {
  /** 紙面の右上に出す会社名・部署 */
  organization: string;
  /** 作成者名（空可） */
  authorName: string;
  /** 作成日 YYYY-MM-DD。空なら PDF を作った日 */
  createdDate: string;
  /** 表題。空なら "月次レポート" */
  title: string;
}

export interface ReportOptions {
  /** 対象月 "YYYY-MM"。空ならデータの最終月 */
  targetKey: string;
  /** 年度の期首月（1..12） */
  fiscalStartMonth: number;
  /** 区分の軸 */
  axis: BreakdownAxis;
  /** 棒グラフに載せる月数（対象月を含む） */
  spanMonths: number;
  /** 区分別に載せる上位件数。これを超えた分は「その他」へ畳む */
  breakdownTop: number;
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  targetKey: "",
  fiscalStartMonth: 4,
  axis: "item",
  spanMonths: 14,
  breakdownTop: 5,
};

/* ------------------------------------------------------------------ *
 * 定数
 * ------------------------------------------------------------------ */

/** テンプレートの列見出し（この順に並ぶ。読み取りは見出し名で照合する） */
export const SALES_COLUMNS = [
  "日付",
  "金額",
  "件数",
  "商品・サービス",
  "取引先",
] as const;

export type SalesColumn = (typeof SALES_COLUMNS)[number];

/** 必須列。これが欠けている売上表は読み取りエラーにする */
export const SALES_REQUIRED_COLUMNS = [
  "日付",
  "金額",
] as const satisfies readonly SalesColumn[];

/** 見出し行を探す範囲（先頭から何行目までを走査するか） */
export const SALES_HEADER_SCAN_ROWS = 10;

/** 1 ファイルあたりの明細行の上限 */
export const MAX_SALES_ROWS = 20000;

/** 前年同月比を出すのに必要な最小の月数（対象月 ＋ 12 か月前） */
export const MONTHS_FOR_YOY = 13;

/** 棒グラフに載せる月数の上限（版面の都合） */
export const MAX_SPAN_MONTHS = 14;

/** 区分が空だったときの名前 */
export const UNCLASSIFIED = "（未分類）";

/** 「その他」行の名前 */
export const OTHERS_LABEL = "その他";

/**
 * 要約文に書いてはいけない語。
 * ⚠ 生成後に必ず検査する。評価・助言・原因の推測は事実ではない。
 */
export const FORBIDDEN_SUMMARY_WORDS = [
  "好調", "不調", "順調", "堅調", "苦戦", "低迷", "伸び悩",
  "懸念", "危険", "良い", "悪い", "改善", "悪化", "回復", "失速",
  "すべき", "必要があります", "望ましい", "検討",
  "見込ま", "期待", "予測", "予想", "だろう",
  "要因", "と考えら", "とみられ", "影響で", "おかげ", "せい",
  "目標", "達成", "未達",
] as const;

/** 率の丸めで符号が消える境界（±0.05% 未満は「ほぼ横ばい」と書く） */
export const FLAT_RATE_THRESHOLD = 0.0005;
