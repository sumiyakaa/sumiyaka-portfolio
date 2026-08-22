/**
 * 電帳法ファイル名 一括リネーム — 命名規則
 *
 * ⚠ ここに置くのは**純関数だけ**。DOM にもネットワークにも触らない
 *    （Node でそのまま単体検証できる状態を保つ）。
 *
 * ⚠ 既定の形は 20210131_㈱霞商店_110000.pdf。
 *    国税庁「電子帳簿保存法一問一答【電子取引関係】」問19・問50 が挙げている例
 *    「20210131_㈱霞商店_110000」に、元ファイルの拡張子を足したもの。独自の規則を発明しない。
 *
 * ⚠ `_shared/format.ts` の safeFileName() は**通さない**。
 *    実物は 60 字で切るため、MAX_NAME_LENGTH = 100 のファイル名が黙って切られる。
 *    代わりに sanitizeNamePart() と avoidReservedName() が、safeFileName() と同等以上
 *    （NFC 正規化・制御文字の除去・半角/全角の禁止文字の置換・`\` の置換・連続空白の圧縮・
 *      前後の空白と `.` の除去・Windows 予約名の回避）を自前で行う。
 *    `_shared/format.ts` は読むだけで書き換えない。
 *
 * ⚠ 取引先名の全角文字は半角化しない。国税庁の例が `㈱霞商店` という全角の合字であり、
 *    利用者が台帳に書いた名称を勝手に書き換えないため（落とすのはファイル名に使えない文字だけ）。
 *    半角化するのは日付と金額（parseDateCell / parseNumberCell が読み取り時に済ませている）。
 */

import {
  MAX_NAME_LENGTH,
  MAX_ZIP_PATH_LENGTH,
  UNMATCHED_FOLDER,
} from "./types";
import type { DateFormat, Delimiter, NamingOptions } from "./types";

/* ------------------------------------------------------------------ *
 * 1. 部品の整形
 * ------------------------------------------------------------------ */

/** 制御文字。生のまま source に書くと git がバイナリ扱いするので必ずエスケープで書く */
const CONTROL_CHARS = new RegExp("[\u0000-\u001f\u007f]", "g");

/** ファイル名に使えない文字（半角）。`\` を含む＝ZIP 内でパス区切りに化けるため */
const FORBIDDEN_HALF = /[\\/:*?"<>|]/g;

/** 同（全角）。全角記号だけを潰し、全角英字・全角かなはそのまま残す */
const FORBIDDEN_FULL = /[＼／：＊？＂＜＞｜]/g;

/** Windows の予約名。ステム（拡張子を除く部分）が丸ごと一致したときだけ当たる */
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** 前後から落とす文字（空白と `.`）。Windows は末尾のドットと空白を黙って落とすため */
const EDGE_HEAD = /^[\s.]+/;
const EDGE_TAIL = /[\s.]+$/;

/** 前後の空白と `.` を落とす（計画書 §7-3 の 6。切り詰めのあとにも掛け直す） */
export function trimNameEdges(value: string): string {
  return value.replace(EDGE_HEAD, "").replace(EDGE_TAIL, "");
}

/**
 * ファイル名の部品として使える形へ整える（計画書 §7-3 の 1〜6）。
 *
 * 1. normalize("NFC")            … macOS が濁点を NFD で分解するため
 * 2. 制御文字を削除
 * 3. 全角スペース → 半角スペース
 * 4. 使えない文字（半角・全角）を `_` へ置換
 * 5. 連続する空白を1つへ
 * 6. 前後の空白と `.` を落とす
 *
 * ⚠ 7（空になったら error）は呼び出し側の仕事。ここでは投げない。
 *    使える文字が残ったかどうかは isUsableNamePart() で判定する。
 */
export function sanitizeNamePart(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(/\u3000/g, " ")
    .replace(FORBIDDEN_HALF, "_")
    .replace(FORBIDDEN_FULL, "_")
    .replace(/\s+/g, " ")
    .replace(EDGE_HEAD, "")
    .replace(EDGE_TAIL, "");
}

/**
 * 整形の結果、名前として意味のある文字が残っているか。
 *
 * `///` のように全部が禁止文字だった場合、置換の結果は `___` になる。
 * これは「空ではないが名前として使えない」状態なので、`_` で埋めたまま通さずに error にする
 * （計画書 §7-3 の 7・§12-1 の #10）。
 */
export function isUsableNamePart(value: string): boolean {
  return /[^_\s.]/.test(value);
}

/**
 * Windows の予約名を避ける。一致したら末尾に `_` を足す。
 *
 * ⚠ 掛ける対象は**組み上がったステム**（拡張子を除く部分）とフォルダ名。
 *    取引先の断片に掛けると `NUL_20210131_110000.pdf` が `NUL__20210131_110000.pdf` になり、
 *    予約名でもないのに名前が変わってしまう（計画書 §7-3・§12-1 の #11）。
 */
export function avoidReservedName(stem: string): string {
  return WINDOWS_RESERVED.test(stem) ? `${stem}_` : stem;
}

/** "IMG_4821.jpg" → { stem: "IMG_4821", ext: "jpg" }。拡張子が無ければ ext は "" */
export function splitFileName(name: string): { stem: string; ext: string } {
  const i = name.lastIndexOf(".");
  if (i <= 0 || i === name.length - 1) return { stem: name, ext: "" };
  return { stem: name.slice(0, i), ext: name.slice(i + 1) };
}

/* ------------------------------------------------------------------ *
 * 2. 日付・金額・連番
 * ------------------------------------------------------------------ */

/**
 * 取引年月日 → ファイル名の日付部分。西暦だけを出す。
 *
 * ⚠ 和暦は出さない。問50 に「混在は抽出機能の妨げとなる」とあり、
 *    和暦を持たなければ混在が構造的に起きない。
 *
 * 読み取れない値のときは "" を返す（呼び出し側が error にする。0 や今日の日付で埋めない）。
 */
export function formatNameDate(iso: string, format: DateFormat): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? "").trim());
  if (!m) return "";
  return format === "yyyy-mm-dd" ? `${m[1]}-${m[2]}-${m[3]}` : `${m[1]}${m[2]}${m[3]}`;
}

/**
 * 取引金額 → ファイル名の金額部分。
 * カンマ・`¥`・`円` を付けない。0 詰めもしない。マイナスは符号を残す。
 */
export function formatNameAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const n = Math.trunc(amount);
  return Object.is(n, -0) ? "0" : String(n);
}

/** 連番（serial パターン）。桁数は 1〜9 に丸めて 0 詰めする */
export function formatSerial(serial: number, digits: number): string {
  const d = Math.min(9, Math.max(1, Math.trunc(digits) || 1));
  const n = Math.max(1, Math.trunc(serial) || 1);
  return String(n).padStart(d, "0");
}

/* ------------------------------------------------------------------ *
 * 3. 組み立て
 * ------------------------------------------------------------------ */

/** 長さの上限。既定は types.ts の定数。単体検証で狭めるために引数で渡せるようにしてある */
export interface NameLimits {
  /** ファイル名（拡張子込み）の上限 */
  maxName: number;
  /** ZIP 内のパス全体（フォルダ + "/" + ファイル名）の上限 */
  maxPath: number;
}

export const DEFAULT_LIMITS: NameLimits = {
  maxName: MAX_NAME_LENGTH,
  maxPath: MAX_ZIP_PATH_LENGTH,
};

/** ステムの部品。variable ＝切り詰めの対象（取引先、または元のファイル名） */
export type NameSegment = { kind: "fixed"; value: string } | { kind: "variable" };

/** フォルダの決め方 */
export type FolderSpec =
  | { kind: "none" }
  | { kind: "variable" }
  | { kind: "fixed"; value: string };

export interface ComposeInput {
  segments: readonly NameSegment[];
  /** 切り詰めの対象。sanitizeNamePart() を通した後の値を渡す */
  variable: string;
  /** 拡張子（ドットなし）。"" 可 */
  ext: string;
  delimiter: Delimiter;
  /** 1 なら枝番なし。2 以上で `_2` を拡張子の直前に足す */
  seq: number;
  folder: FolderSpec;
  limits: NameLimits;
}

export type NameBuild =
  | {
      ok: true;
      /** フォルダ部分（"" なら ZIP 直下） */
      folder: string;
      /** ファイル名（拡張子込み・フォルダを含まない） */
      name: string;
      /** ZIP 内のパス */
      path: string;
      /** 切り詰めが起きたか */
      truncated: boolean;
    }
  | {
      ok: false;
      /** variable ＝使える文字が残らない／length ＝削っても上限に収まらない */
      reason: "variable" | "length";
    };

/** コードポイント単位で切る（絵文字などのサロゲートペアを割らない） */
function clipCodePoints(value: string, keep: number): string {
  const chars = Array.from(value);
  return chars.length <= keep ? value : chars.slice(0, keep).join("");
}

/** フォルダ名。予約名を避け、`_未処理` と丸かぶりしたら `_未処理_1` にする（計画書 §7-6） */
function folderNameOf(value: string): string {
  const f = avoidReservedName(value);
  return f === UNMATCHED_FOLDER ? `${UNMATCHED_FOLDER}_1` : f;
}

/** variable を keep 文字まで縮めて 1 通り組む。使えない形になったら null */
function composeAt(input: ComposeInput, keep: number, usesVariable: boolean): {
  folder: string;
  name: string;
  path: string;
} | null {
  let v = "";
  if (usesVariable) {
    v = trimNameEdges(clipCodePoints(input.variable, keep));
    if (!isUsableNamePart(v)) return null;
  }

  const parts: string[] = [];
  for (const seg of input.segments) {
    const value = seg.kind === "fixed" ? seg.value : v;
    if (value !== "") parts.push(value);
  }
  if (parts.length === 0) return null;

  let stem = parts.join(input.delimiter);
  if (input.seq > 1) stem += `${input.delimiter}${input.seq}`;
  stem = avoidReservedName(stem);

  const name = input.ext === "" ? stem : `${stem}.${input.ext}`;

  let folder = "";
  if (input.folder.kind === "variable") folder = folderNameOf(v);
  else if (input.folder.kind === "fixed") folder = input.folder.value;

  return { folder, name, path: folder === "" ? name : `${folder}/${name}` };
}

/**
 * 上限に収まる形を作る（計画書 §7-4）。
 *
 * 収まらないときは **variable（取引先名／元のファイル名）だけを後ろから削る**。
 * 日付・金額・枝番・拡張子は削らない。削っても収まらなければ error。
 */
export function buildName(input: ComposeInput): NameBuild {
  const usesVariable =
    input.folder.kind === "variable" || input.segments.some((s) => s.kind === "variable");

  const full = Array.from(input.variable).length;
  const start = usesVariable ? full : 0;

  for (let keep = start; keep >= 0; keep--) {
    const c = composeAt(input, keep, usesVariable);
    if (!c) {
      // 削るほど中身は減る一方なので、ここから先も使えない。
      // 1回目（＝1文字も削っていない）で使えないなら取引先そのものが空、
      // 途中で使えなくなったなら「削っても収まらなかった」ということ。
      return { ok: false, reason: usesVariable && keep === start ? "variable" : "length" };
    }
    if (c.name.length <= input.limits.maxName && c.path.length <= input.limits.maxPath) {
      return { ok: true, ...c, truncated: usesVariable && keep < full };
    }
    if (!usesVariable) break;
  }
  return { ok: false, reason: "length" };
}

/* ------------------------------------------------------------------ *
 * 4. 台帳の行 → ファイル名
 * ------------------------------------------------------------------ */

export interface RowNameInput {
  /** 取引年月日 YYYY-MM-DD */
  date: string;
  /** 取引先（台帳の原文。ここで整形する） */
  vendor: string;
  /** 取引金額（円・整数） */
  amount: number;
  /** 拡張子（ドットなし）。小文字に揃えて渡す */
  ext: string;
  /** 索引簿の連番。serial パターンのときファイル名になる */
  serial: number;
  /** 1 なら枝番なし */
  seq: number;
  options: NamingOptions;
  limits?: NameLimits;
}

/** 命名パターン → ステムの並び（folder: vendor_short のときは取引先を省く） */
function segmentsFor(
  options: NamingOptions,
  datePart: string,
  amountPart: string,
  serialPart: string,
): NameSegment[] {
  const dateSeg: NameSegment = { kind: "fixed", value: datePart };
  const amountSeg: NameSegment = { kind: "fixed", value: amountPart };
  const vendorSeg: NameSegment = { kind: "variable" };
  const short = options.folder === "vendor_short";

  switch (options.pattern) {
    case "serial":
      return [{ kind: "fixed", value: serialPart }];
    case "date_amount_vendor":
      return short ? [dateSeg, amountSeg] : [dateSeg, amountSeg, vendorSeg];
    case "vendor_date_amount":
      return short ? [dateSeg, amountSeg] : [vendorSeg, dateSeg, amountSeg];
    case "date_vendor_amount":
    default:
      return short ? [dateSeg, amountSeg] : [dateSeg, vendorSeg, amountSeg];
  }
}

/** 台帳1行ぶんの ZIP 内パスを決める。日付・金額が読めないときは error（推測で埋めない） */
export function buildRowName(input: RowNameInput): NameBuild | { ok: false; reason: "date" | "amount" } {
  const { options } = input;
  const datePart = formatNameDate(input.date, options.dateFormat);
  const amountPart = formatNameAmount(input.amount);

  // serial パターンではファイル名に日付も金額も出ないが、索引簿には必ず載るので検証は行う
  if (datePart === "") return { ok: false, reason: "date" };
  if (amountPart === "") return { ok: false, reason: "amount" };

  const serialPart = formatSerial(input.serial, options.serialDigits);
  const segments = segmentsFor(options, datePart, amountPart, serialPart);

  return buildName({
    segments,
    variable: sanitizeNamePart(input.vendor),
    ext: sanitizeNamePart(input.ext).toLowerCase(),
    delimiter: options.delimiter,
    seq: input.seq,
    folder: options.folder === "none" ? { kind: "none" } : { kind: "variable" },
    limits: input.limits ?? DEFAULT_LIMITS,
  });
}

/* ------------------------------------------------------------------ *
 * 5. 台帳に紐付かなかったファイル → `_未処理/`
 * ------------------------------------------------------------------ */

/**
 * 元の名前が丸ごと使えなかったときの代わり。
 * ⚠ ここで error にして落とすと証憑そのものが失われる（計画書 §13 の 3）。落とさずに入れる。
 */
export const UNMATCHED_FALLBACK_STEM = "file";

export interface UnmatchedNameInput {
  /** 元のファイル名（拡張子込み・パスを含まない） */
  originalName: string;
  delimiter: Delimiter;
  seq: number;
  limits?: NameLimits;
}

/**
 * `_未処理/<元の名前>` を決める。
 * 拡張子の大小はそのまま残す（付け替えるのは名前だけ、という約束を崩さない）。
 */
export function buildUnmatchedName(input: UnmatchedNameInput): NameBuild {
  const { stem, ext } = splitFileName(input.originalName);
  const cleaned = sanitizeNamePart(stem);
  const variable = isUsableNamePart(cleaned) ? cleaned : UNMATCHED_FALLBACK_STEM;

  return buildName({
    segments: [{ kind: "variable" }],
    variable,
    ext: sanitizeNamePart(ext),
    delimiter: input.delimiter,
    seq: input.seq,
    folder: { kind: "fixed", value: UNMATCHED_FOLDER },
    limits: input.limits ?? DEFAULT_LIMITS,
  });
}
