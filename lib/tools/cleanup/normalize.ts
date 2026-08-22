/**
 * 名簿クレンジングツール（T-05） — 文字単位の変換の原始関数
 *
 * ⚠ この層は一切ネットワークへ出ない（共通仕様 §3-1）。fetch / "use server" を書かない。
 *
 * ⚠ **`_shared/sheetReader` を import しない。** UI がこのファイルを静的 import するので、
 *    import すると `fflate` が初期バンドルへ落ちてくる（共通仕様 §8-5）。
 *    `toHalfWidth` 相当・`normalizeHeader` 相当が要るときは、このファイルにローカルに持つ
 *    （`_shared` へ足すのは却下されている＝共通仕様 §4 の判断表）。
 *
 * ⚠ **NFKC を使わない**（計画書 §8-4）。使ってよいのは `normalize("NFC")` だけ。
 *    互換分解が必要な変換（半角カナ・丸数字・㈱・全角英数）は、
 *    **自前の対応表で1つずつ、独立した関数として持つ**。そうして初めて
 *    「規則を1つずつ ON/OFF できる」「何をしたか記録できる」という設計が成立する。
 *
 * ⚠ **サロゲートペアを壊さない。** 𠮷（U+20BB7）や絵文字を含む文字列が通る。
 *    1文字ずつ見る処理は必ず `Array.from` / `for...of`（コードポイント単位）で回す。
 *    `charAt` / `slice` / `split("")` は UTF-16 コードユニット単位なので使わない。
 *
 * ⚠ **変化しないときは受け取った文字列をそのまま返す**（`===` で同一性を比較できるように）。
 *
 * ⚠ 不可視文字・空白・ハイフン類・チルダ類は、**ソースに生の文字を書かず `\u` エスケープで書く**。
 *    生の制御文字を書くと git がソースをバイナリ扱いする（共通仕様 §7-3）。
 */

import type { DiffSpan } from "./types";

/* ------------------------------------------------------------------ *
 * 半角カナ → 全角カナ（濁点・半濁点は次の1文字と合成する）
 * ------------------------------------------------------------------ */

/**
 * U+FF61–FF9F（63文字）に **Unicode の並び順そのままで** 1対1に対応する全角文字。
 *
 * ⚠ 添字＝`codePoint - 0xFF61`。並び替えない・1文字も足し引きしない。
 *    長さが 63 でなくなった時点で対応が全部ずれる（§14-1 で長さを実測する）。
 *
 * 半角側の並び＝ ｡｢｣､･ ｦ ｧｨｩｪｫ ｬｭｮ ｯ ｰ ｱｲｳｴｵ ｶ〜ｺ ｻ〜ｿ ﾀ〜ﾄ ﾅ〜ﾉ ﾊ〜ﾎ ﾏ〜ﾓ ﾔﾕﾖ ﾗ〜ﾛ ﾜﾝ ﾞﾟ
 */
const HALF_KANA_FULL =
  "。「」、・" + // 。「」、・
  "ヲ" + // ヲ
  "ァィゥェォ" + // ァィゥェォ
  "ャュョ" + // ャュョ
  "ッ" + // ッ
  "ー" + // ー
  "アイウエオ" + // アイウエオ
  "カキクケコ" + // カキクケコ
  "サシスセソ" + // サシスセソ
  "タチツテト" + // タチツテト
  "ナニヌネノ" + // ナニヌネノ
  "ハヒフヘホ" + // ハヒフヘホ
  "マミムメモ" + // マミムメモ
  "ヤユヨ" + // ヤユヨ
  "ラリルレロ" + // ラリルレロ
  "ワン" + // ワン
  "゛゜"; // ゛゜（単独の濁点・半濁点）

/** 半角カナの濁点 U+FF9E */
const HALF_VOICED_MARK = "ﾞ";
/** 半角カナの半濁点 U+FF9F */
const HALF_HANDAKU_MARK = "ﾟ";

/** 全角カナ → 濁点付きの1文字（半角では2文字ぶんが、全角では1文字に縮む） */
const VOICED_PAIRS =
  "カガキギクグケゲコゴ" + // カガ キギ クグ ケゲ コゴ
  "サザシジスズセゼソゾ" + // サザ シジ スズ セゼ ソゾ
  "タダチヂツヅテデトド" + // タダ チヂ ツヅ テデ トド
  "ハバヒビフブヘベホボ" + // ハバ ヒビ フブ ヘベ ホボ
  "ウヴ" + // ウヴ
  "ワヷ" + // ワヷ
  "ヲヺ"; // ヲヺ

/** 全角カナ → 半濁点付きの1文字 */
const HANDAKU_PAIRS =
  "ハパヒピフプヘペホポ"; // ハパ ヒピ フプ ヘペ ホポ

function buildPairMap(pairs: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    map.set(pairs[i], pairs[i + 1]);
  }
  return map;
}

const VOICED_MAP = buildPairMap(VOICED_PAIRS);
const HANDAKU_MAP = buildPairMap(HANDAKU_PAIRS);

/** 半角カナ（U+FF61–FF9F）が1文字でも含まれるか */
const HAS_HALF_KANA = /[｡-ﾟ]/;

/**
 * 半角カナを全角カナにする（R05）。
 *
 * - `ｶﾞ` → `ガ` ／ `ﾊﾟ` → `パ` ／ `ｳﾞ` → `ヴ`（**2文字が1文字に縮む**）
 * - `｡｢｣､･ｰ` → `。「」、・ー`
 * - 濁点が付かない文字の後ろに `ﾞ` が単独で来た場合は**合成しない**（`ｱﾞ` → `ア゛`）
 */
export function halfWidthKanaToFull(s: string): string {
  if (!HAS_HALF_KANA.test(s)) return s;
  const chars = Array.from(s);
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0xff61 || code > 0xff9f) {
      out.push(ch);
      continue;
    }
    const base = HALF_KANA_FULL[code - 0xff61];
    const next = chars[i + 1];
    if (next === HALF_VOICED_MARK) {
      const voiced = VOICED_MAP.get(base);
      if (voiced !== undefined) {
        out.push(voiced);
        i++;
        continue;
      }
    } else if (next === HALF_HANDAKU_MARK) {
      const handaku = HANDAKU_MAP.get(base);
      if (handaku !== undefined) {
        out.push(handaku);
        i++;
        continue;
      }
    }
    out.push(base);
  }
  const result = out.join("");
  return result === s ? s : result;
}

/* ------------------------------------------------------------------ *
 * 全角英数記号 → 半角
 * ------------------------------------------------------------------ */

const HAS_FULL_ALNUM = /[！-｝]/;

/**
 * 全角英数字・全角記号を半角にする（R07）。**U+FF01–FF5D**（`！` 〜 `｝`）。
 *
 * ⚠ **全角空白（U+3000）は触らない。** それは R06（ideographicSpace）の担当。
 *    `_shared/toHalfWidth` は U+3000 も半角空白へ変えるので、そこだけ挙動が違う。
 *
 * ⚠ **全角チルダ `～`（U+FF5E）を範囲から外してある。**（`_shared/toHalfWidth` は U+FF5E まで含む）
 *    理由は2つ。
 *    1. **計画書 §8-4-5 の指摘そのもの。** `～`(U+FF5E) だけを半角 `~` にして
 *       `〜`(U+301C 波ダッシュ) を残すと、**見た目がほぼ同じ2文字のうち片方だけが半角になり、
 *       ゆれを直すつもりでゆれが増える**。この2文字の扱いは R15（waveDash）が一手に引き受ける。
 *    2. **R15 との連鎖が冪等でなくなる。** 適用順は R07（7番）→ R15（15番）。
 *       R15 が `〜` を `～` に寄せた結果を、次の実行で R07 が `~` に変えてしまい、
 *       `apply(apply(x)) !== apply(x)` になる（`._check-a.mts` で実測して発見）。
 *    ⚠ この1文字だけは §8-2 の表（「U+FF01–FF5E」）から外れる。**メインCCへ報告済みの意図的な差**。
 */
export function fullWidthAlnumToHalf(s: string): string {
  if (!HAS_FULL_ALNUM.test(s)) return s;
  return s.replace(/[！-｝]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/* ------------------------------------------------------------------ *
 * ひらがな → カタカナ
 * ------------------------------------------------------------------ */

const HAS_HIRAGANA = /[ぁ-ゖ]/;

/**
 * ひらがなをカタカナにする（R14）。
 * ⚠ `ゝ`（U+309D）`ゞ`（U+309E）は範囲外なので触らない（繰り返し記号）。
 */
export function hiraganaToKatakana(s: string): string {
  if (!HAS_HIRAGANA.test(s)) return s;
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/* ------------------------------------------------------------------ *
 * ハイフン類 / 長音
 * ------------------------------------------------------------------ */

/**
 * R09 が半角ハイフンへ寄せるハイフン類（半角ハイフン U+002D 自身は含めない）。
 * U+2010–2015（ハイフン〜水平バー）／ U+2043（箇条書きのハイフン）／
 * U+2212（マイナス）／ U+FE63（小字形のハイフン）／ U+FF0D（全角ハイフンマイナス）
 *
 * ⚠ **U+30FC（ー 長音記号）を入れない。** 入れると「データ」が「デ-タ」になる。
 */
const HYPHEN_LIKE_G = /[‐-―⁃−﹣－]/g;
const HYPHEN_LIKE = /[‐-―⁃−﹣－]/;

/** ハイフン類を半角ハイフンに揃える（R09） */
export function unifyHyphens(s: string): string {
  if (!HYPHEN_LIKE.test(s)) return s;
  return s.replace(HYPHEN_LIKE_G, "-");
}

/**
 * カナの直後のハイフン類を長音記号 `ー`（U+30FC）にする（R10）。
 *
 * ⚠ **半角ハイフン `-` も対象にする。** R09 が先に各種ダッシュを `-` へ寄せる前提だが、
 *    R09 が OFF のときにも効くようダッシュ類も直接持つ（計画書 §8-3-4・§8-3-5 の作法）。
 * ⚠ 直前がカナ（U+3041–309F ひらがな / U+30A1–30FA カタカナ）のときだけ。
 *    U+30FC 自身は「カナ」に含めない＝`アー-` は `アー-` のまま＝2回目で何も起きない（冪等）。
 */
const KANA_THEN_HYPHEN_G = /([ぁ-ゟァ-ヺ])[-‐-―⁃−﹣－]/g;
const KANA_THEN_HYPHEN = /[ぁ-ゟァ-ヺ][-‐-―⁃−﹣－]/;

export function prolongedAfterKana(s: string): string {
  if (!KANA_THEN_HYPHEN.test(s)) return s;
  return s.replace(KANA_THEN_HYPHEN_G, (_matched, kana: string) => kana + "ー");
}

/* ------------------------------------------------------------------ *
 * 法人格
 * ------------------------------------------------------------------ */

/**
 * 法人格の略記を開く（R08）。**位置は変えない**（前株・後株の入れ替えは商号を変えること＝§8-5）。
 *
 * ⚠ 全角括弧版（`（株）`）も直接持つ。R07（全角→半角）が OFF のときにも効かせるため（§8-3-5）。
 * ⚠ 冪等：`株式会社ミナト` を `株式会社株式会社ミナト` にしない。
 *    開いたあとの文字列に `㈱` `(株)` `株)` は残らないので、2回目は必ず何も起きない。
 */
const CORPORATE_OPEN: readonly (readonly [RegExp, string])[] = [
  [/㈱/g, "株式会社"], // ㈱
  [/㍿/g, "株式会社"], // ㍿
  [/㈲/g, "有限会社"], // ㈲
  [/[(（]株[)）]/g, "株式会社"], // (株) （株） (株） （株)
  [/[(（]有[)）]/g, "有限会社"], // (有) （有）
  [/株[)）]/g, "株式会社"], // 開き括弧が欠けた「ミナト株)」
];

const HAS_CORPORATE_MARK = /[㈱㈲㍿]|[(（][株有][)）]|株[)）]/;

export function openCorporateForm(s: string): string {
  if (!HAS_CORPORATE_MARK.test(s)) return s;
  let out = s;
  for (const [re, to] of CORPORATE_OPEN) {
    out = out.replace(re, to);
  }
  return out === s ? s : out;
}

/**
 * 比較キー用に法人格語を落とす（計画書 §9-2 の9番）。
 *
 * ⚠ **値の書き換えには使わない。** 重複判定の比較キーを作るときだけ使う。
 *    これがあるので「株式会社ミナト」と「ミナト株式会社」が同じキーになる（＝検出はする／値は直さない）。
 * ⚠ 長い語から先に落とす（「一般社団法人」が「社団法人」で先に削れると「一般」が残る）。
 */
const CORPORATE_WORDS: readonly string[] = [
  "特定非営利活動法人",
  "一般社団法人",
  "一般財団法人",
  "公益社団法人",
  "公益財団法人",
  "社会福祉法人",
  "独立行政法人",
  "国立大学法人",
  "医療法人社団",
  "学校法人",
  "宗教法人",
  "医療法人",
  "社団法人",
  "財団法人",
  "NPO法人",
  "npo法人", // 比較キーは英字を小文字化したあとで来ることがある（§9-2 の5番→9番）
  "株式会社",
  "有限会社",
  "合同会社",
  "合名会社",
  "合資会社",
  "相互会社",
  "協同組合",
  "（株）", // （株）
  "（有）", // （有）
  "(株)",
  "(有)",
  "㈱", // ㈱
  "㈲", // ㈲
  "㍿", // ㍿
  "株)",
  "有)",
];

const CORPORATE_WORDS_SORTED: readonly string[] = [...CORPORATE_WORDS].sort(
  (a, b) => b.length - a.length,
);

export function stripCorporateForm(s: string): string {
  let out = s;
  // 「株式株式会社会社」のような病的な入力でも安定させるため、変化しなくなるまで（最大4回）繰り返す
  for (let pass = 0; pass < 4; pass++) {
    const before = out;
    for (const word of CORPORATE_WORDS_SORTED) {
      if (out.indexOf(word) >= 0) out = out.split(word).join("");
    }
    if (out === before) break;
  }
  return out === s ? s : out;
}

/* ------------------------------------------------------------------ *
 * 括弧 / 丸数字 / 異体字 / 漢数字
 * ------------------------------------------------------------------ */

const BRACKET_MAP: ReadonlyMap<string, string> = new Map([
  ["（", "("],
  ["）", ")"],
  ["［", "["],
  ["］", "]"],
  ["｛", "{"],
  ["｝", "}"],
]);

const FULL_BRACKET_G = /[（）［］｛｝]/g;
const HAS_FULL_BRACKET = /[（）［］｛｝]/;

/** 全角括弧を半角に揃える（R11）。`（）［］｛｝` → `()[]{}` */
export function unifyBrackets(s: string): string {
  if (!HAS_FULL_BRACKET.test(s)) return s;
  return s.replace(FULL_BRACKET_G, (c) => BRACKET_MAP.get(c) ?? c);
}

const CIRCLED_G = /[①-⑳Ⅰ-Ⅹⅰ-ⅹ]/g;
const HAS_CIRCLED = /[①-⑳Ⅰ-Ⅹⅰ-ⅹ]/;

/**
 * 丸数字・ローマ数字を素の数字にする（R16・danger）。
 * ①–⑳（U+2460–2473）→ 1–20 ／ Ⅰ–Ⅹ（U+2160–2169）→ 1–10 ／ ⅰ–ⅹ（U+2170–2179）→ 1–10
 *
 * ⚠ U+216A–216F（Ⅺ Ⅻ Ⅼ Ⅽ Ⅾ Ⅿ）は**対象外**。仕様が Ⅰ–Ⅹ に限っているため。
 */
export function circledToPlain(s: string): string {
  if (!HAS_CIRCLED.test(s)) return s;
  return s.replace(CIRCLED_G, (c) => {
    const code = c.charCodeAt(0);
    if (code >= 0x2460) return String(code - 0x2460 + 1);
    if (code >= 0x2170) return String(code - 0x2170 + 1);
    return String(code - 0x2160 + 1);
  });
}

/**
 * 異体字 → 常用字体の対応表（R17・danger）。
 *
 * ⚠ **網羅は目指さない。** 厚労省の異体字リストは PDF で機械可読でないため、
 *    人名・社名で頻出する字だけを手で選んである（計画書 §16-1-6）。
 *    画面には「対応表に載っている字だけを直します」と書く。
 * ⚠ `𠮷`（U+20BB7・つちよし）は**サロゲートペア**。`Array.from` / `for...of` を使わない実装は必ず壊れる。
 * ⚠ 値の側（常用字体）が鍵の側に現れてはいけない。現れると冪等でなくなる。
 * ⚠ NFC（R03）で正字へ落ちる互換漢字（例 U+FA19 神）はここに載せない。R03 が先に済ませている。
 */
const VARIANT_PAIRS: readonly (readonly [string, string])[] = [
  ["髙", "高"],
  ["﨑", "崎"],
  ["嵜", "崎"],
  ["德", "徳"],
  ["齋", "斎"],
  ["齊", "斉"],
  ["濵", "浜"],
  ["濱", "浜"],
  ["邉", "辺"],
  ["邊", "辺"],
  ["峯", "峰"],
  ["\u{20BB7}", "吉"], // 𠮷（つちよし）★サロゲートペア
  ["惠", "恵"],
  ["澤", "沢"],
  ["瀨", "瀬"],
  ["眞", "真"],
  ["榮", "栄"],
  ["曾", "曽"],
  ["桒", "桑"],
  ["栁", "柳"],
  ["藪", "薮"],
  ["槇", "槙"],
  ["增", "増"],
  ["靑", "青"],
  ["國", "国"],
  ["圓", "円"],
  ["學", "学"],
  ["廣", "広"],
  ["條", "条"],
  ["郞", "郎"],
  ["萬", "万"],
  ["兒", "児"],
  ["傳", "伝"],
  ["澁", "渋"],
  ["團", "団"],
  ["應", "応"],
  ["樂", "楽"],
  ["藥", "薬"],
  ["鐵", "鉄"],
  ["縣", "県"],
  ["塲", "場"],
  ["恆", "恒"],
  ["龍", "竜"],
  ["龝", "秋"],
  ["舘", "館"],
  ["檜", "桧"],
  ["禮", "礼"],
  ["壽", "寿"],
  ["醫", "医"],
  ["驛", "駅"],
];

export const VARIANT_KANJI: ReadonlyMap<string, string> = new Map(VARIANT_PAIRS);

/** 異体字を常用字体へ寄せる（R17）。**`VARIANT_KANJI` に載っている字だけ** */
export function variantToStandard(s: string): string {
  let changed = false;
  const out: string[] = [];
  for (const ch of s) {
    const replaced = VARIANT_KANJI.get(ch);
    if (replaced !== undefined) {
      out.push(replaced);
      changed = true;
    } else {
      out.push(ch);
    }
  }
  return changed ? out.join("") : s;
}

const KANJI_DIGIT_MAP: ReadonlyMap<string, number> = new Map([
  ["〇", 0],
  ["零", 0],
  ["一", 1],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
]);

const KANJI_UNIT_MAP: ReadonlyMap<string, number> = new Map([
  ["十", 10],
  ["百", 100],
  ["千", 1000],
]);

/** 漢数字の並び → 算用数字。読めなければ null（読めないものは触らない） */
function kanjiRunToArabic(run: string): string | null {
  if (run === "") return null;
  if (!/[十百千]/.test(run)) {
    // 位取りが無いので1字1桁として連ねる（「一二三」→ 123）
    let digits = "";
    for (const ch of run) {
      const d = KANJI_DIGIT_MAP.get(ch);
      if (d === undefined) return null;
      digits += String(d);
    }
    return digits === "" ? null : digits;
  }
  let total = 0;
  let digit = 0;
  let hasDigit = false;
  for (const ch of run) {
    const d = KANJI_DIGIT_MAP.get(ch);
    if (d !== undefined) {
      digit = digit * 10 + d;
      hasDigit = true;
      continue;
    }
    const unit = KANJI_UNIT_MAP.get(ch);
    if (unit === undefined) return null;
    total += (hasDigit ? digit : 1) * unit;
    digit = 0;
    hasDigit = false;
  }
  return String(total + digit);
}

const HAS_KANJI_NUMERAL = /[〇零一二三四五六七八九十百千]/;
const KANJI_ADDRESS_G = /([〇零一二三四五六七八九十百千]+)(丁目|番地|番|号)/g;

/**
 * 住所の漢数字を算用数字にする（R18・danger・`address` 役割のみ）。
 *
 * ⚠ **丁目 / 番地 / 番 / 号 の直前の漢数字だけ**を変換する。それ以外は絶対に触らない。
 *    列を限定しないと「第一生命」→「第1生命」、「一般社団法人」→「1般社団法人」になる。
 *    この関数自体も、後ろに丁目/番地/番/号が無い漢数字には一切手を出さない。
 * ⚠ 十・百・千の位取りを解く（`三十八号` → `38号`）。
 */
export function kanjiNumeralInAddress(s: string): string {
  if (!HAS_KANJI_NUMERAL.test(s)) return s;
  const out = s.replace(KANJI_ADDRESS_G, (matched: string, run: string, unit: string) => {
    const arabic = kanjiRunToArabic(run);
    return arabic === null ? matched : arabic + unit;
  });
  return out === s ? s : out;
}

/* ------------------------------------------------------------------ *
 * 空白 / 不可視文字
 * ------------------------------------------------------------------ */

/**
 * 除去する不可視文字か（U+0000–001F・U+007F・U+200B–200D・U+FEFF）。
 *
 * ⚠ **ソースに生の制御文字を1バイトも書かないため、正規表現ではなくコードで判定する。**
 *    生の制御文字を書くと git がソースをバイナリ扱いする（共通仕様 §7-3）。
 */
function isDroppedInvisible(code: number): boolean {
  if (code <= 0x1f) return true; // U+0000–001F（タブ・改行を含む）
  if (code === 0x7f) return true; // U+007F DELETE
  if (code >= 0x200b && code <= 0x200d) return true; // ゼロ幅スペース・ZWNJ・ZWJ
  return code === 0xfeff; // BOM / ゼロ幅ノーブレークスペース
}

/** U+00A0 NO-BREAK SPACE（半角空白へ寄せる） */
const NBSP_CODE = 0xa0;

/**
 * 不可視文字を落とす（R02）。
 * U+0000–001F・U+007F・U+200B–200D・U+FEFF を除去し、U+00A0（改行しない空白）は半角空白へ。
 *
 * ⚠ U+0000–001F にはタブ・改行も含まれる＝**セル内改行も除去される**（仕様どおり）。
 */
export function stripControlChars(s: string): string {
  let found = false;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === NBSP_CODE || isDroppedInvisible(code)) {
      found = true;
      break;
    }
  }
  if (!found) return s;
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === NBSP_CODE) {
      out += " ";
      continue;
    }
    if (isDroppedInvisible(code)) continue;
    out += ch;
  }
  return out;
}

const HAS_MULTI_SPACE = /[\s　]{2,}/;
const MULTI_SPACE_G = /[\s　]{2,}/g;

/**
 * 連続する空白を半角空白1つにまとめる（R04）。
 *
 * ⚠ **全角空白（U+3000）も「空白」として数える**（計画書 §8-3-3）。
 *    こうしておくと R06（全角空白→半角空白）より前に置いても結果が変わらない＝再適用が要らない。
 */
export function collapseSpaces(s: string): string {
  if (!HAS_MULTI_SPACE.test(s)) return s;
  return s.replace(MULTI_SPACE_G, " ");
}

const SPACE_CHAR = /[\s　]/;

/**
 * R01 が端で読み飛ばしてよい文字か＝空白 ∪ R02 が落とす不可視文字。
 *
 * ⚠ **なぜ不可視文字まで見るのか（順序を変えないための工夫・計画書 §8-3-3 と同じ考え方）**
 *    適用順は R01（trim）→ R02（不可視文字）である。もし R01 が不可視文字で止まると、
 *    `<ZWSP><NBSP>山田` は R01 で何も起きず、R02 が `␣山田` を作り、**先頭に空白が残ったまま**になる。
 *    次にもう一度通すと今度は R01 が落とすので、**規則の連鎖が冪等でなくなる**。
 *    そこで R01 は、端の不可視文字を**読み飛ばして**その先の空白まで落とす。
 * ⚠ ただし **不可視文字そのものは落とさない**（それは R02 の仕事）。
 *    R02 を OFF にした利用者の意思を R01 が勝手に覆さないため。
 */
function isTrimEdgeChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  if (isDroppedInvisible(code) || code === NBSP_CODE) return true;
  return SPACE_CHAR.test(ch);
}

/** 前後の半角空白・全角空白・タブを落とす（R01）。不可視文字は残す（R02 の担当） */
export function trimBoth(s: string): string {
  if (s === "") return s;
  if (!isTrimEdgeChar(s.charAt(0)) && !isTrimEdgeChar(s.charAt(s.length - 1))) return s;

  const chars = Array.from(s);
  const total = chars.length;
  let head = "";
  let start = 0;
  while (start < total && isTrimEdgeChar(chars[start])) {
    const code = chars[start].codePointAt(0) ?? 0;
    if (isDroppedInvisible(code)) head += chars[start];
    start++;
  }
  if (start >= total) return head === s ? s : head;

  let tail = "";
  let end = total;
  while (end > start && isTrimEdgeChar(chars[end - 1])) {
    const code = chars[end - 1].codePointAt(0) ?? 0;
    if (isDroppedInvisible(code)) tail = chars[end - 1] + tail;
    end--;
  }

  const result = head + chars.slice(start, end).join("") + tail;
  return result === s ? s : result;
}

/* ------------------------------------------------------------------ *
 * 差分位置
 * ------------------------------------------------------------------ */

/**
 * 修正前・修正後の差分位置（共通の接頭と接尾を剥がして中央だけを囲む）。計画書 §8-6。
 *
 * ⚠ サロゲートペア（絵文字・一部の異体字）を壊さないよう、必ず**コードポイント単位**で比較する。
 * ⚠ UI 側も `Array.from` で切ること。`String.prototype.slice` は UTF-16 コードユニット単位なのでズレる。
 */
export function diffSpan(before: string, after: string): DiffSpan {
  const a = Array.from(before);
  const b = Array.from(after);
  let s = 0;
  const max = Math.min(a.length, b.length);
  while (s < max && a[s] === b[s]) s++;
  let ea = a.length;
  let eb = b.length;
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) {
    ea--;
    eb--;
  }
  return { beforeStart: s, beforeEnd: ea, afterStart: s, afterEnd: eb };
}
