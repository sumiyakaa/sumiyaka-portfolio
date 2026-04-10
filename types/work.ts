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
  isConcept?: boolean;

  // === Navigation URLs ===
  detailUrl?: string | null;
  siteUrl?: string | null;
  liveUrl?: string;
}
