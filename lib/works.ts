import type { Work } from "@/types/work";
import worksData from "@/data/works.json";

const works: Work[] = worksData as Work[];

export function getAllWorks(): Work[] {
  return works.sort((a, b) => a.order - b.order);
}

export function getWorkBySlug(slug: string): Work | undefined {
  return works.find((work) => work.slug === slug);
}

export function getPickUpWorks(): Work[] {
  return works
    .filter((work) => work.isPickUp)
    .sort((a, b) => a.order - b.order);
}

export function getWorksByCategory(category: string): Work[] {
  return works
    .filter((work) => work.category.includes(category))
    .sort((a, b) => a.order - b.order);
}

export function getWorksByTechnology(tech: string): Work[] {
  return works
    .filter((work) => work.technologies.includes(tech))
    .sort((a, b) => a.order - b.order);
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();
  works.forEach((work) => {
    work.category.forEach((cat) => categories.add(cat));
  });
  return Array.from(categories).sort();
}

export function getAllTechnologies(): string[] {
  const technologies = new Set<string>();
  works.forEach((work) => {
    work.technologies.forEach((tech) => technologies.add(tech));
  });
  return Array.from(technologies).sort();
}
