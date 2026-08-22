/**
 * 月次レポートPDF — 集計
 *
 * ⚠ この層も一切ネットワークへ出ない。純粋な計算だけを行う。
 *
 * ── 貫いている約束（これを崩すと数字が静かに嘘になる）──────────────
 * 1. **データが 1 行も無い月の MonthlyPoint を作らない。**
 *    「売上 0 円の月」と「データが入っていない月」は別物で、混ぜると
 *    「その月は売上ゼロだった」という無いはずの事実を紙に印刷してしまう。
 * 2. **出せない比率に 0 を入れない。**分母が無い・0・負のときは rate を null にし、
 *    理由（no-data / zero-base / negative-base）を残す。紙面には「—」と書く。
 *    増減額は出せるので、率が出せないときでも delta は出す。
 * 3. **棒は必ず 0 起点。**軸を途中から始めると増減が誇張される。
 * ────────────────────────────────────────────────────
 */

import { monthKeyOfYm, parseMonthKey, shiftMonth } from "./display";
import { GRID_STEPS, RANK_MAX_ROWS } from "./layout";
import { buildSummary } from "./summary";
import { MAX_SPAN_MONTHS, OTHERS_LABEL, UNCLASSIFIED } from "./types";
import type {
  BreakdownAxis,
  BreakdownEntry,
  Comparison,
  Cumulative,
  MissingMonth,
  MonthlyPoint,
  ReportDoc,
  ReportOptions,
  SalesRow,
  YearMonth,
} from "./types";

/** "2026-05-31" → "2026-05" */
export function monthKeyOfDate(date: string): string {
  return date.slice(0, 7);
}

/* ------------------------------------------------------------------ *
 * 月へ畳む
 * ------------------------------------------------------------------ */

/**
 * 行を月ごとに合算する。**行が 1 つも無い月はキーごと作らない。**
 * 戻り値は月キーの昇順。
 */
export function foldMonthly(rows: readonly SalesRow[]): Map<string, MonthlyPoint> {
  const acc = new Map<string, { amount: number; count: number; rows: number }>();

  for (const row of rows) {
    const key = monthKeyOfDate(row.date);
    if (!parseMonthKey(key)) continue;
    const hit = acc.get(key);
    if (hit) {
      hit.amount += row.amount;
      hit.count += row.count;
      hit.rows += 1;
    } else {
      acc.set(key, { amount: row.amount, count: row.count, rows: 1 });
    }
  }

  const out = new Map<string, MonthlyPoint>();
  for (const key of [...acc.keys()].sort()) {
    const v = acc.get(key)!;
    const ym = parseMonthKey(key)!;
    out.set(key, {
      ym,
      key,
      amount: v.amount,
      count: v.count,
      unitPrice: v.count > 0 ? v.amount / v.count : null,
      rows: v.rows,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 2 時点の比較
 * ------------------------------------------------------------------ */

/**
 * 当月と比較対象を突き合わせる。
 * baseAmount が null（データが無い）／0／負のときは **rate を出さない**。
 */
export function compareAmount(
  current: number,
  baseKey: string | null,
  baseAmount: number | null,
): Comparison {
  if (baseKey === null || baseAmount === null) {
    return { baseKey, baseAmount: null, delta: null, rate: null, unavailable: "no-data" };
  }
  const delta = current - baseAmount;
  if (baseAmount === 0) {
    return { baseKey, baseAmount, delta, rate: null, unavailable: "zero-base" };
  }
  if (baseAmount < 0) {
    return { baseKey, baseAmount, delta, rate: null, unavailable: "negative-base" };
  }
  return { baseKey, baseAmount, delta, rate: current / baseAmount - 1, unavailable: null };
}

/* ------------------------------------------------------------------ *
 * 縦軸
 * ------------------------------------------------------------------ */

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;

/** x 以上でいちばん小さい「きりのよい」数（1・1.2・1.5・2・2.5・3・4・5・6・8・10 × 10^k） */
export function niceCeil(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(x)));
  for (const n of NICE_STEPS) {
    const v = n * base;
    if (v >= x - x * 1e-12) return v;
  }
  return 10 * base;
}

export interface AxisScale {
  min: number;
  max: number;
  step: number;
}

/**
 * 目盛は 0 を必ず含み、区間は GRID_STEPS 個（＝線は 5 本）。
 * 負の月があるときだけ min が 0 より下がる。
 */
export function buildAxisScale(amounts: readonly number[]): AxisScale {
  let rawMax = 0;
  let rawMin = 0;
  for (const v of amounts) {
    if (v > rawMax) rawMax = v;
    if (v < rawMin) rawMin = v;
  }
  const range = rawMax - rawMin;
  // すべて 0 円（あるいは月が 1 つも無い）ときの逃げ道。目盛だけ作って棒は高さ 0 で描く
  if (range <= 0) return { min: 0, max: GRID_STEPS, step: 1 };

  const step = niceCeil(range / GRID_STEPS);
  const max = Math.ceil(rawMax / step - 1e-9) * step;
  const min = Math.floor(rawMin / step + 1e-9) * step;
  return { min, max: max > min ? max : min + step, step };
}

/* ------------------------------------------------------------------ *
 * 区分別
 * ------------------------------------------------------------------ */

function axisNameOf(row: SalesRow, axis: BreakdownAxis): string {
  const raw = (axis === "item" ? row.itemName : row.clientName).trim();
  return raw === "" ? UNCLASSIFIED : raw;
}

function sumByAxis(
  rows: readonly SalesRow[],
  axis: BreakdownAxis,
): Map<string, { amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>();
  for (const row of rows) {
    const name = axisNameOf(row, axis);
    const hit = map.get(name);
    if (hit) {
      hit.amount += row.amount;
      hit.count += row.count;
    } else {
      map.set(name, { amount: row.amount, count: row.count });
    }
  }
  return map;
}

/**
 * 当月の区分別ランキング。金額の降順・同額なら名前の昇順で安定させる。
 * 上位 top 件を残し、あふれた分は「その他」1 行へ畳む。
 *
 * ⚠ 「その他」の前年同月比は出さない。畳んだ中身が前年と同じ顔ぶれである保証が無く、
 *    比べると別物どうしを比べることになるため（比較対象が定義できない ＝ baseKey も null）。
 */
export function buildBreakdown(
  targetRows: readonly SalesRow[],
  previousRows: readonly SalesRow[],
  previousKey: string,
  axis: BreakdownAxis,
  targetAmount: number,
  top: number,
): BreakdownEntry[] {
  const current = sumByAxis(targetRows, axis);
  const previous = sumByAxis(previousRows, axis);
  const hasPrevious = previous.size > 0;

  const sorted = [...current.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.amount - a.amount) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const limit = Math.max(1, Math.min(top, RANK_MAX_ROWS - 1));
  const head = sorted.slice(0, limit);
  const rest = sorted.slice(limit);

  const shareOf = (amount: number): number | null =>
    targetAmount > 0 ? amount / targetAmount : null;

  const entries: BreakdownEntry[] = head.map((e) => ({
    name: e.name,
    amount: e.amount,
    count: e.count,
    share: shareOf(e.amount),
    yoy: compareAmount(
      e.amount,
      hasPrevious ? previousKey : null,
      hasPrevious ? (previous.get(e.name)?.amount ?? null) : null,
    ),
    isOthers: false,
  }));

  if (rest.length > 0) {
    const amount = rest.reduce((s, e) => s + e.amount, 0);
    entries.push({
      name: OTHERS_LABEL,
      amount,
      count: rest.reduce((s, e) => s + e.count, 0),
      share: shareOf(amount),
      yoy: { baseKey: null, baseAmount: null, delta: null, rate: null, unavailable: "no-data" },
      isOthers: true,
    });
  }

  return entries;
}

/* ------------------------------------------------------------------ *
 * レポート 1 枚ぶん
 * ------------------------------------------------------------------ */

function clampMonth(value: number): number {
  if (!Number.isFinite(value)) return 4;
  return Math.min(12, Math.max(1, Math.round(value)));
}

/** 対象月が属する年度の期首 */
export function fiscalStartOf(target: YearMonth, fiscalStartMonth: number): YearMonth {
  const fs = clampMonth(fiscalStartMonth);
  return target.month >= fs ? { year: target.year, month: fs } : { year: target.year - 1, month: fs };
}

/**
 * 集計の入口。行が 1 つも無ければ null を返す（画面はサンプルへ戻す）。
 *
 * ⚠ ここが `ReportDoc` を作る唯一の場所。紙もプレビューもこの戻り値だけを見て描くので、
 *    画面と紙で数字が食い違ったら「どちらかが再計算している」ことを疑う。
 */
export function buildReport(rows: readonly SalesRow[], options: ReportOptions): ReportDoc | null {
  const monthly = foldMonthly(rows);
  const keys = [...monthly.keys()];
  if (keys.length === 0) return null;

  const targetKey = monthly.has(options.targetKey) ? options.targetKey : keys[keys.length - 1];
  const target = monthly.get(targetKey)!;
  const targetYm = target.ym;

  /* 表示期間（対象月から遡って span か月）。データのある月だけが series に入る */
  const span = Math.min(Math.max(1, Math.round(options.spanMonths)), MAX_SPAN_MONTHS);
  const spanKeys: string[] = [];
  for (let i = span - 1; i >= 0; i--) spanKeys.push(monthKeyOfYm(shiftMonth(targetYm, -i)));

  const series: MonthlyPoint[] = [];
  const missing: MissingMonth[] = [];
  const firstKey = keys[0];
  for (const key of spanKeys) {
    const point = monthly.get(key);
    if (point) {
      series.push(point);
    } else if (key >= firstKey) {
      // データの開始月より前は「欠測」ではない。まだ商売が始まっていないだけ
      missing.push({ key, ym: parseMonthKey(key)! });
    }
  }

  /* 3 か月移動平均。3 か月のうち 1 つでも欠けていれば引かない */
  const movingAverage: (number | null)[] = series.map((point, i) => {
    if (i < 2) return null;
    const prev1 = series[i - 1];
    const prev2 = series[i - 2];
    if (prev1.key !== monthKeyOfYm(shiftMonth(point.ym, -1))) return null;
    if (prev2.key !== monthKeyOfYm(shiftMonth(point.ym, -2))) return null;
    return (point.amount + prev1.amount + prev2.amount) / 3;
  });

  /* 各月の前年同月（表示期間の外にあってもデータがあれば拾う） */
  const previousYear: (number | null)[] = series.map((point) => {
    const hit = monthly.get(monthKeyOfYm(shiftMonth(point.ym, -12)));
    return hit ? hit.amount : null;
  });

  /* 前月比・前年同月比 */
  const momKey = monthKeyOfYm(shiftMonth(targetYm, -1));
  const yoyKey = monthKeyOfYm(shiftMonth(targetYm, -12));
  const mom = compareAmount(target.amount, momKey, monthly.get(momKey)?.amount ?? null);
  const yoy = compareAmount(target.amount, yoyKey, monthly.get(yoyKey)?.amount ?? null);

  /* 年度累計と前年同期 */
  const startYm = fiscalStartOf(targetYm, options.fiscalStartMonth);
  const ytdKeys: string[] = [];
  const monthsInYtd = (targetYm.year - startYm.year) * 12 + (targetYm.month - startYm.month) + 1;
  for (let i = 0; i < monthsInYtd; i++) ytdKeys.push(monthKeyOfYm(shiftMonth(startYm, i)));

  let ytdAmount = 0;
  let ytdMonths = 0;
  for (const key of ytdKeys) {
    const hit = monthly.get(key);
    if (!hit) continue;
    ytdAmount += hit.amount;
    ytdMonths += 1;
  }
  const ytd: Cumulative = { startKey: monthKeyOfYm(startYm), amount: ytdAmount, months: ytdMonths };

  const prevYtdKeys = ytdKeys.map((key) => monthKeyOfYm(shiftMonth(parseMonthKey(key)!, -12)));
  let prevYtdAmount: number | null = null;
  const prevYtdHave = new Set<string>();
  for (const key of prevYtdKeys) {
    const hit = monthly.get(key);
    if (!hit) continue;
    prevYtdAmount = (prevYtdAmount ?? 0) + hit.amount;
    prevYtdHave.add(key);
  }

  /*
   * ⚠ **月数の揃わない期間どうしを割らない。**
   *   期首を1月にすると当年は1〜5月の5か月、前年は4〜5月の2か月しか無い、ということが起きる。
   *   そのまま割ると「前年同期比 +153.5%」という、実態のない率が紙に載る（実測で確認）。
   *   出せないものは出さない ＝ 率も増減額も伏せ、KPI には「◯か月ぶん」とだけ書く。
   */
  const countedYtdKeys = ytdKeys.filter((key) => monthly.has(key));
  const comparablePeriod =
    countedYtdKeys.length > 0 &&
    prevYtdHave.size === countedYtdKeys.length &&
    countedYtdKeys.every((key) =>
      prevYtdHave.has(monthKeyOfYm(shiftMonth(parseMonthKey(key)!, -12))),
    );

  const ytdYoy = compareAmount(
    ytdAmount,
    comparablePeriod ? prevYtdKeys[0] : null,
    comparablePeriod ? prevYtdAmount : null,
  );

  /* 区分別 */
  const targetRows = rows.filter((r) => monthKeyOfDate(r.date) === targetKey);
  const previousRows = rows.filter((r) => monthKeyOfDate(r.date) === yoyKey);
  const breakdown = buildBreakdown(
    targetRows,
    previousRows,
    yoyKey,
    options.axis,
    target.amount,
    options.breakdownTop,
  );

  const scale = buildAxisScale(series.map((p) => p.amount));

  const doc: ReportDoc = {
    target,
    series,
    missing,
    movingAverage,
    previousYear,
    mom,
    yoy,
    ytd,
    ytdYoy,
    breakdown,
    axis: options.axis,
    summary: [],
    axisMax: scale.max,
    axisMin: scale.min,
  };

  // 要約文は完成した doc からしか作らない（本文と紙面の数字がずれないように）
  doc.summary = buildSummary(doc);
  return doc;
}
