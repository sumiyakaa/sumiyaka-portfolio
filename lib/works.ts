import type { Work } from "@/types/work";
import type {
  ActiveExploreChip,
  ActiveExploreChipTarget,
  ActiveFilterDescriptor,
  ExploreEmptyStateContent,
  ExploreSerializableState,
  ExploreStateInput,
  ExploreStatusContext,
  ExploreSummary,
  ExploreSummaryItem,
  ExploreUiState,
  FilterGroup,
  FilterGroupKey,
  FilterOptionItem,
  FilterState,
  SortOptionLabel,
  SortOrder,
  SortState,
} from "@/types/filter";
import { DEFAULT_SORT_ORDER, SORT_OPTIONS } from "@/types/filter";
import { works as worksData } from "@/data/works";

// ===========================================================================
// 既存 API（後方互換）
// ===========================================================================

const allWorks: Work[] = worksData;

export function getAllWorks(): Work[] {
  return [...allWorks].sort((a, b) => a.order - b.order);
}

export function getWorkBySlug(slug: string): Work | undefined {
  return allWorks.find((work) => work.slug === slug);
}

export function getPickUpWorks(): Work[] {
  return allWorks
    .filter((work) => work.isPickUp)
    .sort((a, b) => a.order - b.order);
}

export function getWorksByCategory(category: string): Work[] {
  return allWorks
    .filter((work) => work.category.includes(category))
    .sort((a, b) => a.order - b.order);
}

export function getWorksByTechnology(tech: string): Work[] {
  return allWorks
    .filter((work) => work.technologies.includes(tech))
    .sort((a, b) => a.order - b.order);
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();
  allWorks.forEach((work) => {
    work.category.forEach((cat) => categories.add(cat));
  });
  return Array.from(categories).sort();
}

export function getAllTechnologies(): string[] {
  const technologies = new Set<string>();
  allWorks.forEach((work) => {
    work.technologies.forEach((tech) => technologies.add(tech));
  });
  return Array.from(technologies).sort();
}

// ===========================================================================
// Finder コアロジック（Phase 1 移植）
// ===========================================================================

const isNonEmptyString = (value: string | undefined | null): value is string =>
  typeof value === "string" && value.length > 0;

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, "ja", { numeric: true, sensitivity: "base" });

const FILTER_GROUP_LABELS: Record<FilterGroupKey, string> = {
  selectedCaseTypes: "案件区分",
  selectedGenres: "ジャンル",
  selectedSiteTypes: "サイト種別",
  selectedPurposes: "制作目的",
  selectedFeatures: "実装特徴",
  selectedBudgetRanges: "想定予算帯",
  selectedTechTags: "技術要素",
};

const sortFilterOptions = (
  left: FilterOptionItem,
  right: FilterOptionItem
): number => right.count - left.count || compareStrings(left.label, right.label);

const EXPLORE_PARAM_KEYS = {
  query: "q",
  caseTypes: "case",
  genres: "genre",
  siteTypes: "siteType",
  purposes: "purpose",
  features: "feature",
  budgetRanges: "budget",
  techTags: "tech",
  sort: "sort",
} as const;

const VALID_SORT_ORDERS = new Set<SortOrder>(
  SORT_OPTIONS.map((option) => option.value)
);

// ---------------------------------------------------------------------------
// Work フィールドヘルパー
// ---------------------------------------------------------------------------

const getWorkFeatureValues = (work: Work): string[] => {
  const featureValues = [...(work.features ?? []).filter(isNonEmptyString)];
  if (work.hasCms) featureValues.push("CMS");
  if (work.hasAnimation) featureValues.push("アニメーション");
  if (work.hasForm) featureValues.push("フォーム");
  return [...new Set(featureValues)];
};

const getWorkCaseTypeValues = (work: Work): string[] => [
  work.isConcept ? "コンセプト" : "実案件",
];

export const normalizeTechTags = (
  values: Array<string | undefined | null>
): string[] => {
  const normalizedValues: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    if (!isNonEmptyString(value)) return;
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0 || seen.has(normalizedValue)) return;
    seen.add(normalizedValue);
    normalizedValues.push(normalizedValue);
  });

  return normalizedValues;
};

const getWorkTechnicalFilterValues = (work: Work): string[] =>
  normalizeTechTags(work.techTags.length > 0 ? work.techTags : work.techStack);

const getWorkTechnicalSearchValues = (work: Work): string[] =>
  normalizeTechTags([...getWorkTechnicalFilterValues(work), ...work.techStack]);

// ---------------------------------------------------------------------------
// 検索インデックス
// ---------------------------------------------------------------------------

const createSearchIndex = (work: Work): string =>
  [
    work.title,
    work.summary,
    work.genre,
    work.siteType,
    work.purpose,
    ...(work.tags ?? []),
    ...getWorkFeatureValues(work),
    ...getWorkTechnicalSearchValues(work),
    ...getWorkCaseTypeValues(work),
    work.challenge,
    work.designTone,
  ]
    .filter(isNonEmptyString)
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("ja");

export const normalizeText = (value: string): string =>
  value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ja")
    .replace(/\s+/g, " ");

// ---------------------------------------------------------------------------
// フィルター状態管理
// ---------------------------------------------------------------------------

const sanitizeStringList = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
};

const isSortOrder = (value: unknown): value is SortOrder =>
  typeof value === "string" && VALID_SORT_ORDERS.has(value as SortOrder);

export const sanitizeFilterState = (
  input: Partial<FilterState> | null | undefined = undefined
): FilterState => ({
  selectedCaseTypes: sanitizeStringList(input?.selectedCaseTypes),
  selectedGenres: sanitizeStringList(input?.selectedGenres),
  selectedSiteTypes: sanitizeStringList(input?.selectedSiteTypes),
  selectedPurposes: sanitizeStringList(input?.selectedPurposes),
  selectedFeatures: sanitizeStringList(input?.selectedFeatures),
  selectedBudgetRanges: sanitizeStringList(input?.selectedBudgetRanges),
  selectedTechTags: sanitizeStringList(input?.selectedTechTags),
});

export const createInitialFilterState = (): FilterState => ({
  selectedCaseTypes: [],
  selectedGenres: [],
  selectedSiteTypes: [],
  selectedPurposes: [],
  selectedFeatures: [],
  selectedBudgetRanges: [],
  selectedTechTags: [],
});

export const createInitialSortState = (): SortState => ({
  sortOrder: DEFAULT_SORT_ORDER,
});

export const sanitizeExploreState = (
  input: ExploreStateInput = undefined
): ExploreSerializableState => ({
  query: typeof input?.query === "string" ? input.query.trim() : "",
  ...sanitizeFilterState(input),
  sortOrder: isSortOrder(input?.sortOrder)
    ? input.sortOrder
    : DEFAULT_SORT_ORDER,
});

const getAllowedExploreFilterValues = (
  items: Work[]
): Record<FilterGroupKey, Set<string>> => ({
  selectedCaseTypes: new Set(items.flatMap(getWorkCaseTypeValues)),
  selectedGenres: new Set(
    items.map((work) => work.genre).filter(isNonEmptyString)
  ),
  selectedSiteTypes: new Set(
    items.map((work) => work.siteType).filter(isNonEmptyString)
  ),
  selectedPurposes: new Set(
    items.map((work) => work.purpose).filter(isNonEmptyString)
  ),
  selectedFeatures: new Set(items.flatMap(getWorkFeatureValues)),
  selectedBudgetRanges: new Set(
    items
      .map((work) => work.budgetRange)
      .filter(isNonEmptyString) as string[]
  ),
  selectedTechTags: new Set(items.flatMap(getWorkTechnicalFilterValues)),
});

const filterAllowedValues = (
  values: string[],
  allowedValues: Set<string>
): string[] => values.filter((value) => allowedValues.has(value));

export const sanitizeExploreStateForWorks = (
  input: ExploreStateInput,
  items: Work[]
): ExploreSerializableState => {
  const sanitizedState = sanitizeExploreState(input);
  const allowedValues = getAllowedExploreFilterValues(items);

  return {
    ...sanitizedState,
    selectedCaseTypes: filterAllowedValues(
      sanitizedState.selectedCaseTypes,
      allowedValues.selectedCaseTypes
    ),
    selectedGenres: filterAllowedValues(
      sanitizedState.selectedGenres,
      allowedValues.selectedGenres
    ),
    selectedSiteTypes: filterAllowedValues(
      sanitizedState.selectedSiteTypes,
      allowedValues.selectedSiteTypes
    ),
    selectedPurposes: filterAllowedValues(
      sanitizedState.selectedPurposes,
      allowedValues.selectedPurposes
    ),
    selectedFeatures: filterAllowedValues(
      sanitizedState.selectedFeatures,
      allowedValues.selectedFeatures
    ),
    selectedBudgetRanges: filterAllowedValues(
      sanitizedState.selectedBudgetRanges,
      allowedValues.selectedBudgetRanges
    ),
    selectedTechTags: filterAllowedValues(
      sanitizedState.selectedTechTags,
      allowedValues.selectedTechTags
    ),
  };
};

export const getDefaultExploreState = (): ExploreSerializableState =>
  createExploreState();

export const createExploreState = (
  query = "",
  filters: FilterState = createInitialFilterState(),
  sortOrder: SortOrder = DEFAULT_SORT_ORDER
): ExploreSerializableState =>
  sanitizeExploreState({ query, ...filters, sortOrder });

export const clearExploreQuery = (
  exploreState: ExploreSerializableState
): ExploreSerializableState => ({
  ...sanitizeExploreState(exploreState),
  query: "",
});

export const removeFilterValue = (
  filters: FilterState,
  groupKey: FilterGroupKey,
  value: string
): FilterState => ({
  ...sanitizeFilterState(filters),
  [groupKey]: sanitizeFilterState(filters)[groupKey].filter(
    (item) => item !== value
  ),
});

export const clearExploreFilters = (
  exploreState: ExploreSerializableState
): ExploreSerializableState => ({
  ...sanitizeExploreState(exploreState),
  ...createInitialFilterState(),
});

export const removeExploreChip = (
  exploreState: ExploreSerializableState,
  target: ActiveExploreChipTarget
): ExploreSerializableState => {
  const sanitizedState = sanitizeExploreState(exploreState);
  if (target.type === "clear-query") {
    return clearExploreQuery(sanitizedState);
  }
  return {
    ...sanitizedState,
    ...removeFilterValue(sanitizedState, target.groupKey, target.value),
  };
};

export const toggleFilterValue = (
  selectedValues: string[],
  value: string
): string[] =>
  selectedValues.includes(value)
    ? selectedValues.filter((v) => v !== value)
    : [...selectedValues, value];

// ---------------------------------------------------------------------------
// URL シリアライズ
// ---------------------------------------------------------------------------

const buildExploreSearchParams = (
  exploreState: ExploreSerializableState
): URLSearchParams => {
  const sanitizedState = sanitizeExploreState(exploreState);
  const params = new URLSearchParams();

  if (sanitizedState.query.length > 0) {
    params.set(EXPLORE_PARAM_KEYS.query, sanitizedState.query);
  }
  sanitizedState.selectedCaseTypes.forEach((v) =>
    params.append(EXPLORE_PARAM_KEYS.caseTypes, v)
  );
  sanitizedState.selectedGenres.forEach((v) =>
    params.append(EXPLORE_PARAM_KEYS.genres, v)
  );
  sanitizedState.selectedSiteTypes.forEach((v) =>
    params.append(EXPLORE_PARAM_KEYS.siteTypes, v)
  );
  sanitizedState.selectedPurposes.forEach((v) =>
    params.append(EXPLORE_PARAM_KEYS.purposes, v)
  );
  sanitizedState.selectedFeatures.forEach((v) =>
    params.append(EXPLORE_PARAM_KEYS.features, v)
  );
  sanitizedState.selectedBudgetRanges.forEach((v) =>
    params.append(EXPLORE_PARAM_KEYS.budgetRanges, v)
  );
  sanitizedState.selectedTechTags.forEach((v) =>
    params.append(EXPLORE_PARAM_KEYS.techTags, v)
  );
  if (sanitizedState.sortOrder !== DEFAULT_SORT_ORDER) {
    params.set(EXPLORE_PARAM_KEYS.sort, sanitizedState.sortOrder);
  }

  return params;
};

export const serializeExploreState = (
  exploreState: ExploreSerializableState
): string => buildExploreSearchParams(exploreState).toString();

export const parseExploreState = (
  search: string
): ExploreSerializableState => {
  const normalizedSearch = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  const parsedSortOrder = params.get(EXPLORE_PARAM_KEYS.sort);

  return sanitizeExploreState({
    query: params.get(EXPLORE_PARAM_KEYS.query) ?? "",
    selectedCaseTypes: params.getAll(EXPLORE_PARAM_KEYS.caseTypes),
    selectedGenres: params.getAll(EXPLORE_PARAM_KEYS.genres),
    selectedSiteTypes: params.getAll(EXPLORE_PARAM_KEYS.siteTypes),
    selectedPurposes: params.getAll(EXPLORE_PARAM_KEYS.purposes),
    selectedFeatures: params.getAll(EXPLORE_PARAM_KEYS.features),
    selectedBudgetRanges: params.getAll(EXPLORE_PARAM_KEYS.budgetRanges),
    selectedTechTags: params.getAll(EXPLORE_PARAM_KEYS.techTags),
    sortOrder: isSortOrder(parsedSortOrder)
      ? parsedSortOrder
      : DEFAULT_SORT_ORDER,
  });
};

// ---------------------------------------------------------------------------
// 状態判定ヘルパー
// ---------------------------------------------------------------------------

export const hasSearchQuery = (query: string): boolean =>
  normalizeText(query).length > 0;

export const getAppliedFilterCount = (filters: FilterState): number =>
  filters.selectedCaseTypes.length +
  filters.selectedGenres.length +
  filters.selectedSiteTypes.length +
  filters.selectedPurposes.length +
  filters.selectedFeatures.length +
  filters.selectedBudgetRanges.length +
  filters.selectedTechTags.length;

export const hasActiveFilters = (filters: FilterState): boolean =>
  getAppliedFilterCount(filters) > 0;

export const isDefaultExploreState = (
  exploreState: ExploreSerializableState
): boolean =>
  !hasSearchQuery(exploreState.query) &&
  !hasActiveFilters(exploreState) &&
  exploreState.sortOrder === DEFAULT_SORT_ORDER;

export const getSortLabel = (sortOrder: SortOrder): SortOptionLabel =>
  SORT_OPTIONS.find((option) => option.value === sortOrder)?.label ??
  SORT_OPTIONS[0].label;

// ---------------------------------------------------------------------------
// チップ / サマリー
// ---------------------------------------------------------------------------

export const getActiveFilterDescriptors = (
  filters: FilterState
): ActiveFilterDescriptor[] => {
  const descriptors: ActiveFilterDescriptor[] = [];
  (Object.keys(FILTER_GROUP_LABELS) as FilterGroupKey[]).forEach(
    (groupKey) => {
      filters[groupKey].forEach((value) => {
        descriptors.push({
          id: `${groupKey}:${value}`,
          groupKey,
          groupLabel: FILTER_GROUP_LABELS[groupKey],
          value,
          label: `${FILTER_GROUP_LABELS[groupKey]}: ${value}`,
        });
      });
    }
  );
  return descriptors;
};

export const getActiveFilterChips = (
  exploreState: ExploreSerializableState
): ActiveExploreChip[] => {
  const chips: ActiveExploreChip[] = [];
  const sanitizedState = sanitizeExploreState(exploreState);
  const trimmedQuery = sanitizedState.query;

  if (hasSearchQuery(trimmedQuery)) {
    chips.push({
      id: `query:${trimmedQuery}`,
      label: `検索: ${trimmedQuery}`,
      kind: "query",
      action: { type: "clear-query" },
    });
  }

  getActiveFilterDescriptors(sanitizedState).forEach((descriptor) => {
    chips.push({
      id: descriptor.id,
      label: descriptor.label,
      kind: "filter",
      action: {
        type: "remove-filter-value",
        groupKey: descriptor.groupKey,
        value: descriptor.value,
      },
    });
  });

  return chips;
};

export const getActiveExploreChips = (
  exploreState: ExploreSerializableState
): ExploreSummaryItem[] => {
  const chips: ExploreSummaryItem[] = getActiveFilterChips(exploreState).map(
    (chip) => ({
      id: chip.id,
      label: chip.label,
      kind: chip.kind,
    })
  );

  if (exploreState.sortOrder !== DEFAULT_SORT_ORDER) {
    chips.push({
      id: `sort:${exploreState.sortOrder}`,
      label: `並び替え: ${getSortLabel(exploreState.sortOrder)}`,
      kind: "sort",
    });
  }

  return chips;
};

export const getExploreSummary = (
  exploreState: ExploreSerializableState
): ExploreSummary => {
  const sanitizedState = sanitizeExploreState(exploreState);
  const hasSearchTerm = hasSearchQuery(sanitizedState.query);
  const activeFilterCount = getAppliedFilterCount(sanitizedState);
  const hasSelectedFilters = activeFilterCount > 0;
  const hasCustomSort = sanitizedState.sortOrder !== DEFAULT_SORT_ORDER;

  let note = "現在の制作実績をすべて表示しています。";

  if (hasSearchTerm && hasSelectedFilters && hasCustomSort) {
    note = "検索語・絞り込み・並び順を反映した一覧です。";
  } else if (hasSearchTerm && hasSelectedFilters) {
    note = "検索語と絞り込み条件を反映した一覧です。";
  } else if (hasSearchTerm && hasCustomSort) {
    note = "検索語と並び順を反映した一覧です。";
  } else if (hasSelectedFilters && hasCustomSort) {
    note = "絞り込み条件と並び順を反映した一覧です。";
  } else if (hasSearchTerm) {
    note = "検索語を反映した一覧です。";
  } else if (hasSelectedFilters) {
    note = "絞り込み条件を反映した一覧です。";
  } else if (hasCustomSort) {
    note = "並び順を変更して一覧を表示しています。";
  }

  return {
    hasSearchTerm,
    hasSelectedFilters,
    hasCustomSort,
    hasActiveRefinement: hasSearchTerm || hasSelectedFilters,
    activeFilterCount,
    sortLabel: getSortLabel(sanitizedState.sortOrder),
    chips: getActiveExploreChips(sanitizedState),
    note,
  };
};

export const getExploreSummaryText = (
  exploreState: ExploreSerializableState,
  context?: ExploreStatusContext
): string => {
  const summary = getExploreSummary(exploreState);

  if (!context || context.visibleCount > 0 || !summary.hasActiveRefinement) {
    return summary.note;
  }

  if (summary.hasSearchTerm && summary.hasSelectedFilters) {
    return "検索語と絞り込み条件に一致する作品はありません。条件を少し緩めると一覧へ戻れます。";
  }
  if (summary.hasSearchTerm) {
    return "検索語に一致する作品はありません。検索語を調整すると一覧へ戻れます。";
  }
  if (summary.hasSelectedFilters) {
    return "絞り込み条件に一致する作品はありません。条件を調整すると一覧へ戻れます。";
  }

  return summary.note;
};

export const getExploreStatusSegments = (
  exploreState: ExploreSerializableState,
  { visibleCount, totalCount }: ExploreStatusContext
): string[] => {
  const segments: string[] = [];
  const sanitizedState = sanitizeExploreState(exploreState);
  const trimmedQuery = sanitizedState.query;
  const appliedFilterCount = getAppliedFilterCount(sanitizedState);

  segments.push(
    typeof totalCount === "number"
      ? `全${totalCount}件中 ${visibleCount}件表示中`
      : `${visibleCount}件表示中`
  );

  if (hasSearchQuery(trimmedQuery)) {
    const compactQuery =
      trimmedQuery.length > 18
        ? `${trimmedQuery.slice(0, 18)}…`
        : trimmedQuery;
    segments.push(`検索: ${compactQuery}`);
  }

  if (appliedFilterCount > 0) {
    segments.push(`フィルタ: ${appliedFilterCount}`);
  }

  segments.push(`並び順: ${getSortLabel(sanitizedState.sortOrder)}`);

  return segments;
};

export const getExploreStatusText = (
  exploreState: ExploreSerializableState,
  context: ExploreStatusContext
): string => getExploreStatusSegments(exploreState, context).join(" / ");

export const getExploreUiState = (
  exploreState: ExploreSerializableState,
  context: ExploreStatusContext
): ExploreUiState => {
  const sanitizedState = sanitizeExploreState(exploreState);
  const summary = getExploreSummary(sanitizedState);
  const activeFilterDescriptors = getActiveFilterDescriptors(sanitizedState);

  return {
    ...sanitizedState,
    visibleCount: context.visibleCount,
    totalCount: context.totalCount,
    sortLabel: summary.sortLabel,
    appliedFilterCount: summary.activeFilterCount,
    hasSearchQuery: summary.hasSearchTerm,
    hasActiveFilters: summary.hasSelectedFilters,
    hasCustomSort: summary.hasCustomSort,
    hasActiveRefinement: summary.hasActiveRefinement,
    summaryText: getExploreSummaryText(sanitizedState, context),
    statusText: getExploreStatusText(sanitizedState, context),
    activeFilterDescriptors,
    activeFilterChips: getActiveFilterChips(sanitizedState),
    chips: summary.chips,
  };
};

export const getExploreEmptyStateContent = (
  exploreState: ExploreSerializableState,
  totalCount: number
): ExploreEmptyStateContent | undefined => {
  if (totalCount === 0) return undefined;

  const summary = getExploreSummary(exploreState);
  if (!summary.hasActiveRefinement) return undefined;

  const trimmedQuery = exploreState.query.trim();

  if (summary.hasSearchTerm && summary.hasSelectedFilters) {
    return {
      title: "条件に一致する作品が見つかりませんでした",
      description:
        `検索語「${trimmedQuery}」と選択中の条件に一致する作品はありません。` +
        " 検索語やフィルタ条件を少しゆるめて、再度お試しください。",
      actionLabel: "探索条件をリセット",
      actionKind: "reset-explore",
    };
  }

  if (summary.hasSearchTerm) {
    return {
      title: "検索に一致する作品が見つかりませんでした",
      description:
        `検索語「${trimmedQuery}」に一致する作品はありません。` +
        " キーワードを短くするか、別の語句でお試しください。",
      actionLabel: "検索をクリア",
      actionKind: "clear-search",
    };
  }

  return {
    title: "条件に一致する作品が見つかりませんでした",
    description:
      "選択したフィルタ条件に一致する作品はありません。" +
      " 条件を減らすか、いったんクリアして一覧を見直せます。",
    actionLabel: "条件をクリア",
    actionKind: "clear-filters",
  };
};

// ---------------------------------------------------------------------------
// 検索 / フィルター / ソート
// ---------------------------------------------------------------------------

const matchesSelectedValues = (
  selectedValues: string[],
  candidateValues: Array<string | undefined>
): boolean => {
  if (selectedValues.length === 0) return true;
  const normalizedCandidates = candidateValues.filter(isNonEmptyString);
  return selectedValues.some((v) => normalizedCandidates.includes(v));
};

export const searchWorks = (items: Work[], query: string): Work[] => {
  const searchTerms = normalizeText(query).split(" ").filter(Boolean);
  if (searchTerms.length === 0) return items;

  return items.filter((work) => {
    const searchIndex = createSearchIndex(work);
    return searchTerms.every((term) => searchIndex.includes(term));
  });
};

export const filterWorks = (
  items: Work[],
  filters: FilterState
): Work[] => {
  if (!hasActiveFilters(filters)) return items;

  return items.filter((work) => {
    return (
      matchesSelectedValues(
        filters.selectedCaseTypes,
        getWorkCaseTypeValues(work)
      ) &&
      matchesSelectedValues(filters.selectedGenres, [work.genre]) &&
      matchesSelectedValues(filters.selectedSiteTypes, [work.siteType]) &&
      matchesSelectedValues(filters.selectedPurposes, [work.purpose]) &&
      matchesSelectedValues(
        filters.selectedFeatures,
        getWorkFeatureValues(work)
      ) &&
      matchesSelectedValues(
        filters.selectedBudgetRanges,
        [work.budgetRange].filter(isNonEmptyString)
      ) &&
      matchesSelectedValues(
        filters.selectedTechTags,
        getWorkTechnicalFilterValues(work)
      )
    );
  });
};

const BUDGET_RANK: Record<string, number> = {
  "80-120万円": 1,
  "120-180万円": 2,
  "180-250万円": 3,
  "250-400万円": 4,
  "400万円以上": 5,
};

const getBudgetRank = (
  rangeLabel: string | null | undefined
): number =>
  rangeLabel != null && rangeLabel in BUDGET_RANK
    ? BUDGET_RANK[rangeLabel]
    : Number.MAX_SAFE_INTEGER;

export const sortWorks = (
  items: Work[],
  sortOrder: SortOrder = DEFAULT_SORT_ORDER
): Work[] => {
  const withIndex = items.map((item, index) => ({ item, index }));

  const sortByTitle = (left: Work, right: Work) =>
    compareStrings(left.title, right.title);
  const sortByTitleDescending = (left: Work, right: Work) =>
    compareStrings(right.title, left.title);
  const sortByCreatedAt = (
    left: Work,
    right: Work,
    direction: "asc" | "desc"
  ) => {
    const leftDate = left.createdAt ?? "";
    const rightDate = right.createdAt ?? "";
    if (leftDate === "" && rightDate === "") return 0;
    if (leftDate === "") return 1;
    if (rightDate === "") return -1;
    const cmp = leftDate.localeCompare(rightDate);
    return direction === "desc" ? -cmp : cmp;
  };

  const sorted = [...withIndex].sort((left, right) => {
    if (sortOrder === "recommended") {
      const featuredDiff =
        Number(right.item.isFeatured ?? false) -
        Number(left.item.isFeatured ?? false);
      if (featuredDiff !== 0) return featuredDiff;

      const conceptDiff =
        Number(left.item.isConcept ?? false) -
        Number(right.item.isConcept ?? false);
      if (conceptDiff !== 0) return conceptDiff;

      const yearDiff = sortByCreatedAt(left.item, right.item, "desc");
      if (yearDiff !== 0) return yearDiff;

      return (
        sortByTitle(left.item, right.item) || left.index - right.index
      );
    }

    if (sortOrder === "budget-asc") {
      const budgetDiff =
        getBudgetRank(left.item.budgetRange) -
        getBudgetRank(right.item.budgetRange);
      if (budgetDiff !== 0) return budgetDiff;

      const yearDiff = sortByCreatedAt(left.item, right.item, "desc");
      if (yearDiff !== 0) return yearDiff;

      return (
        sortByTitle(left.item, right.item) || left.index - right.index
      );
    }

    if (sortOrder === "title-asc") {
      return (
        sortByTitle(left.item, right.item) || left.index - right.index
      );
    }

    if (sortOrder === "title-desc") {
      return (
        sortByTitleDescending(left.item, right.item) ||
        left.index - right.index
      );
    }

    // year-desc / year-asc
    const yearDiff =
      sortOrder === "year-desc"
        ? sortByCreatedAt(left.item, right.item, "desc")
        : sortByCreatedAt(left.item, right.item, "asc");

    return (
      yearDiff ||
      sortByTitle(left.item, right.item) ||
      left.index - right.index
    );
  });

  return sorted.map(({ item }) => item);
};

export const getVisibleWorks = (
  items: Work[],
  exploreState: ExploreSerializableState = createExploreState()
): Work[] => {
  const sanitizedState = sanitizeExploreState(exploreState);
  const searchedWorks = searchWorks(items, sanitizedState.query);
  const filteredWorks = filterWorks(searchedWorks, sanitizedState);
  return sortWorks(filteredWorks, sanitizedState.sortOrder);
};

// ---------------------------------------------------------------------------
// フィルターオプション生成
// ---------------------------------------------------------------------------

const countFilterOptions = (values: string[]): FilterOptionItem[] => {
  const counts = new Map<string, number>();
  values.filter(isNonEmptyString).forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort(sortFilterOptions);
};

export const getWorkFilterGroup = (
  key: FilterGroupKey,
  title: string,
  items: Work[],
  selector: (work: Work) => string
): FilterGroup => ({
  key,
  title,
  options: countFilterOptions(items.map(selector)),
});

export const getWorkMultiValueFilterGroup = (
  key: FilterGroupKey,
  title: string,
  items: Work[],
  selector: (work: Work) => string[],
  limit?: number
): FilterGroup => {
  const options = countFilterOptions(items.flatMap(selector));
  return {
    key,
    title,
    options: typeof limit === "number" ? options.slice(0, limit) : options,
  };
};

export const getFilterOptions = (items: Work[]): FilterGroup[] => [
  getWorkMultiValueFilterGroup(
    "selectedCaseTypes",
    "案件区分",
    items,
    getWorkCaseTypeValues
  ),
  getWorkFilterGroup(
    "selectedGenres",
    "ジャンル",
    items,
    (work) => work.genre
  ),
  getWorkFilterGroup(
    "selectedPurposes",
    "制作目的",
    items,
    (work) => work.purpose
  ),
  getWorkFilterGroup(
    "selectedSiteTypes",
    "サイト種別",
    items,
    (work) => work.siteType
  ),
  getWorkMultiValueFilterGroup(
    "selectedFeatures",
    "実装特徴",
    items,
    getWorkFeatureValues
  ),
  getWorkFilterGroup(
    "selectedBudgetRanges",
    "想定予算帯",
    items,
    (work) => work.budgetRange ?? ""
  ),
  getWorkMultiValueFilterGroup(
    "selectedTechTags",
    "技術要素",
    items,
    getWorkTechnicalFilterValues
  ),
];

export const getPopularTags = (items: Work[], limit = 8): string[] => {
  const counts = new Map<string, number>();
  items.forEach((work) => {
    (work.tags ?? []).filter(isNonEmptyString).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0], "ja");
    })
    .slice(0, limit)
    .map(([tag]) => tag);
};

export const formatTags = (tags: string[], limit = 3): string[] =>
  tags.filter(isNonEmptyString).slice(0, limit);
