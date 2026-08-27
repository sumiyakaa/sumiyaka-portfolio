/**
 * 自社で開発したツールの定義。
 *
 * ⚠ Works（Web制作の実案件）とは別の器にしている。
 *    「制作実績」の見出しの下でカテゴリを分けることで、
 *    クライアントへ納品した実績と、自社開発の道具を取り違えさせない。
 */

/** 図像（ToolMark）と資産ディレクトリ（public/tools/{mark}/）の共通キー */
export type ToolMarkKey =
  | "invoice"
  | "reconcile"
  | "evidence"
  | "unify"
  | "cleanup"
  | "report";

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
  /** サムネイル（webp・1280×800） */
  thumbnail: string;
  /** OGカード用（jpg・800×450。/api/og は WebP を描けない） */
  og: string;
  /**
   * テーマカラー（HEX）。ツールページは白い紙の地で、この1色だけを
   * 点と線（ステップ番号・主ボタン・選択チップ・図像・上端の帯）に使う。
   * 6本が並んだときに互いに識別でき、トップの金と面で喧嘩しない色を選んである。
   */
  accent: string;
  /** テーマカラーの和名（見出しの添え字・alt などで使う） */
  accentName: string;
  /** 図像と資産ディレクトリのキー */
  mark: ToolMarkKey;
  /** 一覧・トップでの並び順 */
  order: number;
  /** トップの実績枠に出すか */
  isPickUp: boolean;
}
