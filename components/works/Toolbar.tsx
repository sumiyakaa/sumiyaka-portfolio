"use client";

import { SORT_OPTIONS } from "@/types/filter";
import type { SortOrder, ViewMode } from "@/types/filter";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  query: string;
  visibleCount: number;
  viewMode: ViewMode;
  sortOrder: SortOrder;
  onQueryChange: (value: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOrder) => void;
  onOpenSidebar: () => void;
}

export default function Toolbar({
  query,
  visibleCount,
  viewMode,
  sortOrder,
  onQueryChange,
  onViewModeChange,
  onSortChange,
  onOpenSidebar,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* SP: フィルター開閉ボタン */}
      <button
        type="button"
        className={styles.filterBtn}
        onClick={onOpenSidebar}
        aria-label="フィルターを開く"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6h16M4 12h10M4 18h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        絞り込み
      </button>

      {/* 検索バー */}
      <div className={styles.search}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M21 21l-4.35-4.35"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="キーワードで検索..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* 表示切替 */}
      <div className={styles.viewToggle} role="group" aria-label="表示切替">
        <button
          type="button"
          className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
          onClick={() => onViewModeChange("grid")}
          aria-label="グリッド表示"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
          onClick={() => onViewModeChange("list")}
          aria-label="リスト表示"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="2" width="14" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="6.75" width="14" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="11.5" width="14" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.viewBtn} ${viewMode === "thumbnail" ? styles.viewBtnActive : ""}`}
          onClick={() => onViewModeChange("thumbnail")}
          aria-label="サムネイル表示"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="6.25" y="1" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="11.5" y="1" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="6.25" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="6.25" y="6.25" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="11.5" y="6.25" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="11.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="6.25" y="11.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="11.5" y="11.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>

      {/* 並び替え */}
      <select
        className={styles.sort}
        value={sortOrder}
        onChange={(e) => onSortChange(e.target.value as SortOrder)}
        aria-label="並び替え"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* 結果件数 */}
      <span className={styles.count}>
        {visibleCount}
        <span className={styles.countLabel}> WORKS</span>
      </span>
    </div>
  );
}
