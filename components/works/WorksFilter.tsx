"use client";

import { motion, AnimatePresence } from "framer-motion";
import styles from "./WorksFilter.module.css";

interface WorksFilterProps {
  categories: string[];
  technologies: string[];
  activeCategories: string[];
  activeTechnologies: string[];
  onToggleCategory: (cat: string) => void;
  onToggleTechnology: (tech: string) => void;
  onReset: () => void;
  resultCount: number;
}

export default function WorksFilter({
  categories,
  technologies,
  activeCategories,
  activeTechnologies,
  onToggleCategory,
  onToggleTechnology,
  onReset,
  resultCount,
}: WorksFilterProps) {
  const hasActiveFilter =
    activeCategories.length > 0 || activeTechnologies.length > 0;

  return (
    <div className={styles.filter}>
      {/* Category Filter */}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>CATEGORY</span>
        <div className={styles.filterTags}>
          {categories.map((cat) => {
            const isActive = activeCategories.includes(cat);
            return (
              <button
                key={cat}
                className={`${styles.filterTag} ${isActive ? styles.active : ""}`}
                onClick={() => onToggleCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Technology Filter */}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>TECHNOLOGY</span>
        <div className={styles.filterTags}>
          {technologies.map((tech) => {
            const isActive = activeTechnologies.includes(tech);
            return (
              <button
                key={tech}
                className={`${styles.filterTag} ${isActive ? styles.active : ""}`}
                onClick={() => onToggleTechnology(tech)}
                type="button"
              >
                {tech}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Count + Reset */}
      <div className={styles.filterFooter}>
        <span className={styles.resultCount}>
          {resultCount} <span className={styles.resultLabel}>WORKS</span>
        </span>

        <AnimatePresence>
          {hasActiveFilter && (
            <motion.button
              className={styles.resetBtn}
              onClick={onReset}
              type="button"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              RESET FILTER
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
