export interface Work {
  slug: string;
  title: string;
  tier: "S" | "A" | "B" | "C";
  category: string[];
  technologies: string[];
  description: string;
  thumbnail: string;
  images: string[];
  liveUrl?: string;
  isPickUp: boolean;
  order: number;
}
