"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import type { Work } from "@/types/work";
import type {
  ExploreSerializableState,
  FilterGroupKey,
  FilterState,
  SortOrder,
  ViewMode,
} from "@/types/filter";
import {
  clearExploreFilters,
  clearExploreQuery,
  createExploreState,
  getActiveFilterChips,
  getDefaultExploreState,
  getExploreEmptyStateContent,
  getFilterOptions,
  getVisibleWorks,
  isDefaultExploreState,
  parseExploreState,
  removeExploreChip,
  sanitizeExploreStateForWorks,
  serializeExploreState,
  toggleFilterValue,
} from "@/lib/works";
import {
  readStoredExploreState,
  readStoredViewMode,
  writeStoredExploreState,
  writeStoredViewMode,
} from "@/lib/exploreStorage";
import Toolbar from "./Toolbar";
import FilterSidebar from "./FilterSidebar";
import ActiveFilterChips from "./ActiveFilterChips";
import WorkCard from "./WorkCard";
import styles from "./WorksExplorer.module.css";

interface WorksExplorerProps {
  works: Work[];
}

type InitSource = "url" | "storage" | "default";

function resolveInitialState(works: Work[]): {
  state: ExploreSerializableState;
  source: InitSource;
} {
  if (typeof window === "undefined") {
    return { state: getDefaultExploreState(), source: "default" };
  }
  const search = window.location.search;
  if (search.length > 0 && search !== "?") {
    const fromUrl = sanitizeExploreStateForWorks(
      parseExploreState(search),
      works
    );
    if (!isDefaultExploreState(fromUrl)) {
      return { state: fromUrl, source: "url" };
    }
  }
  const stored = readStoredExploreState();
  if (stored !== null) {
    return { state: sanitizeExploreStateForWorks(stored, works), source: "storage" };
  }
  return { state: getDefaultExploreState(), source: "default" };
}

export default function WorksExplorer({ works }: WorksExplorerProps) {
  const [initialResolved] = useState(() => resolveInitialState(works));
  const skipInitialStorageRef = useRef(initialResolved.source === "url");

  // Explore state
  const [query, setQuery] = useState(initialResolved.state.query);
  const [selectedFilters, setSelectedFilters] = useState<FilterState>(() => ({
    selectedCaseTypes: initialResolved.state.selectedCaseTypes,
    selectedGenres: initialResolved.state.selectedGenres,
    selectedSiteTypes: initialResolved.state.selectedSiteTypes,
    selectedPurposes: initialResolved.state.selectedPurposes,
    selectedFeatures: initialResolved.state.selectedFeatures,
    selectedBudgetRanges: initialResolved.state.selectedBudgetRanges,
    selectedTechTags: initialResolved.state.selectedTechTags,
  }));
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    initialResolved.state.sortOrder
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== "undefined" ? readStoredViewMode() : "grid"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Derived state
  const exploreState = useMemo(
    () => createExploreState(query, selectedFilters, sortOrder),
    [query, selectedFilters, sortOrder]
  );
  const visibleWorks = useMemo(
    () => getVisibleWorks(works, exploreState),
    [works, exploreState]
  );
  const serializedSearch = useMemo(
    () => serializeExploreState(exploreState),
    [exploreState]
  );
  const filterGroups = useMemo(() => getFilterOptions(works), [works]);
  const activeChips = useMemo(
    () => getActiveFilterChips(exploreState),
    [exploreState]
  );
  const emptyContent = useMemo(
    () => getExploreEmptyStateContent(exploreState, works.length),
    [exploreState, works.length]
  );
  const appliedFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
    [selectedFilters]
  );

  // View mode persistence
  useEffect(() => {
    writeStoredViewMode(viewMode);
  }, [viewMode]);

  // URL sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;
    if (current === serializedSearch) return;
    const next =
      serializedSearch.length > 0 ? `?${serializedSearch}` : "";
    const url = `${window.location.pathname}${next}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [serializedSearch]);

  // Storage sync
  useEffect(() => {
    if (skipInitialStorageRef.current) {
      skipInitialStorageRef.current = false;
      return;
    }
    writeStoredExploreState(exploreState);
  }, [exploreState]);

  // Popstate (back/forward)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const next = sanitizeExploreStateForWorks(
        parseExploreState(window.location.search),
        works
      );
      setQuery(next.query);
      setSelectedFilters({
        selectedCaseTypes: next.selectedCaseTypes,
        selectedGenres: next.selectedGenres,
        selectedSiteTypes: next.selectedSiteTypes,
        selectedPurposes: next.selectedPurposes,
        selectedFeatures: next.selectedFeatures,
        selectedBudgetRanges: next.selectedBudgetRanges,
        selectedTechTags: next.selectedTechTags,
      });
      setSortOrder(next.sortOrder);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [works]);

  // Handlers
  const handleFilterToggle = (groupKey: FilterGroupKey, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [groupKey]: toggleFilterValue(prev[groupKey], value),
    }));
  };

  const handleClearFilters = () => {
    const cleared = clearExploreFilters(exploreState);
    setQuery(cleared.query);
    setSelectedFilters({
      selectedCaseTypes: cleared.selectedCaseTypes,
      selectedGenres: cleared.selectedGenres,
      selectedSiteTypes: cleared.selectedSiteTypes,
      selectedPurposes: cleared.selectedPurposes,
      selectedFeatures: cleared.selectedFeatures,
      selectedBudgetRanges: cleared.selectedBudgetRanges,
      selectedTechTags: cleared.selectedTechTags,
    });
  };

  const handleChipRemove = (action: Parameters<typeof removeExploreChip>[1]) => {
    const next = removeExploreChip(exploreState, action);
    setQuery(next.query);
    setSelectedFilters({
      selectedCaseTypes: next.selectedCaseTypes,
      selectedGenres: next.selectedGenres,
      selectedSiteTypes: next.selectedSiteTypes,
      selectedPurposes: next.selectedPurposes,
      selectedFeatures: next.selectedFeatures,
      selectedBudgetRanges: next.selectedBudgetRanges,
      selectedTechTags: next.selectedTechTags,
    });
    setSortOrder(next.sortOrder);
  };

  const handleEmptyAction = () => {
    if (!emptyContent) return;
    if (emptyContent.actionKind === "clear-search") {
      const cleared = clearExploreQuery(exploreState);
      setQuery(cleared.query);
    } else {
      handleClearFilters();
    }
  };

  return (
    <div className={styles.layout}>
      <FilterSidebar
        filterGroups={filterGroups}
        selectedFilters={selectedFilters}
        appliedFilterCount={appliedFilterCount}
        visibleCount={visibleWorks.length}
        isOpen={isSidebarOpen}
        onFilterToggle={handleFilterToggle}
        onClearFilters={handleClearFilters}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={styles.main}>
        <Toolbar
          query={query}
          visibleCount={visibleWorks.length}
          viewMode={viewMode}
          sortOrder={sortOrder}
          onQueryChange={setQuery}
          onViewModeChange={setViewMode}
          onSortChange={setSortOrder}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <ActiveFilterChips chips={activeChips} onRemove={handleChipRemove} />

        {visibleWorks.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>
              {emptyContent?.title ?? "条件に合う作品がありません"}
            </p>
            <p className={styles.emptyDesc}>
              {emptyContent?.description ?? "条件を緩めてお試しください"}
            </p>
            {emptyContent && (
              <button
                type="button"
                className={styles.emptyBtn}
                onClick={handleEmptyAction}
              >
                {emptyContent.actionLabel}
              </button>
            )}
          </div>
        ) : (
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              <div
                className={`${styles.worksView} ${
                  viewMode === "list"
                    ? styles.viewList
                    : viewMode === "thumbnail"
                      ? styles.viewThumbnail
                      : styles.viewGrid
                }`}
              >
                {visibleWorks.map((work, i) => (
                  <WorkCard
                    key={work.slug}
                    work={work}
                    index={i}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </AnimatePresence>
          </LayoutGroup>
        )}
      </div>
    </div>
  );
}
