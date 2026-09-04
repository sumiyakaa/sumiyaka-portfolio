export interface Work {
  // === Identity ===
  slug: string;
  title: string;
  id?: string;

  // === Assets ===
  thumbnail: string;
  thumbnailFallback?: string;
  fullPageScreenshot?: string | null;
  images: string[];

  // === Portfolio display ===
  tier: "S" | "A" | "B" | "C";
  order: number;

  // === Classification ===
  category: string[];
  genre: string;
  siteType: string;
  purpose: string;
  tags: string[];

  // === Summary / detail ===
  description: string;
  summary: string;
  challenge?: string;
  designTone?: string;
  features?: string[];
  techTags: string[];
  techStack: string[];
  technologies: string[];

  // === Supplemental metadata ===
  createdAt: string; // 作成日 "YYYY-MM" or "YYYY-MM-DD"（例: "2026-04-11"）
  pageCount?: number;
  scale?: string | null;
  budgetRange?: string | null;
  durationRange?: string | null;
  year?: number;

  // === Flags ===
  isFeatured?: boolean;
  isPickUp: boolean;
  hasCms?: boolean;
  hasAnimation?: boolean;
  hasForm?: boolean;

  // === Navigation URLs ===
  detailUrl?: string | null;
  siteUrl?: string | null;
  liveUrl?: string;

  // === Rebuild（同じデザインを別のプラットフォームで組み直した版） ===
  // 4項目すべて任意。どの作品にも後から足せる（既存作品は未設定のままでよい）。
  // rebuildUrl が空文字のあいだは作品ページに節ごと出さない＝未公開の暫定URLが
  // 本番に出ることはない。公開後に URL を入れた時点で表示が始まる。
  /** 移植先プラットフォーム名。見出しとリンクのラベルに使う（例: "STUDIO"） */
  rebuildPlatform?: string;
  /** 移植版の公開URL。空文字 "" のあいだは非表示 */
  rebuildUrl?: string;
  /** 移植の位置づけを説明する本文 */
  rebuildNote?: string;
  /** 移植の実測値。箇条書きで並べる */
  rebuildFacts?: string[];
}
