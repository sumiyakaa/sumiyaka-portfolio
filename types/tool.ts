/**
 * 自社で開発したツールの定義。
 *
 * ⚠ Works（Web制作の実案件）とは別の器にしている。
 *    「制作実績」の見出しの下でカテゴリを分けることで、
 *    クライアントへ納品した実績と、自社開発の道具を取り違えさせない。
 */
export interface Tool {
  /** URL の末尾。/tools/{slug} */
  slug: string;
  /** 通し番号（T-01 形式） */
  no: string;
  /** 日本語名 */
  title: string;
  /** 英字名（見出しの添え字） */
  titleEn: string;
  /** カード1行の要約 */
  summary: string;
  /** カード本文 */
  description: string;
  /** 性格を示す短い語 */
  tags: string[];
  /** サムネイル（webp） */
  thumbnail: string;
  /** 一覧・トップでの並び順 */
  order: number;
  /** トップの実績枠に出すか */
  isPickUp: boolean;
}
