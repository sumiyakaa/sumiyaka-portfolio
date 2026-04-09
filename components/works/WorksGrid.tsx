"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import type { Work } from "@/types/work";
import WorkCard from "./WorkCard";
import WorksFilter from "./WorksFilter";
import styles from "./WorksGrid.module.css";

interface WorksGridProps {
  works: Work[];
  categories: string[];
  technologies: string[];
}

export default function WorksGrid({
  works,
  categories,
  technologies,
}: WorksGridProps) {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeTechnologies, setActiveTechnologies] = useState<string[]>([]);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchCategory =
        activeCategories.length === 0 ||
        work.category.some((cat) => activeCategories.includes(cat));
      const matchTech =
        activeTechnologies.length === 0 ||
        work.technologies.some((tech) => activeTechnologies.includes(tech));
      return matchCategory && matchTech;
    });
  }, [works, activeCategories, activeTechnologies]);

  const handleToggleCategory = (cat: string) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleToggleTechnology = (tech: string) => {
    setActiveTechnologies((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const handleReset = () => {
    setActiveCategories([]);
    setActiveTechnologies([]);
  };

  /* Tier 別にグループ化 */
  const tierGroups = useMemo(() => {
    const groups: { tier: string; label: string; works: Work[] }[] = [];
    const tierOrder = ["S", "A", "B"] as const;
    const tierLabels: Record<string, string> = {
      S: "FLAGSHIP",
      A: "FEATURED",
      B: "STANDARD",
    };
    for (const tier of tierOrder) {
      const tierWorks = filteredWorks.filter((w) => w.tier === tier);
      if (tierWorks.length > 0) {
        groups.push({
          tier,
          label: tierLabels[tier],
          works: tierWorks,
        });
      }
    }
    return groups;
  }, [filteredWorks]);

  return (
    <div>
      <WorksFilter
        categories={categories}
        technologies={technologies}
        activeCategories={activeCategories}
        activeTechnologies={activeTechnologies}
        onToggleCategory={handleToggleCategory}
        onToggleTechnology={handleToggleTechnology}
        onReset={handleReset}
        resultCount={filteredWorks.length}
      />

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {tierGroups.map((group) => (
            <section key={group.tier} className={styles.tierSection}>
              <div className={styles.tierHeader}>
                <span className={styles.tierBadge}>{group.tier}</span>
                <span className={styles.tierLabel}>{group.label}</span>
                <span className={styles.tierCount}>
                  {group.works.length}
                </span>
                <div className={styles.tierLine} />
              </div>

              <div className={styles.grid}>
                {group.works.map((work) => (
                  <WorkCard key={work.slug} work={work} />
                ))}
              </div>
            </section>
          ))}
        </AnimatePresence>

        {filteredWorks.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>
              該当する作品がありません
            </p>
            <button
              className={styles.emptyReset}
              onClick={handleReset}
              type="button"
            >
              RESET FILTER
            </button>
          </div>
        )}
      </LayoutGroup>
    </div>
  );
}
