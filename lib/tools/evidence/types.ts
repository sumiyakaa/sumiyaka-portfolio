/**
 * 電帳法ファイル名 一括リネーム — 共通の型契約
 *
 * ⚠ この層は「ブラウザ内で完結する」ことが前提。ここに置く関数は一切ネットワークへ出ない。
 *    T-03 は書体を使わないので、ネットワークへ出る箇所が 1 つも無い。
 * ⚠ 汎用版は「整った入力」しか受け付けない。ファイル名から日付や金額を推測しない。
 * ⚠ 元のファイルのバイト列は変えない。付け替えるのは名前だけ。
 * ⚠ 法令の要件を満たすことを保証するものではない（画面に但し書きを出す）。
 *    根拠＝国税庁「電子帳簿保存法一問一答【電子取引関係】令和７年６月」問19・問48・問50・問51・問83
 */

import type { ToolIssue } from "../_shared/sheetReader";

/* ------------------------------------------------------------------ *
 * 1. 入力：証憑ファイル
 * ------------------------------------------------------------------ */

/** 証憑の種類。拡張子だけで決める（中身は読まない） */
export type EvidenceKind = "pdf" | "image";

/** 読み込んだ証憑ファイル1件 */
export interface EvidenceFile {
  /** 一意キー。relativePath があればそれ、無ければ name。衝突時は末尾に "#2" を足す */
  key: string;
  /** 元のファイル名（拡張子込み・パスを含まない） */
  name: string;
  /** フォルダ選択で得た相対パス。個別選択なら "" */
  relativePath: string;
  /** 小文字の拡張子（ドットなし）。例 "pdf"。ホワイトリスト外なら accepted:false */
  ext: string;
  kind: EvidenceKind;
  /** ホワイトリストに入っているか。false のものは ZIP に入れない */
  accepted: boolean;
  /** バイト数 */
  size: number;
  /**
   * ZIPへ詰め直すための実体。
   * ⚠ 読み込み（arrayBuffer）は書き出しの直前に1件ずつ行う。
   *    最初に全件を Uint8Array にすると 200MB を丸ごと抱えることになる。
   */
  blob: Blob;
}

/* ------------------------------------------------------------------ *
 * 2. 入力：台帳
 * ------------------------------------------------------------------ */

/** 台帳1行 */
export interface LedgerRow {
  /** 台帳が指す元のファイル名（拡張子込み。フォルダを含む場合もある） */
  originalName: string;
  /** 取引年月日 YYYY-MM-DD */
  date: string;
  /** 取引先 */
  vendor: string;
  /** 取引金額（円・整数。マイナス可） */
  amount: number;
  /** 書類の種類（請求書・領収書 など。空可） */
  docType: string;
  /** 備考（空可）。索引簿の備考欄へそのまま流す */
  note: string;
  /** 元ファイル上の行番号（1始まり・見出し行を含む） */
  sourceLine: number;
}

/** 読み取り・検証で見つかった指摘（全ツール共通の型をそのまま使う） */
export type ParseIssue = ToolIssue;

export interface ParseResult {
  rows: LedgerRow[];
  issues: ParseIssue[];
  /** 読み込んだファイル名 */
  sourceName: string;
}

/* ------------------------------------------------------------------ *
 * 3. 命名規則のオプション
 * ------------------------------------------------------------------ */

/**
 * 命名パターン。一問一答（問50）が挙げている方法に対応する。
 * - date_vendor_amount … 「20210131_㈱霞商店_110000」＝一問一答の例そのもの（既定）
 * - date_amount_vendor … 順序違い。統一されていればよい（問50「統一した順序で入力」）
 * - vendor_date_amount … 同上
 * - serial            … 連番のみ。索引簿で内容を管理する方法（問19の索引簿の作成例）
 */
export type NamePattern =
  | "date_vendor_amount"
  | "date_amount_vendor"
  | "vendor_date_amount"
  | "serial";

/**
 * 日付の書式。西暦だけを出す。
 * ⚠ 和暦は出さない。問50に「混在は抽出機能の妨げとなる」とあり、
 *    和暦を持たなければ混在が構造的に起きない。
 */
export type DateFormat = "yyyymmdd" | "yyyy-mm-dd";

/** 区切り文字 */
export type Delimiter = "_" | "-";

/**
 * フォルダの分け方。
 * - none         … ZIP直下に並べる（既定）
 * - vendor       … 取引先ごとのフォルダへ入れる。ファイル名は変えない
 * - vendor_short … 取引先ごとのフォルダへ入れ、ファイル名からは取引先を省く
 *                  ＝問50の3つ目の方法（取引先フォルダ＋日付・金額のファイル名）
 */
export type FolderMode = "none" | "vendor" | "vendor_short";

export interface NamingOptions {
  pattern: NamePattern;
  dateFormat: DateFormat;
  delimiter: Delimiter;
  folder: FolderMode;
  /** 連番の桁数（pattern === "serial" のときだけ使う） */
  serialDigits: number;
}

export const DEFAULT_NAMING: NamingOptions = {
  pattern: "date_vendor_amount",
  dateFormat: "yyyymmdd",
  delimiter: "_",
  folder: "none",
  serialDigits: 4,
};

/* ------------------------------------------------------------------ *
 * 4. 出力：リネーム対応表（画面の主役）
 * ------------------------------------------------------------------ */

/**
 * 1件の状態。
 * - ok         … 台帳と紐付き、名前が決まった
 * - renumbered … 同名になったため枝番（_2 など）を付けた
 * - truncated  … 長すぎたので取引先名を切り詰めた
 * - unmatched  … 台帳に行が無い。ZIPの `_未処理/` へ元の名前のまま入れる
 * - missing    … 台帳に行はあるが、対応するファイルが読み込まれていない
 * - rejected   … 対応していない拡張子。ZIPに入れない
 */
export type RenameStatus =
  | "ok"
  | "renumbered"
  | "truncated"
  | "unmatched"
  | "missing"
  | "rejected";

/** 対応表の1行 */
export interface RenamePair {
  status: RenameStatus;
  /** 元のファイル名（missing のときは台帳に書かれた名前） */
  from: string;
  /** ZIP内のパス（フォルダ込み）。missing / rejected のときは "" */
  to: string;
  /** to のうちフォルダ部分（"" なら直下）。unmatched は "_未処理" */
  folder: string;
  /** 索引簿の連番。ok / renumbered / truncated のときだけ 1 以上 */
  serial: number;
  /** 紐付いた台帳行。unmatched / rejected では null */
  row: LedgerRow | null;
  /** 紐付いた証憑。missing では null */
  file: EvidenceFile | null;
  /** 枝番（1 なら枝番なし） */
  seq: number;
  /** 画面と対応表CSVに出す一言（空可） */
  note: string;
}

export interface RenameCounts {
  /** 対応表の全行数 */
  total: number;
  /** ZIPに正規名で入る件数（ok + renumbered + truncated） */
  named: number;
  renumbered: number;
  truncated: number;
  unmatched: number;
  missing: number;
  rejected: number;
}

export interface RenamePlan {
  pairs: RenamePair[];
  issues: ParseIssue[];
  counts: RenameCounts;
  /** ZIPに入るファイルの合計バイト数（CSVは含まない） */
  totalBytes: number;
}

/* ------------------------------------------------------------------ *
 * 5. 台帳の列定義
 * ------------------------------------------------------------------ */

/** テンプレートの列見出し（この順に並ぶ。読み取りは見出し名で照合する） */
export const LEDGER_COLUMNS = [
  "元のファイル名",
  "取引年月日",
  "取引先",
  "取引金額",
  "書類の種類",
  "備考",
] as const;

export type LedgerColumn = (typeof LEDGER_COLUMNS)[number];

/** 必須列。これが欠けている台帳は読み取りエラーにする */
export const LEDGER_REQUIRED_COLUMNS = [
  "元のファイル名",
  "取引年月日",
  "取引先",
  "取引金額",
] as const satisfies readonly LedgerColumn[];

/** 見出し行を探す範囲（先頭から何行目までを走査するか） */
export const LEDGER_HEADER_SCAN_ROWS = 10;

/* ------------------------------------------------------------------ *
 * 6. 上限と定数
 * ------------------------------------------------------------------ */

export const MAX_LEDGER_ROWS = 500;
export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

/** 受け付ける拡張子（小文字・ドットなし）。これ以外は rejected */
export const ACCEPTED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "tif",
  "tiff",
] as const;

/** PDF 以外はすべて image 扱い */
export const PDF_EXTENSIONS = ["pdf"] as const;

/** ファイル名（拡張子込み）の上限文字数 */
export const MAX_NAME_LENGTH = 100;

/** ZIP内のパス全体（フォルダ + "/" + ファイル名）の上限文字数 */
export const MAX_ZIP_PATH_LENGTH = 160;

/** 台帳に紐付かなかったファイルを入れるフォルダ名 */
export const UNMATCHED_FOLDER = "_未処理";

/** ZIPに同梱するCSVの名前 */
export const INDEX_CSV_NAME = "索引簿.csv";
export const MAP_CSV_NAME = "リネーム対応表.csv";

/** 枝番の上限。超えたら error（現実には起きない） */
export const MAX_SEQ = 999;

/** 命名オプションの保存先（この端末の中だけ。台帳も証憑も保存しない） */
export const NAMING_STORAGE_KEY = "akashiki.tools.evidence.naming";

/** 対応表の初期描画件数。これを超えるぶんは「残り◯件を表示」ボタンで開く */
export const TABLE_INITIAL_ROWS = 200;
