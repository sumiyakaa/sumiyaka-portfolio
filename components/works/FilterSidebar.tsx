"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FilterGroup, FilterGroupKey, FilterState } from "@/types/filter";
import styles from "./FilterSidebar.module.css";

interface FilterSidebarProps {
  filterGroups: FilterGroup[];
  selectedFilters: FilterState;
  appliedFilterCount: number;
  visibleCount: number;
  isOpen: boolean;
  onFilterToggle: (groupKey: FilterGroupKey, value: string) => void;
  onClearFilters: () => void;
  onClose: () => void;
}

export default function FilterSidebar({
  filterGroups,
  selectedFilters,
  appliedFilterCount,
  visibleCount,
  isOpen,
  onFilterToggle,
  onClearFilters,
  onClose,
}: FilterSidebarProps) {
  const activeTags: { groupKey: FilterGroupKey; value: string }[] = [];
  for (const group of filterGroups) {
    for (const val of selectedFilters[group.key]) {
      activeTags.push({ groupKey: group.key, value: val });
    }
  }

  const content = (
    <nav className={styles.sidebar} aria-label="絞り込みフィルター">
      <div className={styles.header}>
        <h2 className={styles.title}>絞り込み</h2>
        <span className={styles.resultCount}>{visibleCount}件</span>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="フィルターを閉じる"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {activeTags.length > 0 && (
        <div className={styles.activeTags}>
          {activeTags.map((tag) => (
            <button
              key={`${tag.groupKey}-${tag.value}`}
              type="button"
              className={styles.activeTag}
              onClick={() => onFilterToggle(tag.groupKey, tag.value)}
            >
              {tag.value}
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 4L4 12M4 4l8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ))}
          <button
            type="button"
            className={styles.clearAll}
            onClick={onClearFilters}
          >
            すべてクリア
          </button>
        </div>
      )}

      <div className={styles.groups}>
        {filterGroups.map((group) => (
          <AccordionFilterGroup
            key={group.key}
            group={group}
            selected={selectedFilters[group.key]}
            onToggle={(value) => onFilterToggle(group.key, value)}
          />
        ))}
      </div>

      {appliedFilterCount > 0 && (
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={onClearFilters}
          >
            すべて解除
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* PC: 常時表示 */}
      <div className={styles.desktop} data-lenis-prevent>{content}</div>

      {/* SP: ドロワー */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              className={styles.drawer}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              data-lenis-prevent
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function AccordionFilterGroup({
  group,
  selected,
  onToggle,
}: {
  group: FilterGroup;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const selectedCount = selected.length;

  return (
    <div
      className={`${styles.group} ${selectedCount > 0 ? styles.groupActive : ""}`}
    >
      <button
        type="button"
        className={styles.groupHeader}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.groupTitle}>{group.title}</span>
        {selectedCount > 0 && (
          <span className={styles.groupBadge}>{selectedCount}</span>
        )}
        <svg
          className={`${styles.groupArrow} ${isExpanded ? styles.groupArrowOpen : ""}`}
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            className={styles.groupContent}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.groupOptions}>
              {group.options.map((option) => {
                const isSelected = selected.includes(option.label);
                return (
                  <label
                    key={option.label}
                    className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(option.label)}
                      className={styles.checkboxInput}
                    />
                    <span className={styles.checkboxBox}>
                      {isSelected && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className={styles.checkboxLabel}>{option.label}</span>
                    <span className={styles.checkboxCount}>{option.count}</span>
                  </label>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
