/**
 * 月次レポートPDF — グラフの幾何計算
 *
 * ★**描画はしない。座標だけを返す。**
 *   PDF（`pdf.ts`）は返ってきた矩形と線を pdf-lib で描き、
 *   画面（`ReportChart.tsx`）は同じ座標を SVG で描く。
 *   計算がここ 1 か所しか無いので、**紙とプレビューでグラフの形が食い違わない。**
 *
 * 座標系は PDF と同じ（左下原点・y は上が大きい）。
 * SVG は左上原点なので `svgX` / `svgY` で写す。
 */

import { formatNumber } from "../_shared/format";
import {
  BAR_MAX_W,
  BAR_RATIO,
  CHART_BOTTOM,
  CONTENT_L,
  CONTENT_W,
  GRID_STEPS,
  MARKER_HALF,
  PLOT_B,
  PLOT_H,
  PLOT_L,
  PLOT_T,
  PLOT_W,
  YOY_TICK_OVER,
} from "./layout";
import type { ReportDoc } from "./types";

export interface ChartBar {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 対象月（＝紙面で唯一の黒ベタ） */
  isCurrent: boolean;
  /** 元の月キー。ツールチップや検証で使う */
  key: string;
}

export interface ChartGrid {
  y: number;
  /** 単位で割った目盛の値（"1,600"） */
  label: string;
  isZero: boolean;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartGeometry {
  bars: ChartBar[];
  gridY: ChartGrid[];
  monthLabels: { x: number; text: string }[];
  /** 3 か月移動平均。null で切れる区間ごとに分けた折れ線の集合 */
  polylines: ChartPoint[][];
  /** 折れ線のいちばん新しい点（節点をひとつだけ打つ） */
  lastPoint: ChartPoint | null;
  /** 前年同月マーカー（棒に重ねる短い水平線） */
  yoyTicks: { x1: number; x2: number; y: number }[];
  /** 縦軸の単位（"万円"）。見出しに「（単位：万円）」と書く */
  unitLabel: string;
  /** 棒 1 本の幅。検証で本数を数えるときに使う */
  barW: number;
  /** 0 円の高さ（棒の起点） */
  zeroY: number;
  /** 折れ線の節点の半径 */
  markerRadius: number;
}

/** 目盛の単位。桁に応じて 円 → 千円 → 万円 → 百万円 */
function unitOf(max: number): { label: string; divisor: number } {
  const m = Math.abs(max);
  if (m >= 100000000) return { label: "百万円", divisor: 1000000 };
  if (m >= 1000000) return { label: "万円", divisor: 10000 };
  if (m >= 10000) return { label: "千円", divisor: 1000 };
  return { label: "円", divisor: 1 };
}

/**
 * 縦軸の単位だけが欲しいとき用（グラフの見出しに出す「（単位：万円）」）。
 * ⚠ 判定をあちこちに書き写さないこと。単位は必ずここから取る。
 */
export function chartUnitLabel(doc: ReportDoc): string {
  return unitOf(Math.max(Math.abs(doc.axisMax), Math.abs(doc.axisMin))).label;
}

/** 目盛ラベル。割り切れないときだけ小数第1位まで出す */
function tickLabel(value: number, divisor: number): string {
  const v = value / divisor;
  if (Number.isInteger(v)) return formatNumber(v);
  return (Math.round(v * 10) / 10).toFixed(1);
}

/** 月ラベル。先頭と 1 月だけ年を添える（"25年4月" / "1月"） */
function monthLabel(year: number, month: number, isFirst: boolean): string {
  if (isFirst || month === 1) return `${String(year).slice(2)}年${month}月`;
  return `${month}月`;
}

/**
 * `ReportDoc` から棒・目盛・折れ線の座標を作る。
 * ⚠ ここで金額を計算し直さない。doc の値を写して座標へ変換するだけ。
 */
export function buildChartGeometry(doc: ReportDoc): ChartGeometry {
  const n = doc.series.length;
  const span = doc.axisMax - doc.axisMin;
  const safeSpan = span > 0 ? span : 1;
  const slotW = n > 0 ? PLOT_W / n : PLOT_W;
  const barW = Math.min(BAR_MAX_W, slotW * BAR_RATIO);

  const y = (value: number): number => PLOT_B + ((value - doc.axisMin) / safeSpan) * PLOT_H;
  const barX = (i: number): number => PLOT_L + slotW * i + (slotW - barW) / 2;
  const centerX = (i: number): number => PLOT_L + slotW * (i + 0.5);
  const zeroY = y(0);

  const bars: ChartBar[] = doc.series.map((point, i) => {
    const top = y(point.amount);
    return {
      x: barX(i),
      y: Math.min(zeroY, top),
      w: barW,
      h: Math.abs(top - zeroY),
      isCurrent: i === n - 1,
      key: point.key,
    };
  });

  const unit = unitOf(Math.max(Math.abs(doc.axisMax), Math.abs(doc.axisMin)));
  const step = (doc.axisMax - doc.axisMin) / GRID_STEPS;
  const gridY: ChartGrid[] = [];
  for (let i = 0; i <= GRID_STEPS; i++) {
    const value = doc.axisMin + step * i;
    gridY.push({
      y: y(value),
      label: tickLabel(value, unit.divisor),
      // 浮動小数の誤差で 0 を取り逃がさないよう、1 円未満は 0 とみなす
      isZero: Math.abs(value) < 1,
    });
  }

  const monthLabels = doc.series.map((point, i) => ({
    x: centerX(i),
    text: monthLabel(point.ym.year, point.ym.month, i === 0),
  }));

  const polylines: ChartPoint[][] = [];
  let run: ChartPoint[] = [];
  doc.movingAverage.forEach((value, i) => {
    if (value === null) {
      if (run.length >= 2) polylines.push(run);
      run = [];
      return;
    }
    run.push({ x: centerX(i), y: y(value) });
  });
  if (run.length >= 2) polylines.push(run);

  const lastMa = [...doc.movingAverage].reverse().findIndex((v) => v !== null);
  const lastIndex = lastMa < 0 ? -1 : doc.movingAverage.length - 1 - lastMa;
  const lastPoint =
    lastIndex >= 0
      ? { x: centerX(lastIndex), y: y(doc.movingAverage[lastIndex] as number) }
      : null;

  const yoyTicks: { x1: number; x2: number; y: number }[] = [];
  doc.previousYear.forEach((value, i) => {
    if (value === null) return;
    yoyTicks.push({
      x1: barX(i) - YOY_TICK_OVER,
      x2: barX(i) + barW + YOY_TICK_OVER,
      y: y(value),
    });
  });

  return {
    bars,
    gridY,
    monthLabels,
    polylines,
    lastPoint,
    yoyTicks,
    unitLabel: unit.label,
    barW,
    zeroY,
    markerRadius: MARKER_HALF,
  };
}

/* ------------------------------------------------------------------ *
 * SVG への写し
 * ------------------------------------------------------------------ */

/**
 * プレビューの SVG は**版面の左端・プロット領域の上端**を原点にする。
 * 見出しと凡例は SVG の外（HTML）に置くので、SVG が受け持つのは PLOT_T から
 * CHART_BOTTOM までの帯だけ。viewBox は `0 0 CHART_SVG_W CHART_SVG_H`。
 */
export const CHART_SVG_W = CONTENT_W;
export const CHART_SVG_H = PLOT_T - CHART_BOTTOM;

export function svgX(x: number): number {
  return x - CONTENT_L;
}

export function svgY(y: number): number {
  return PLOT_T - y;
}

/** 小数を短く（SVG の属性を無駄に長くしない） */
export function svgNum(value: number): string {
  return String(Math.round(value * 100) / 100);
}
