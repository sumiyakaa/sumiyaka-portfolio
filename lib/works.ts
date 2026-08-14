import type { Work } from "@/types/work";
import type {
  ActiveExploreChip,
  ActiveExploreChipTarget,
  ActiveFilterDescriptor,
  ExploreEmptyStateContent,
  ExploreSerializableState,
  ExploreStateInput,
  ExploreSummary,
  ExploreSummaryItem,
  FilterGroup,
  FilterGroupKey,
  FilterOptionItem,
  FilterState,
  SortOptionLabel,
  SortOrder,
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

// ===========================================================================
// Finder コアロジック（Phase 1 移植）
// ===========================================================================

const isNonEmptyString = (value: string | undefined | null): value is string =>
  typeof value === "string" && value.length > 0;

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, "ja", { numeric: true, sensitivity: "base" });

const FILTER_GROUP_LABELS: Record<FilterGroupKey, string> = {
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
  selectedGenres: sanitizeStringList(input?.selectedGenres),
  selectedSiteTypes: sanitizeStringList(input?.selectedSiteTypes),
  selectedPurposes: sanitizeStringList(input?.selectedPurposes),
  selectedFeatures: sanitizeStringList(input?.selectedFeatures),
  selectedBudgetRanges: sanitizeStringList(input?.selectedBudgetRanges),
  selectedTechTags: sanitizeStringList(input?.selectedTechTags),
});

export const createInitialFilterState = (): FilterState => ({
  selectedGenres: [],
  selectedSiteTypes: [],
  selectedPurposes: [],
  selectedFeatures: [],
  selectedBudgetRanges: [],
  selectedTechTags: [],
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

// 予算帯ラベル（例: "¥250,000〜400,000" / "¥350,000（税抜）"）の先頭金額を
// 数値として抽出し、その下限金額でランク付けする（昇順 = 予算帯順）。
// 旧実装は固定キー("250-400万円"等)の完全一致で実データ形式と噛み合わず、
// 全件 MAX_SAFE_INTEGER 扱いになりソートが無反応だった。
const getBudgetRank = (
  rangeLabel: string | null | undefined
): number => {
  if (rangeLabel == null) return Number.MAX_SAFE_INTEGER;
  const match = rangeLabel.match(/[\d,]+/);
  if (match == null) return Number.MAX_SAFE_INTEGER;
  const value = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};

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
