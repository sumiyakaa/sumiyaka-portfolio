"use client";

import type { ActiveExploreChip, ActiveFilterChipAction } from "@/types/filter";
import styles from "./ActiveFilterChips.module.css";

interface ActiveFilterChipsProps {
  chips: ActiveExploreChip[];
  onRemove: (action: ActiveFilterChipAction) => void;
}

export default function ActiveFilterChips({
  chips,
  onRemove,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className={styles.container}
      aria-label="適用中の検索条件とフィルタ"
      role="region"
    >
      <span className={styles.label}>適用中</span>
      <ul className={styles.list}>
        {chips.map((chip) => (
          <li key={chip.id} className={styles.item}>
            <span
              className={`${styles.chip} ${chip.kind === "query" ? styles.chipQuery : styles.chipFilter}`}
            >
              <span className={styles.chipText}>{chip.label}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => onRemove(chip.action)}
                aria-label={`${chip.label} を解除`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3L3 9M3 3l6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
