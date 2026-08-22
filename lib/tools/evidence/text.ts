/**
 * 電帳法ファイル名 一括リネーム — 依存ゼロの文字ユーティリティ
 *
 * ★なぜ `_shared/sheetReader` から取らないのか
 *
 * `_shared/sheetReader.ts` は先頭で `import { unzipSync } from "fflate"` している。
 * `calc.ts` は画面から**静的に** import される（命名オプションを変えるたびに同期で
 * 呼ぶため動的にできない）ので、そこから sheetReader を辿ると
 * **fflate がページの初期バンドルへ入ってしまう**。
 * 共通仕様 §8-5 の「重い依存はすべて動的 import」が静かに破れる。
 *
 * そこで、`toHalfWidth` と `pad2` だけをここに写して依存を断ち切っている。
 *
 * ⚠ 中身は `_shared/sheetReader.ts` の同名関数と**1文字も違えてはいけない**。
 *    照合キー（calc.ts の matchKey）と台帳の読み取り（parse.ts は sheetReader 側を使う）で
 *    正規化がずれると、紐付くはずのファイルが紐付かなくなる。
 *    `._main_text.mts` で全角英数記号の全域について同一性を機械的に検証している。
 *
 * ⚠ ここに表示整形（formatYen 等）を足さないこと。それは `_shared/format.ts` の役目で、
 *    format.ts は依存ゼロなので画面から直接 import してよい。
 */

/** 全角英数記号 → 半角、全角スペース → 半角スペース（_shared/sheetReader と同一） */
export function toHalfWidth(s: string): string {
  return s
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

/** 1桁なら 0 を足して2桁にする（_shared/sheetReader と同一） */
export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}
