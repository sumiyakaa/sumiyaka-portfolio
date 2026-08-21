/**
 * /tools 共通 — 表示整形ヘルパー
 *
 * 画面と PDF の双方でこの書式規則を使う。
 * ⚠ 新規ツールはここを使う。ツール内にローカルな整形関数を作らないこと。
 */

/** ¥1,234,567 形式。負値は -¥1,234 */
export function formatYen(value: number): string {
  const n = Math.round(value);
  const sign = n < 0 ? "-" : "";
  return `${sign}¥${Math.abs(n).toLocaleString("ja-JP")}`;
}

/** 3桁区切りのみ（記号なし） */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("ja-JP");
}

/** 数量。小数第2位まで、末尾の 0 は落とす */
export function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "";
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

/** YYYY-MM-DD → YYYY年M月D日。解釈できなければ元の文字列を返す */
export function formatDateJa(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso.trim());
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

/** 税率の表示。0 は「対象外」 */
export function formatRate(rate: number): string {
  return rate === 0 ? "対象外" : `${rate}%`;
}

/** ファイル名に使えない文字を落とす（PDF/ZIPの命名用） */
export function safeFileName(value: string): string {
  return value
    .replace(/[\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
