/**
 * 名簿クレンジングツール（T-05） — 共通の型契約
 *
 * ⚠ この層は一切ネットワークへ出ない（共通仕様 §3-1）。fetch / "use server" を書かない。
 *
 * ⚠ 「整った入力」原則の適用範囲は **形式** であって **値** ではない（計画書 §5-1）。
 *    形式（1シート・見出し行あり・結合セル無し）は整っている前提で受ける。
 *    値（全角半角・カナ・法人格・空白・異体字）は汚れている前提で受ける。これを直すのが仕事。
 *
 * ⚠ 規則は「列の役割」ごとに効く。役割が決まらない列は skip（一切触らない）が既定。
 *    「分からないから全部直しておく」は最悪の選択（計画書 §15-7）。
 *
 * ⚠ 迷ったら直さない。診断で見せて、規則は既定 OFF にする（計画書 §15-1）。
 *    直さなかったことは説明できるが、勝手に直したことは取り返せない。
 */

import type { ToolIssue } from "../_shared/sheetReader";

/* ------------------------------------------------------------------ *
 * 列
 * ------------------------------------------------------------------ */

/** 列の役割。規則はこの役割ごとに効く。"skip" は一切触らない */
export type ColumnRole =
  | "companyName"
  | "department"
  | "personName"
  | "kana"
  | "zip"
  | "address"
  | "tel"
  | "email"
  | "code"
  | "free"
  | "skip";

export interface ColumnSpec {
  /** 元の表での列番号（0始まり） */
  index: number;
  /** 見出しの文字列。**原文のまま**保持し、書き出し時にそのまま戻す */
  header: string;
  role: ColumnRole;
  /** 見出しから推定した値か（利用者がプルダウンで変更したら false にする） */
  guessed: boolean;
}

/** 画面のプルダウンと修正レポートに出す役割名 */
export const ROLE_LABELS: Record<ColumnRole, string> = {
  companyName: "会社名",
  department: "部署",
  personName: "氏名",
  kana: "フリガナ",
  zip: "郵便番号",
  address: "住所",
  tel: "電話番号",
  email: "メール",
  code: "型番・管理番号",
  free: "備考・自由記述",
  skip: "触らない",
};

/** プルダウンに並べる順序（skip を最後に置く） */
export const ROLE_ORDER = [
  "companyName",
  "department",
  "personName",
  "kana",
  "zip",
  "address",
  "tel",
  "email",
  "code",
  "free",
  "skip",
] as const satisfies readonly ColumnRole[];

/**
 * 見出しから役割を推定するための語（計画書 §5-4）。
 *
 * ⚠ 判定は **この配列の順に評価し、最初に当たった役割を採る**。
 *    「取引先コード」が companyName ではなく code になるよう、限定的な役割を先に置いてある。
 * ⚠ 照合は `normalizeHeader()`（_shared）を通したうえで**小文字化して部分一致**。
 *    小文字化を _shared 側に足すのは却下されている（共通仕様 §4）ので、ローカルで行う。
 */
export const ROLE_GUESS_WORDS: readonly { role: ColumnRole; words: readonly string[] }[] = [
  { role: "zip", words: ["郵便番号", "〒", "郵便", "zip", "postal"] },
  { role: "tel", words: ["電話番号", "電話", "tel", "携帯", "fax"] },
  { role: "email", words: ["メールアドレス", "メール", "mail", "アドレス"] },
  { role: "kana", words: ["フリガナ", "ふりがな", "カナ", "かな", "ヨミ", "読み"] },
  { role: "code", words: ["型番", "品番", "商品コード", "管理番号", "会員番号", "契約番号", "コード", "id"] },
  { role: "department", words: ["部署名", "部署", "部門", "所属", "課"] },
  { role: "personName", words: ["氏名", "お名前", "名前", "担当者名", "担当者", "代表者", "姓", "名"] },
  { role: "companyName", words: ["会社名", "企業名", "法人名", "取引先名", "取引先", "顧客名", "社名", "団体名", "屋号"] },
  { role: "address", words: ["住所", "所在地", "番地"] },
  { role: "free", words: ["備考", "メモ", "補足", "コメント"] },
];

/* ------------------------------------------------------------------ *
 * 規則
 * ------------------------------------------------------------------ */

/**
 * 危険度。
 *  safe    … 意味が変わらない。既定 ON
 *  caution … 大半は正しいが例外がある。対象列を絞ることで安全側に倒す
 *  danger  … 別物に化けうる。**必ず既定 OFF**
 *
 * ⚠ 実装中に危険度を下げない。壊れにくいと感じたら、対象の役割を狭めて解決する（計画書 §15-8）。
 */
export type RuleRisk = "safe" | "caution" | "danger";

export const RISK_LABELS: Record<RuleRisk, string> = {
  safe: "安全",
  caution: "注意",
  danger: "危険",
};

export type RuleId =
  | "trim"
  | "controlChars"
  | "nfcCompose"
  | "collapseSpace"
  | "halfWidthKana"
  | "ideographicSpace"
  | "fullWidthAlnum"
  | "corporateForm"
  | "hyphenUnify"
  | "prolongedSound"
  | "bracketWidth"
  | "zipFormat"
  | "telFormat"
  | "kanaOnly"
  | "waveDash"
  | "circledNumber"
  | "variantKanji"
  | "kanjiNumeral";

export interface CleanupRule {
  id: RuleId;
  /** 画面に出す名前（例：「半角カナを全角に」） */
  label: string;
  /** 1行の説明 */
  detail: string;
  /** 「変換前 → 変換後」の実例。規則リストに小さく出す */
  example: string;
  risk: RuleRisk;
  defaultOn: boolean;
  /** この規則が効く列の役割。**空配列は使わない**（対象を必ず明示する） */
  roles: readonly ColumnRole[];
  /** danger の規則にチェックを入れたとき、その場に出す1行の確認文 */
  confirm?: string;
  /**
   * 値を変換する。
   * ⚠ 契約1：変化しないときは **受け取った文字列をそのまま返す**（=== で比較できる）
   * ⚠ 契約2：**冪等**であること。apply(apply(x)) === apply(x)
   * ⚠ 契約3：options を省略したら DEFAULT_RULE_OPTIONS と同じ挙動にする
   */
  apply: (value: string, options?: RuleOptions) => string;
}

export type RuleSwitches = Record<RuleId, boolean>;

/**
 * 規則そのものの向きを画面から選ばせるための設定（計画書 §8-2 R15）。
 *
 * ⚠ 規則を2本に割ると18規則の内訳が崩れるので、**規則は1本のまま向きだけを外から与える**。
 * ⚠ 増やすときも「既定値を渡せば従来どおり」を保つこと（省略可能な引数として受ける）。
 */
export interface RuleOptions {
  /** 波ダッシュ U+301C と全角チルダ U+FF5E のどちらへ寄せるか */
  waveDashTo: "～" | "〜";
}

export const DEFAULT_RULE_OPTIONS: RuleOptions = { waveDashTo: "～" };

/** 1つの規則が実際に値を変えた記録 */
export interface RuleHit {
  ruleId: RuleId;
  before: string;
  after: string;
}

/** 1セルに規則を順に当てた結果 */
export interface RuleApplication {
  /** 変化が無ければ入力と同一の参照を返す */
  value: string;
  /** 実際に値を変えた規則だけを**適用順**に並べる */
  hits: RuleHit[];
}

/* ------------------------------------------------------------------ *
 * 入力
 * ------------------------------------------------------------------ */

export interface NameRow {
  /** 列数ぶんの値。**原文のまま**（trim もしない） */
  cells: string[];
  /** 元ファイル上の行番号（1始まり）。指摘とレポートに使う */
  sourceLine: number;
}

export interface ParseResult {
  /** 見出しの文字列（原文のまま） */
  headers: string[];
  columns: ColumnSpec[];
  rows: NameRow[];
  issues: ToolIssue[];
  sourceName: string;
  /** CSV のときだけ入る。画面に「Shift_JIS として読みました」と出す */
  encoding?: "utf-8" | "shift_jis";
  /** xlsx のときだけ入る。画面に「◯◯シートを読みました」と出す */
  sheetName?: string;
  /** 見出し行の元ファイル行番号 */
  headerLine: number;
  /**
   * 元の Excel で**数値型として保存されていた**セルの位置。
   * キーは `${rowIndex},${colIndex}`（どちらも 0 始まり・rows と columns の添字）。
   *
   * ⚠ 郵便番号や型番がここに入っていたら、**先頭の 0 は読み込む前に失われている**。
   *    復元は原理的に不可能なので、直さず `numericStoredCode` として知らせるだけにする。
   */
  numericCells: Set<string>;
}

/* ------------------------------------------------------------------ *
 * 診断
 * ------------------------------------------------------------------ */

/** 直さずに知らせるだけの指摘（計画書 §7-3） */
export type NoticeId =
  | "addressChomeMixed"
  | "addressPrefectureMixed"
  | "numericStoredCode"
  | "duplicateHeader"
  | "emptyCells"
  | "widthMixedInColumn";

export interface Notice {
  id: NoticeId;
  /** そのまま画面に出せる一文（件数を含める） */
  label: string;
  /** 該当した行数 */
  rows: number;
  /** 該当した列の見出し */
  columns: string[];
  /** 画面に出す実例（最大 SAMPLE_LIMIT 件） */
  samples: string[];
}

/** 規則1つぶんの診断結果 */
export interface Finding {
  ruleId: RuleId;
  /** 該当セル数 */
  cells: number;
  /** 該当行数（重複を除いた実数） */
  rows: number;
  /** 該当した列の見出し */
  columns: string[];
  /** 画面に出す実例（最大 SAMPLE_LIMIT 件） */
  samples: { header: string; sourceLine: number; before: string; after: string }[];
}

/* ------------------------------------------------------------------ *
 * 修正
 * ------------------------------------------------------------------ */

/**
 * before / after の差分位置（共通の接頭・接尾を除いた範囲）。ハイライトに使う。
 * ⚠ **コードポイント単位**（`Array.from` で切った添字）。UI 側も `slice` ではなく `Array.from` で切ること。
 */
export interface DiffSpan {
  beforeStart: number;
  beforeEnd: number;
  afterStart: number;
  afterEnd: number;
}

/** 1セルの修正 */
export interface CellChange {
  /** 表示上の行番号（見出し行を除いた1始まりの通し番号 ＝ rows の添字 + 1） */
  row: number;
  /** 元ファイル上の行番号 */
  sourceLine: number;
  /** 列番号（0始まり） */
  col: number;
  /** 列の見出し（原文のまま） */
  header: string;
  before: string;
  after: string;
  /** 効いた規則。**適用順に入れる**（複数の規則が重なることがある） */
  ruleIds: RuleId[];
  span: DiffSpan;
}

/* ------------------------------------------------------------------ *
 * 重複
 * ------------------------------------------------------------------ */

/**
 * 判定の段階。上ほど確実。
 *  exact      … **クレンジング前**の文字列がそのまま一致
 *  normalized … 比較キーが一致（計画書 §9-2）
 *  kana       … フリガナ列の比較キーが一致
 *  near       … 編集距離による近似一致（候補。人が確かめる前提）
 */
export type DuplicateLevel = "exact" | "normalized" | "kana" | "near";

export const DUPLICATE_LEVEL_LABELS: Record<DuplicateLevel, string> = {
  exact: "完全一致",
  normalized: "表記を揃えると一致",
  kana: "読みが一致",
  near: "似ている",
};

export interface DuplicateGroup {
  /** グループの表示記号（A / B / C …） */
  mark: string;
  level: DuplicateLevel;
  /** 判定に使った比較キー。画面で「なぜ同じと判定したか」を見せる */
  key: string;
  /** 表示上の行番号（2件以上・昇順） */
  rows: number[];
  sourceLines: number[];
  /** 判定に使った列の見出し */
  columns: string[];
  /** 人が読める突合値（rows と同じ並び）。比較キーではなく**元の値** */
  values: string[];
  /** near のときだけ入る。0〜1（1が同一）。グループ内の最小値 */
  similarity?: number;
  /** near のときだけ入る。編集距離。グループ内の最大値 */
  distance?: number;
  /** near のときだけ入る。グループ内で実際に似ていた組（連結成分の辺） */
  pairs?: { a: number; b: number; similarity: number; distance: number }[];
}

export interface DedupeOptions {
  enabled: boolean;
  /** 突合に使う列の役割。既定は会社名＋氏名 */
  keyRoles: ColumnRole[];
  /** 近似一致（near）まで行うか */
  useNear: boolean;
  /** 類似度のしきい値（0〜1）。既定 0.85 */
  minSimilarity: number;
  /** 編集距離の上限。既定 2 */
  maxDistance: number;
  /** 比較キーがこれより短い行には near 判定をかけない。既定 4 */
  minKeyLength: number;
}

/**
 * 重複検出の入力。
 *
 * ⚠ `exact` は **original**（クレンジング前）で判定する。
 * ⚠ 比較キーは **fullyCleaned**（全規則を ON にした結果）から作る。
 *    規則の ON/OFF で重複の判定が揺れると、利用者が理由を説明できなくなるため。
 */
export interface DedupeInput {
  original: readonly NameRow[];
  fullyCleaned: readonly NameRow[];
  columns: readonly ColumnSpec[];
  options: DedupeOptions;
}

/* ------------------------------------------------------------------ *
 * 結果
 * ------------------------------------------------------------------ */

export interface CleanResult {
  /** 修正後の行。cells の長さ・並びは ParseResult.rows と完全に一致する */
  rows: NameRow[];
  changes: CellChange[];
  findings: Finding[];
  notices: Notice[];
  duplicates: DuplicateGroup[];
  /** 修正が入った行の表示上の行番号（昇順・重複なし） */
  changedRows: number[];
  /** 1グループが上限を超えたなど、画面の .message に出す注意（無ければ空配列） */
  messages: string[];
}

/* ------------------------------------------------------------------ *
 * 書き出し
 * ------------------------------------------------------------------ */

export interface ExportInput {
  parsed: ParseResult;
  result: CleanResult;
  columns: readonly ColumnSpec[];
  /** ファイル名に入れる日付 "YYYYMMDD"。呼び出し側（UI）が渡す */
  stamp: string;
}

/* ------------------------------------------------------------------ *
 * 定数
 * ------------------------------------------------------------------ */

/** 見出し行を探す範囲（先頭から何行目までを走査するか） */
export const HEADER_SCAN_ROWS = 10;

/** 行数の上限。超えたらエラーにする */
export const MAX_ROWS = 5000;

/** 列数の上限 */
export const MAX_COLUMNS = 40;

/** near 判定のブロッキング：比較キーの先頭 n 文字が一致する行だけを比較する */
export const BLOCK_PREFIX = 2;

/** 画面に出す実例の件数 */
export const SAMPLE_LIMIT = 3;

/** 1つの重複グループに入れる行数の上限。超えたら突合列の選び方が悪いサイン */
export const MAX_GROUP_ROWS = 20;

/** 規則の ON/OFF を覚えておく localStorage のキー */
export const RULES_STORAGE_KEY = "akashiki.tools.cleanup.rules.v1";

/**
 * 見出し行の探索に使う役割語（`findHeaderRow` へ渡す）。
 * ⚠ `findHeaderRow` は **完全一致**（`normalizeHeader` 後）で数える。部分一致の推定表は ROLE_GUESS_WORDS。
 */
export const ROLE_HEADER_WORDS = [
  "会社名", "企業名", "法人名", "取引先名", "顧客名", "社名", "団体名", "屋号",
  "部署", "部署名", "所属", "部門",
  "氏名", "名前", "お名前", "担当者", "担当者名", "代表者",
  "フリガナ", "ふりがな", "カナ", "ヨミ",
  "郵便番号", "住所", "所在地",
  "電話番号", "電話", "TEL", "FAX",
  "メール", "メールアドレス",
  "型番", "品番", "管理番号", "会員番号", "コード",
  "備考", "メモ",
] as const;

export const DEFAULT_DEDUPE_OPTIONS: DedupeOptions = {
  enabled: true,
  keyRoles: ["companyName", "personName"],
  useNear: true,
  minSimilarity: 0.85,
  maxDistance: 2,
  minKeyLength: 4,
};

/* ------------------------------------------------------------------ *
 * ★モジュール間の公開API契約（4体で分担して書くための唯一の基準）
 *
 * 各ファイルは下記のとおりに export する。名前・引数・戻り値を勝手に変えない。
 * 足したい関数がある場合は、既存の署名を変えずに**追加**する。
 *
 * ── 軽い層（UI から静的 import してよい）────────────────────────────
 *   types.ts     … 本ファイル
 *   normalize.ts … 文字単位の変換の原始関数。**_shared/sheetReader を import しない**
 *     halfWidthKanaToFull(s): string        半角カナ→全角（濁点・半濁点は次の1文字と合成）
 *     fullWidthAlnumToHalf(s): string       U+FF01–FF5E → 半角（全角空白は触らない）
 *     hiraganaToKatakana(s): string
 *     unifyHyphens(s): string               ハイフン類 → "-"
 *     prolongedAfterKana(s): string         カナ直後のハイフン類 → "ー"
 *     openCorporateForm(s): string          ㈱ (株) （株） 株) ㍿ → 株式会社 等（位置は変えない）
 *     stripCorporateForm(s): string         比較キー用：法人格語を落とす
 *     unifyBrackets(s): string              （）［］｛｝ → ()[]{}
 *     circledToPlain(s): string             ①-⑳ / Ⅰ-Ⅹ → 素の数字
 *     variantToStandard(s): string          異体字→常用字体（VARIANT_KANJI の範囲だけ）
 *     kanjiNumeralInAddress(s): string      丁目/番/番地/号 の直前の漢数字だけ変換
 *     stripControlChars(s): string          U+0000-001F/007F/200B-200D/FEFF を除去・U+00A0→" "
 *     collapseSpaces(s): string             /[\s　]{2,}/ → " "
 *     trimBoth(s): string                   前後の半角/全角空白・タブを落とす
 *     diffSpan(before, after): DiffSpan     コードポイント単位（計画書 §8-6 の実装をそのまま）
 *     VARIANT_KANJI: ReadonlyMap<string, string>
 *
 *   rules.ts … 18規則。**並び順が適用順**（計画書 §8-2・§8-3）
 *     RULES: readonly CleanupRule[]                      18本
 *     DEFAULT_SWITCHES: RuleSwitches                     defaultOn から作る
 *     ALL_ON: RuleSwitches                               全 true（診断と比較キーに使う）
 *     ALL_OFF: RuleSwitches                              全 false（検証に使う）
 *     ruleById(id): CleanupRule
 *     rulesForRole(role): readonly CleanupRule[]         適用順のまま絞る（skip なら空）
 *     applyRulesTo(value, role, switches, options?): RuleApplication
 *
 *   diagnose.ts
 *     diagnose(parsed, columns, options?): { findings: Finding[]; notices: Notice[] }
 *
 *   apply.ts
 *     applyToRows(parsed, columns, switches, options?): { rows: NameRow[]; changes: CellChange[]; changedRows: number[] }
 *     runCleanup(parsed, columns, switches, dedupe, options?): CleanResult   ← UI はこれ1本を呼ぶ
 *
 *   dedupe.ts
 *     comparisonKey(value): string                       計画書 §9-2 の10手順
 *     findDuplicates(input: DedupeInput): DuplicateGroup[]
 *     levenshteinWithin(a: string[], b: string[], max: number): number   打ち切り付き・-1 は打ち切り
 *
 *   sample.ts … **parse.ts と _shared/sheetReader を import しない**（初期バンドルに fflate を持ち込まないため）
 *     SAMPLE_FILE_NAME: string
 *     sampleParseResult(): ParseResult                   役割は手で確定させたものを入れる
 *
 * ── 重い層（fflate を引くので UI からは動的 import のみ）──────────────
 *   parse.ts
 *     parseNameList(bytes: Uint8Array, fileName: string): ParseResult
 *     guessRole(header: string): ColumnRole
 *
 *   export.ts
 *     buildCleanedWorkbook(input: ExportInput): Uint8Array    3シート（名簿／修正一覧／重複候補）
 *     buildCleanedCsv(input: ExportInput): string             名簿のみ・UTF-8 BOM
 *     buildChangeReportCsv(input: ExportInput): string        修正一覧・UTF-8 BOM
 *     exportFileName(kind: "list" | "report", ext: "xlsx" | "csv", stamp: string): string
 * ------------------------------------------------------------------ */
