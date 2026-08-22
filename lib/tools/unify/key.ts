/**
 * 列マッピング統合ツール（T-04） — 見出しの照合キー
 *
 * ⚠ ここは `_shared/sheetReader` の normalizeHeader / toHalfWidth を import していない。理由は2つ。
 *
 *   1) **バンドル境界。** sheetReader は先頭で `import { unzipSync } from "fflate"` している。
 *      静的層（画面が最初から読む層）がそこから値を1つでも import すると、
 *      ページを開いただけで fflate が落ちてくる（共通仕様 §6 に反する）。
 *
 *   2) **仕様。** 共通仕様の判断表で「normalizeHeader の小文字化」と
 *      「toHalfWidth への半角カナ変換の追加」は **却下** され、
 *      「必要なツールはローカルに unifyKey を持つこと」「半角カナ→全角＋濁点合成は
 *      自分の名前空間に持つ」と決まっている。
 *
 *   全角→半角・空白落とし・括弧落としの規則は normalizeHeader と同じものを写している。
 *   **_shared 側を変えない限り、ここも変えないこと。**
 */

/** 全角英数記号 → 半角、全角スペース → 半角スペース（_shared/toHalfWidth と同じ規則） */
function toHalfWidthAscii(s: string): string {
  return s
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

/** 空白と括弧を落とす（_shared/normalizeHeader と同じ規則） */
function stripDecoration(s: string): string {
  return s
    .replace(/[\s　]+/g, "")
    .replace(/[()［］[\]【】]/g, "")
    .trim();
}

/* ------------------------------------------------------------------ *
 * 半角カナ → 全角カナ
 * 基幹システムが吐く CSV の見出しは半角カナのことが実際にある。
 * ------------------------------------------------------------------ */

const HALF_KANA_START = 0xff61; // ｡
/** U+FF61〜U+FF9D と1文字ずつ対応する（61文字） */
const FULL_KANA =
  "。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン";

const VOICED_MARK = "ﾞ"; // ﾞ
const SEMI_VOICED_MARK = "ﾟ"; // ﾟ

const VOICED: Record<string, string> = {
  ウ: "ヴ",
  カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ",
  サ: "ザ", シ: "ジ", ス: "ズ", セ: "ゼ", ソ: "ゾ",
  タ: "ダ", チ: "ヂ", ツ: "ヅ", テ: "デ", ト: "ド",
  ハ: "バ", ヒ: "ビ", フ: "ブ", ヘ: "ベ", ホ: "ボ",
};

const SEMI_VOICED: Record<string, string> = {
  ハ: "パ", ヒ: "ピ", フ: "プ", ヘ: "ペ", ホ: "ポ",
};

/**
 * 半角カタカナを全角カタカナへ直す。濁点・半濁点は直前の1文字と合成する。
 * 例：`ﾄﾘﾋｷｻｷｺｰﾄﾞ` → `トリヒキサキコード`
 */
export function toFullKana(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const idx = code - HALF_KANA_START;
    if (idx < 0 || idx >= FULL_KANA.length) {
      out += s[i];
      continue;
    }
    let full = FULL_KANA[idx];
    const next = s[i + 1];
    if (next === VOICED_MARK && VOICED[full]) {
      full = VOICED[full];
      i++;
    } else if (next === SEMI_VOICED_MARK && SEMI_VOICED[full]) {
      full = SEMI_VOICED[full];
      i++;
    }
    out += full;
  }
  return out;
}

/**
 * 見出しの照合キー。
 *
 * 全角→半角 → 空白と括弧を落とす → 半角カナを全角へ → 小文字化 →
 * 区切り記号を落とす → 先頭の飾り記号を落とす。
 *
 * 例：`得意先名（略称）` → `得意先名略称` ／ `Customer_Name` → `customername`
 */
export function unifyKey(raw: string): string {
  return toFullKana(stripDecoration(toHalfWidthAscii(raw)))
    .toLowerCase()
    .replace(/[_\-.・／/]/g, "")
    .replace(/^[#※◆●○■□★☆]+/, "");
}
