export type ViewMode = "grid" | "list" | "thumbnail";

export interface FilterOptionItem {
  label: string;
  count: number;
}

export type SortOrder =
  | "recommended"
  | "year-desc"
  | "year-asc"
  | "budget-asc"
  | "title-asc"
  | "title-desc";

export interface SortOption {
  value: SortOrder;
  label: string;
}

export type SortOptionLabel = SortOption["label"];

export const DEFAULT_SORT_ORDER: SortOrder = "year-desc";

export const SORT_OPTIONS: readonly SortOption[] = [
  { value: "year-desc", label: "新しい順" },
  { value: "recommended", label: "おすすめ順" },
  { value: "year-asc", label: "古い順" },
  { value: "budget-asc", label: "予算帯順" },
  { value: "title-asc", label: "タイトル順" },
  { value: "title-desc", label: "タイトル逆順" },
] as const;

export interface FilterState {
  selectedCaseTypes: string[];
  selectedGenres: string[];
  selectedSiteTypes: string[];
  selectedPurposes: string[];
  selectedFeatures: string[];
  selectedBudgetRanges: string[];
  selectedTechTags: string[];
}

export type FilterGroupKey = keyof FilterState;

export interface FilterGroup {
  key: FilterGroupKey;
  title: string;
  options: FilterOptionItem[];
}

export interface SearchState {
  query: string;
}

export interface SortState {
  sortOrder: SortOrder;
}

export interface ExploreSerializableState
  extends SearchState,
    FilterState,
    SortState {}

export type ExploreSerializableKey = keyof ExploreSerializableState;

export const EXPLORE_SERIALIZABLE_KEYS: readonly ExploreSerializableKey[] = [
  "query",
  "selectedCaseTypes",
  "selectedGenres",
  "selectedSiteTypes",
  "selectedPurposes",
  "selectedFeatures",
  "selectedBudgetRanges",
  "selectedTechTags",
  "sortOrder",
] as const;

export type ExploreState = ExploreSerializableState;
export type ExploreStateInput =
  | Partial<ExploreSerializableState>
  | null
  | undefined;

export type ActiveFilterChipAction =
  | { type: "clear-query" }
  | { type: "remove-filter-value"; groupKey: FilterGroupKey; value: string };

export interface ActiveExploreChip {
  id: string;
  label: string;
  kind: "query" | "filter";
  action: ActiveFilterChipAction;
}

export type ActiveExploreChipTarget = ActiveFilterChipAction;

export interface ActiveFilterDescriptor {
  id: string;
  groupKey: FilterGroupKey;
  groupLabel: string;
  value: string;
  label: string;
}

export type ExploreSummaryItemKind = "query" | "filter" | "sort";

export interface ExploreSummaryItem {
  id: string;
  label: string;
  kind: ExploreSummaryItemKind;
}

export interface ExploreSummary {
  hasSearchTerm: boolean;
  hasSelectedFilters: boolean;
  hasCustomSort: boolean;
  hasActiveRefinement: boolean;
  activeFilterCount: number;
  sortLabel: SortOptionLabel;
  chips: ExploreSummaryItem[];
  note: string;
}

export interface ExploreStatusContext {
  visibleCount: number;
  totalCount?: number;
}

export interface ExploreUiState
  extends ExploreSerializableState {
  visibleCount: number;
  totalCount?: number;
  sortLabel: SortOptionLabel;
  appliedFilterCount: number;
  hasSearchQuery: boolean;
  hasActiveFilters: boolean;
  hasCustomSort: boolean;
  hasActiveRefinement: boolean;
  summaryText: string;
  statusText: string;
  activeFilterDescriptors: ActiveFilterDescriptor[];
  activeFilterChips: ActiveExploreChip[];
  chips: ExploreSummaryItem[];
}

export interface ExploreEmptyStateContent {
  title: string;
  description: string;
  actionLabel: string;
  actionKind: "clear-search" | "clear-filters" | "reset-explore";
}
