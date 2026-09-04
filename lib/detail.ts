/**
 * 詳細ページ用ユーティリティ関数
 * Finder の lib/detail.ts から移植・簡略化
 */

import type { Work } from "@/types/work";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetailFactItem {
  label: string;
  value: string;
}

export interface DetailChipGroup {
  label: string;
  items: string[];
  truncatedCount: number;
}

export interface DetailRebuild {
  platform: string;
  url: string;
  note: string;
  facts: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FEATURES_LIMIT = 8;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const isNonEmpty = (value: string | undefined | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

const formatFlag = (value: boolean | undefined): string =>
  value === true ? "あり" : value === false ? "なし" : "—";

// ---------------------------------------------------------------------------
// Meta facts — genre / siteType / year / budgetRange / durationRange / scale
// ---------------------------------------------------------------------------

export const getDetailMetaFacts = (work: Work): DetailFactItem[] => {
  const items: DetailFactItem[] = [
    { label: "ジャンル", value: work.genre },
    { label: "サイト種別", value: work.siteType },
  ];

  if (typeof work.year === "number") {
    items.push({ label: "制作年", value: `${work.year}年` });
  }

  items.push({ label: "想定予算帯", value: work.budgetRange ?? "個別見積" });
  items.push({
    label: "制作期間帯",
    value: work.durationRange ?? "要件に応じて調整",
  });

  const scaleValue =
    work.scale ??
    (typeof work.pageCount === "number" ? `${work.pageCount}ページ` : null);
  if (scaleValue !== null) {
    items.push({ label: "規模感", value: scaleValue });
  }

  return items;
};

// ---------------------------------------------------------------------------
// Design section facts
// ---------------------------------------------------------------------------

export const getDetailDesignFacts = (work: Work): DetailFactItem[] => {
  const items: DetailFactItem[] = [];
  if (isNonEmpty(work.designTone)) {
    items.push({ label: "デザイン傾向", value: work.designTone });
  }
  return items;
};

// ---------------------------------------------------------------------------
// Chip groups
// ---------------------------------------------------------------------------

export const getDetailChipGroups = (work: Work): DetailChipGroup[] => {
  const groups: DetailChipGroup[] = [];

  if (work.features && work.features.length > 0) {
    const visible = work.features.slice(0, FEATURES_LIMIT);
    const truncated = work.features.length - visible.length;
    groups.push({ label: "主な機能", items: visible, truncatedCount: truncated });
  }

  if (work.techStack.length > 0) {
    groups.push({ label: "使用技術", items: work.techStack, truncatedCount: 0 });
  }

  if (work.techTags.length > 0) {
    const stackSet = new Set(work.techStack.map((s) => s.toLowerCase()));
    const uniqueTags = work.techTags.filter(
      (tag) => !stackSet.has(tag.toLowerCase()),
    );
    if (uniqueTags.length > 0) {
      groups.push({ label: "技術タグ", items: uniqueTags, truncatedCount: 0 });
    }
  }

  return groups;
};

// ---------------------------------------------------------------------------
// Boolean flags
// ---------------------------------------------------------------------------

export const getDetailBooleanFlags = (work: Work): DetailFactItem[] => [
  { label: "CMS", value: formatFlag(work.hasCms) },
  { label: "フォーム", value: formatFlag(work.hasForm) },
  { label: "アニメーション", value: formatFlag(work.hasAnimation) },
];

// ---------------------------------------------------------------------------
// Rebuild — 同じデザインを別プラットフォームで組み直した版
// ---------------------------------------------------------------------------

/**
 * 移植版の表示情報を返す。公開URLが空（＝まだ公開していない）なら null。
 *
 * 「URL が無いのに表記や導線だけ出ている」状態をここ1箇所で塞いでいる。
 * 呼び出し側（詳細ページ・モーダル）は null なら節ごと描画しない。
 */
export const getDetailRebuild = (work: Work): DetailRebuild | null => {
  if (!isNonEmpty(work.rebuildUrl)) return null;

  return {
    platform: isNonEmpty(work.rebuildPlatform)
      ? work.rebuildPlatform
      : "別プラットフォーム",
    url: work.rebuildUrl.trim(),
    note: isNonEmpty(work.rebuildNote) ? work.rebuildNote : "",
    facts: (work.rebuildFacts ?? []).filter(isNonEmpty),
  };
};

// ---------------------------------------------------------------------------
// Section visibility helpers
// ---------------------------------------------------------------------------

export const hasDetailSummary = (work: Work): boolean =>
  isNonEmpty(work.summary);

export const hasDetailChallenge = (work: Work): boolean =>
  isNonEmpty(work.challenge);

export const hasDetailDesignSection = (work: Work): boolean =>
  isNonEmpty(work.challenge) || isNonEmpty(work.designTone);
