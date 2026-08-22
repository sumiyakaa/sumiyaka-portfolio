"use client";

import {
  CHART_SVG_H,
  CHART_SVG_W,
  buildChartGeometry,
  svgNum,
  svgX,
  svgY,
} from "@/lib/tools/report/chart";
import * as L from "@/lib/tools/report/layout";
import type { ReportDoc } from "@/lib/tools/report/types";

/**
 * 月次売上の棒グラフ＋3か月移動平均（プレビュー）。
 *
 * ★**座標は `lib/tools/report/chart.ts` が返すものだけを使う。**
 *   PDF 側（pdf.ts）も同じ関数の戻り値を描いているので、紙と画面でグラフの形が食い違わない。
 *   ここで金額から座標を計算し直したら、その時点で二重管理が始まる。
 *
 * ⚠ 素の SVG 図形（rect / line / polyline / circle / text）だけで描く。
 *    filter・mix-blend-mode・clip-path は使わない ＝ iOS(WebKit) で崩れる余地を残さない。
 */

interface ReportChartProps {
  doc: ReportDoc;
}

export default function ReportChart({ doc }: ReportChartProps) {
  const g = buildChartGeometry(doc);

  return (
    <svg
      viewBox={`0 0 ${svgNum(CHART_SVG_W)} ${svgNum(CHART_SVG_H)}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={`月次売上の推移（単位：${g.unitLabel}）。棒グラフと3か月移動平均。`}
      focusable="false"
    >
      {/* 目盛線と目盛ラベル（0 の線だけ濃く太く） */}
      {g.gridY.map((grid, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={svgNum(svgX(L.PLOT_L))}
            x2={svgNum(svgX(L.PLOT_R))}
            y1={svgNum(svgY(grid.y))}
            y2={svgNum(svgY(grid.y))}
            stroke={grid.isZero ? "var(--rp-ink)" : "var(--rp-hairline)"}
            strokeWidth={grid.isZero ? L.RULE_W : L.HAIR_W}
          />
          {/* SVG は y が下向きなので、目盛線の高さからベースラインへ 0.375em 下ろす */}
          <text
            x={svgNum(svgX(L.PLOT_L - L.AXIS_TICK_GAP))}
            y={svgNum(svgY(grid.y) + L.AXIS_TICK_SIZE * L.OPTICAL_CENTER_RATIO)}
            textAnchor="end"
            fontSize={L.AXIS_TICK_SIZE}
            fill="var(--rp-sub)"
          >
            {grid.label}
          </text>
        </g>
      ))}

      {/* 棒（当月だけ黒ベタ＝紙面で唯一の黒い面） */}
      {g.bars.map((bar) => (
        <rect
          key={`bar-${bar.key}`}
          x={svgNum(svgX(bar.x))}
          y={svgNum(svgY(bar.y + bar.h))}
          width={svgNum(bar.w)}
          height={svgNum(bar.h)}
          fill={bar.isCurrent ? "var(--rp-ink)" : "var(--rp-bar)"}
        />
      ))}

      {/* 前年同月マーカー（破線。実線だと移動平均の線と紛れる） */}
      {g.yoyTicks.map((tick, i) => (
        <line
          key={`yoy-${i}`}
          x1={svgNum(svgX(tick.x1))}
          x2={svgNum(svgX(tick.x2))}
          y1={svgNum(svgY(tick.y))}
          y2={svgNum(svgY(tick.y))}
          stroke="var(--rp-yoy)"
          strokeWidth={L.YOY_TICK_THICK}
          strokeDasharray={L.YOY_TICK_DASH.join(" ")}
        />
      ))}

      {/* 3か月移動平均（欠測で切れる区間ごとに引く） */}
      {g.polylines.map((line, i) => (
        <polyline
          key={`ma-${i}`}
          points={line.map((p) => `${svgNum(svgX(p.x))},${svgNum(svgY(p.y))}`).join(" ")}
          fill="none"
          stroke="var(--rp-sub)"
          strokeWidth={L.LINE_THICK}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {g.lastPoint ? (
        <circle
          cx={svgNum(svgX(g.lastPoint.x))}
          cy={svgNum(svgY(g.lastPoint.y))}
          r={g.markerRadius}
          fill="var(--rp-sub)"
        />
      ) : null}

      {/* 月ラベル */}
      {g.monthLabels.map((label, i) => (
        <text
          key={`m-${i}`}
          x={svgNum(svgX(label.x))}
          y={svgNum(svgY(L.PLOT_B - L.MONTH_LABEL_TOP))}
          textAnchor="middle"
          fontSize={L.MONTH_LABEL_SIZE}
          fill="var(--rp-sub)"
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}
