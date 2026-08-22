/**
 * 列マッピング統合ツール（T-04） — 共通の型契約
 *
 * ⚠ この層は一切ネットワークへ出ない。fetch / XMLHttpRequest / sendBeacon / "use server" を書かない。
 *    受け取るのは File から読んだバイト列だけで、結果は呼び出し元へ返すのみ。
 *
 * ⚠ 汎用版は「整った入力」しか受け付けない（共通仕様 §3-2）。
 *    値そのものの表記ゆれは直さない（それは T-05 の領分）。このツールが引き受けるのは
 *    「列と列の対応づけ」だけ。
 *
 * ⚠ T-01 と違い、行単位の error は作らない。値を読み替えられなかったセルは
 *    **元の文字列のまま残して warn** にする。統合は「値を運ぶ」仕事であり、
 *    運べなかったからといって捨てると元データが欠ける。
 *    error はファイル単位（開けない・見出しが無い・行数超過）のときだけ。
 */

import type { Cell, ToolIssue } from "../_shared/sheetReader";

export type { ToolIssue };

/* ============================================================ *
 * 0. ★モジュール契約（4つの実装をまたぐ約束・ここを最初に読む）
 *
 * ■ 静的層（画面が最初から import してよい＝純粋・重い依存を引かない）
 *   types.ts    この契約
 *   key.ts      unifyKey(raw) / toFullKana(s)
 *   aliases.ts  ALIAS_GROUPS / aliasGroupOf(key)
 *   automap.ts  autoMap(file, schema, previous?) : AutoMapResult
 *   unify.ts    unify(files, schema, mapping, options) : UnifyResult
 *   sample.ts   SAMPLE_FILES / SAMPLE_GRIDS / SAMPLE_SCHEMA_NAME
 *
 * ■ 動的層（await import(...) でしか読み込まない＝fflate を引く）
 *   parse.ts        parseSourceBytes() / buildSourceFileFromGrid() / makeSourceCell()
 *   exportSheet.ts  buildUnifiedXlsx() / buildUnifiedCsv()
 *
 * ★なぜ分けるのか（外すと静かに壊れる）
 *   `_shared/sheetReader.ts` は先頭で `import { unzipSync } from "fflate"` している。
 *   静的層がそこから **値を1つでも** import すると、/tools/table-unify を開いただけで
 *   fflate が落ちてくる（共通仕様 §6「重い依存はすべて動的 import」に反する）。
 *   よって静的層が sheetReader から取ってよいのは **型だけ**（`import type`）。
 *
 *   セルの解釈（日付として読めるか・数値として読めるか）は
 *   **出力列の種類に依存しない**ので、取り込み時に1度だけ行って SourceCell に持たせる。
 *   これで unify() は純粋になり、線を引き直すたびの再パースも消える。
 * ============================================================ */

/* ============================================================ *
 * 1. 出力スキーマ ＝ 利用者が決めた管理表の形
 * ============================================================ */

/** 出力列が想定する値の種類。統合時の整形と、食い違いの警告に使う */
export type ColumnKind = "text" | "number" | "date";

/** 出力スキーマの1列 */
export interface TargetColumn {
  /**
   * 不変ID（"t1" "t2" …）。
   * ⚠ 見出し名を変えてもマッピングが切れないように、name とは別に持つ。
   */
  id: string;
  /** 出力ファイルに書く見出し文字列 */
  name: string;
  kind: ColumnKind;
  /** true のとき、どのファイルからも対応づかなければ warn を出す */
  required: boolean;
}

/** 出力スキーマ全体 */
export interface TargetSchema {
  /** 画面に出す名前。書き出しファイル名にも使う */
  name: string;
  columns: TargetColumn[];
}

/* ============================================================ *
 * 2. 入力 ＝ 取り込んだファイル
 * ============================================================ */

/**
 * `_shared` の Cell に「日付として読めたか／数値として読めたか」を足したもの。
 *
 * ⚠ date / num は **parse.ts（動的層）だけが埋める。**
 *    静的層はこの2つを読むだけで、自分で解釈し直さない。
 */
export interface SourceCell extends Cell {
  /** 日付として読めたときの "YYYY-MM-DD"。読めなければ null */
  date: string | null;
  /** 数値として読めたときの値。読めなければ null */
  num: number | null;
}

export const EMPTY_SOURCE_CELL: SourceCell = {
  text: "",
  numeric: false,
  date: null,
  num: null,
};

/** 取り込んだファイルの1列 */
export interface SourceColumn {
  /** 0始まりの列番号。マッピングの実体はこの数値 */
  index: number;
  /** 見出しセルの原文。空セルなら "列D" のような仮名が入る */
  header: string;
  /** 照合用キー（key.ts の unifyKey を通したもの） */
  key: string;
  /** 同じファイル内に同名の見出しがあるか（画面に "(2)" を足す） */
  duplicate: boolean;
  /** 見出しの下から拾った実データ（最大3件・空欄は除く）。画面のプレビューに出す */
  samples: string[];
  /** samples から推測した値の種類。マッピングの妥当性チェックに使う */
  guessedKind: ColumnKind;
}

/** データ1行 */
export interface SourceRow {
  /** 元ファイル上の行番号（1始まり）。CSV は parseCsv の lines[]、xlsx は grid 上の行番号 + 1 */
  line: number;
  /** 列番号でそのまま引ける。欠けている列は EMPTY_SOURCE_CELL で埋めてある */
  cells: SourceCell[];
  /** 小計行・合計行の疑いがある（§8-6）。自動では消さない */
  suspectSubtotal: boolean;
}

/** 取り込んだファイル1つ */
export interface SourceFile {
  /** 画面と MappingTable が参照するID（"f1" "f2" …） */
  id: string;
  /** 元のファイル名 */
  name: string;
  /** xlsx のとき読んだシート名。CSV は "" */
  sheetName: string;
  /**
   * そのブックに入っている全シート名（ブックの並び順）。CSV は空配列。
   * 2件以上あるときだけ画面にシート選択を出す。
   */
  sheetNames: string[];
  /** 見出し行の grid 上の行番号（0始まり）。見出し行なしのときは NO_HEADER_ROW */
  headerIndex: number;
  /** 見出し行の元ファイル行番号（1始まり）。指摘の表示に使う。見出し行なしなら 0 */
  headerLine: number;
  columns: SourceColumn[];
  rows: SourceRow[];
}

/** 「1行目から本文」を表す headerIndex。列名は 列A 列B … になる */
export const NO_HEADER_ROW = -1;

/** 読み取りのやり直しに使う指定（画面のセレクトから渡ってくる） */
export interface ParseOptions {
  /** xlsx で読むシート名。省略＝「明細」優先→先頭シート */
  sheetName?: string;
  /** 見出し行（0始まりの grid 行番号）。省略＝自動検出。NO_HEADER_ROW で「見出し行なし」 */
  headerRow?: number;
  /** 割り当てるファイルID（"f1" など）。省略時は parse 側で "f1" を使う */
  id?: string;
}

export interface ParseFileResult {
  /** 読めなかったら null */
  file: SourceFile | null;
  issues: ToolIssue[];
  /** 読み込んだファイル名（issues だけ返るときも画面に出せるように） */
  sourceName: string;
}

/* ============================================================ *
 * 3. マッピング
 * ============================================================ */

/** 自動割当がどの段階で当たったか。線の見た目（実線／破線）と説明文に使う */
export type MatchLevel =
  | "exact" // 完全一致
  | "alias" // 別名辞書
  | "partial" // 部分一致
  | "similar" // 編集距離
  | "manual" // 人が引いた
  | "none"; // 未割当

/** 人が確認したほうがよい段階（破線で描き、「要確認」に数える） */
export const REVIEW_LEVELS: readonly MatchLevel[] = ["partial", "similar"];

/** 出力列1つに対する、あるファイルからの割当 */
export type Assignment =
  | { kind: "column"; index: number; level: MatchLevel; score: number }
  /**
   * そのファイルの全行に同じ値を入れる（例：B社のファイルに「支店」列が無い → "大阪"）。
   * ⚠ date / num は parse.ts の makeSourceCell() で埋めてから積むこと。
   *    UI で文字列だけ入れて静的層に解釈させない（境界を越える）。
   */
  | { kind: "const"; value: string; date: string | null; num: number | null }
  | { kind: "none" };

export const NO_ASSIGNMENT: Assignment = { kind: "none" };

/**
 * マッピング全体。
 * fileId → (targetColumn.id → Assignment)
 * ⚠ キーが無い ＝ { kind: "none" } と同じ意味。読み出しは必ず既定値つきで行う。
 */
export type MappingTable = Record<string, Record<string, Assignment>>;

/** autoMap() の戻り。同点で見送った候補も返す（§7-4） */
export interface AutoMapResult {
  assignments: Record<string, Assignment>;
  /**
   * 同点の候補が2つ以上あって割り当てなかった出力列。
   * targetColumn.id → 候補になった入力列の見出し（画面にそのまま出す）
   */
  ambiguous: Record<string, string[]>;
}

/* ============================================================ *
 * 4. 統合のオプション
 * ============================================================ */

export interface UnifyOptions {
  /** 取り込み元のファイル名を先頭列に足す */
  addSourceColumn: boolean;
  /** 元ファイルの行番号を2列目に足す */
  addSourceLineColumn: boolean;
  /** 出力スキーマに割り当てられなかった入力列を、末尾に元の見出し名で足す */
  keepUnmapped: boolean;
  /** 重複行をまとめる */
  dedupe: boolean;
  /** 重複判定に使う出力列ID。空配列なら「出力スキーマの全列が一致」 */
  dedupeKeys: string[];
  /** 小計行の疑いがある行を外す */
  dropSuspectSubtotal: boolean;
}

/**
 * ⚠ 既定は「消さない・足す」。
 *    重複排除と小計行除去を既定オンにすると、本物のデータを黙って消す事故が起きる。
 */
export const DEFAULT_UNIFY_OPTIONS: UnifyOptions = {
  addSourceColumn: true,
  addSourceLineColumn: false,
  keepUnmapped: false,
  dedupe: false,
  dedupeKeys: [],
  dropSuspectSubtotal: false,
};

/* ============================================================ *
 * 5. 統合の結果
 * ============================================================ */

/** 書き出す列の最終形（由来列・未対応列を含む） */
export interface OutputColumn {
  name: string;
  kind: ColumnKind;
  /** どこから来た列か。画面の色分けに使う */
  origin: "source" | "target" | "unmapped";
}

/**
 * 統合後の1セル。画面・CSV・xlsx の3つの出し先を1つの値で賄う。
 *
 * ⚠ text に表示用の整形（formatYen / formatDateJa）を入れない。
 *    ここは「出力ファイルに書く値」であって表示ではない。整形は UI 層だけで行う。
 */
export interface UnifiedCell {
  /** 画面と CSV に出す文字列 */
  text: string;
  /** xlsx に数値セルとして書く値。null なら数値ではない */
  num: number | null;
  /** xlsx に日付セルとして書く "YYYY-MM-DD"。null なら日付ではない */
  iso: string | null;
  /** 出力列の kind に合わない値だった（画面で薄く印を出す・件数を数える） */
  mismatch: boolean;
}

/** 統合後の1行 */
export interface UnifiedRow {
  /** columns と同じ並び・同じ長さ */
  cells: UnifiedCell[];
  fileId: string;
  fileName: string;
  /** 元ファイル上の行番号 */
  line: number;
}

export interface UnifyStats {
  fileCount: number;
  inputRows: number;
  outputRows: number;
  droppedDuplicate: number;
  droppedSubtotal: number;
  /** 対応づかず空欄になったセルの数 */
  emptyCells: number;
  /** 値の種類が出力列と食い違ったセルの数 */
  mismatchCells: number;
  /** 破線（partial / similar）のまま残っている割当の数＝「要確認」 */
  needsReview: number;
  /** どのファイルからも対応づかなかった出力列の名前 */
  unmappedTargets: string[];
  /** 出力に載らなかった入力列（"A社_受注データ.csv の 担当" の形） */
  droppedSources: string[];
}

export interface UnifyResult {
  columns: OutputColumn[];
  rows: UnifiedRow[];
  issues: ToolIssue[];
  stats: UnifyStats;
}

/* ============================================================ *
 * 6. 上限・しきい値
 * ============================================================ */

export const MAX_FILES = 10;
export const MAX_ROWS_PER_FILE = 5000;
export const MAX_TOTAL_ROWS = 20000;
export const MAX_SOURCE_COLUMNS = 60;
export const MAX_TARGET_COLUMNS = 40;
/** 見出し行を探す範囲 */
export const HEADER_SCAN_ROWS = 10;
/** 画面に出す実データの件数（列あたり） */
export const SAMPLE_VALUES_PER_COLUMN = 3;
/** 画面のプレビュー表に出す行数 */
export const PREVIEW_ROWS = 30;

/** 自動割当を確定する最低スコア。これ未満は割り当てない */
export const AUTOMAP_MIN_SCORE = 40;
/**
 * 編集距離を試す最短の見出し長（短い語は誤爆する）。
 * ⚠ 包含（部分一致）には使わない。そちらは CONTAIN_MIN_LENGTH。
 */
export const FUZZY_MIN_LENGTH = 3;
/**
 * 包含（部分一致）を試す最短の見出し長。
 *
 * ⚠ 計画書 §7-3 は包含も編集距離も同じ 3 としていたが、それだと
 *    §11-3 が「partial（要確認）で出るのが正」とした **「担当」→「担当者」が当たらない**
 *    （`unifyKey("担当")` は2文字）。計画書の中で §7-3 と §11-3 が食い違っていた。
 *
 *    危ないのは編集距離のほうで（2文字で距離1なら半分違う）、包含は日本語の業務見出しでは
 *    略記として頻繁に起き、比較的安全。よって **包含だけ下限を 2 に下げる**。
 *    1文字は不可（「数」が「数量」「件数」「点数」すべてに当たってしまう）。
 *    包含は実線ではなく **破線＝要確認** で出るので、最後に決めるのは人のままである。
 */
export const CONTAIN_MIN_LENGTH = 2;
/** 編集距離で「似ている」とみなす上限（長い方の文字数に対する比） */
export const SIMILAR_MAX_RATIO = 0.34;

/* ============================================================ *
 * 7. 見本の出力スキーマ
 *    ⚠ 先頭（＝初期表示）は「売上明細」。サンプル3ファイルがこの形に揃う。
 * ============================================================ */

export const BUILTIN_SCHEMAS: TargetSchema[] = [
  {
    name: "売上明細",
    columns: [
      { id: "t1", name: "取引日", kind: "date", required: true },
      { id: "t2", name: "取引先名", kind: "text", required: true },
      { id: "t3", name: "品目", kind: "text", required: true },
      { id: "t4", name: "数量", kind: "number", required: false },
      { id: "t5", name: "単価", kind: "number", required: false },
      { id: "t6", name: "金額", kind: "number", required: true },
      { id: "t7", name: "担当者", kind: "text", required: false },
      { id: "t8", name: "備考", kind: "text", required: false },
    ],
  },
  {
    name: "経費精算",
    columns: [
      { id: "t1", name: "使用日", kind: "date", required: true },
      { id: "t2", name: "申請者", kind: "text", required: true },
      { id: "t3", name: "部署", kind: "text", required: false },
      { id: "t4", name: "勘定科目", kind: "text", required: false },
      { id: "t5", name: "支払先", kind: "text", required: false },
      { id: "t6", name: "金額", kind: "number", required: true },
      { id: "t7", name: "摘要", kind: "text", required: false },
    ],
  },
  {
    name: "取引先名簿",
    columns: [
      { id: "t1", name: "取引先コード", kind: "text", required: false },
      { id: "t2", name: "取引先名", kind: "text", required: true },
      { id: "t3", name: "担当者名", kind: "text", required: false },
      { id: "t4", name: "郵便番号", kind: "text", required: false },
      { id: "t5", name: "住所", kind: "text", required: false },
      { id: "t6", name: "電話番号", kind: "text", required: false },
      { id: "t7", name: "メールアドレス", kind: "text", required: false },
    ],
  },
];

/* ============================================================ *
 * 8. 小道具（型に付随する読み出しヘルパー・純粋）
 * ============================================================ */

/** マッピング表から1つ読む。キーが無ければ「未割当」 */
export function assignmentOf(
  mapping: MappingTable,
  fileId: string,
  targetId: string,
): Assignment {
  return mapping[fileId]?.[targetId] ?? NO_ASSIGNMENT;
}

/** 破線で描く段階か（＝人に確認してほしい） */
export function isReviewLevel(level: MatchLevel): boolean {
  return level === "partial" || level === "similar";
}
