/**
 * 月次レポートPDF — 版面定数（A4 横）
 *
 * ★ここが紙と画面の唯一の基準。`pdf.ts` と `MonthlyReportPaper.tsx` / `ReportChart.tsx` の
 *   両方がこのファイルを import する。数値を各所へ書き写さないので、紙と画面がずれない。
 *
 * ⚠ **このファイルから `_shared/pdfKit` を import しない。**
 *    pdfKit は pdf-lib を引き込むので、画面側が読むだけで初期バンドルへ 300KB 級が載る。
 *    紙のサイズは pdf-lib 非依存の `_shared/paper` から取る。
 *
 * 座標は PDF 既定の左下原点。y が大きいほど上。
 */

import { A4_LANDSCAPE_H, A4_LANDSCAPE_W } from "../_shared/paper";

/* ------------------------------------------------------------------ *
 * 版面
 * ------------------------------------------------------------------ */

/** A4 横。841.89 × 595.28 */
export const PAGE_W = A4_LANDSCAPE_W;
export const PAGE_H = A4_LANDSCAPE_H;

export const MARGIN_X = 44;
export const MARGIN_TOP = 38;
export const MARGIN_BOTTOM = 32;

export const CONTENT_L = MARGIN_X; // 44
export const CONTENT_R = PAGE_W - MARGIN_X; // 797.89
export const CONTENT_W = CONTENT_R - CONTENT_L; // 753.89
export const CONTENT_T = PAGE_H - MARGIN_TOP; // 557.28
export const CONTENT_B = MARGIN_BOTTOM; // 32

/**
 * `_shared/pdfKit` の DESC と同値。
 * pdf-lib を引き込まないためにここへ写している（一致は検証スクリプトで機械的に確かめる）。
 */
export const DESC_RATIO = 0.14;
/** 同じく pdfKit の ASC */
export const ASC_RATIO = 0.86;
/** 同じく pdfKit の RULE（太い罫）と HAIR（細い罫） */
export const RULE_W = 0.8;
export const HAIR_W = 0.35;
/** 同じく pdfKit の OPTICAL_CENTER。行の視覚的中心はベースラインより 0.375em 上 */
export const OPTICAL_CENTER_RATIO = 0.375;

/* ------------------------------------------------------------------ *
 * ヘッダー（左寄せのタイトル ＋ 全幅の横罫 ＝ 報告書の顔）
 * ------------------------------------------------------------------ */

export const TITLE_SIZE = 16;
export const TITLE_TRACK = 6;
/**
 * 版面上端からタイトルのベースラインまで。
 * ⚠ 計画書の 13 から **14 へ 1pt 下げた**。16pt の字は上へ 0.86em（13.76pt）伸びるので、
 *    13 のままだと字の上端が版面より 0.76pt 高くなり、はみ出し検査に引っかかる（実測）。
 */
export const TITLE_TOP_GAP = 14;
export const TITLE_BASELINE = CONTENT_T - TITLE_TOP_GAP; // 543.28
/** タイトルに割ける最大幅（右上の会社名とぶつからないように） */
export const TITLE_MAX_W = 300;
export const PERIOD_SIZE = 11;
export const PERIOD_GAP = 16; // タイトル右端からの間隔
export const HEAD_META_SIZE = 8;
export const HEAD_META_LINE_H = 11;
export const HEAD_META_TOP = 9; // 版面上端から1行目のベースライン
export const HEAD_RULE_GAP = 16;
export const HEAD_RULE_Y = TITLE_BASELINE - HEAD_RULE_GAP; // 528.28

/* ------------------------------------------------------------------ *
 * KPI ストリップ（4枠・淡い地。黒ベタは使わない）
 * ------------------------------------------------------------------ */

export const KPI_TOP_GAP = 20;
export const KPI_TOP = HEAD_RULE_Y - KPI_TOP_GAP; // 508.28
export const KPI_H = 60;
export const KPI_BOTTOM = KPI_TOP - KPI_H; // 448.28
export const KPI_COUNT = 4;
export const KPI_GAP = 12;
export const KPI_W = (CONTENT_W - KPI_GAP * (KPI_COUNT - 1)) / KPI_COUNT; // 179.4725
export const KPI_PAD_X = 12;
export const KPI_LABEL_SIZE = 8;
export const KPI_LABEL_TOP = 11; // 枠上端からラベルのベースライン
export const KPI_VALUE_SIZE = 19;
export const KPI_VALUE_BOTTOM = 22; // 枠下端から値のベースライン
export const KPI_SUB_SIZE = 7.5;
export const KPI_SUB_BOTTOM = 9;
export const kpiX = (i: number): number => CONTENT_L + (KPI_W + KPI_GAP) * i;
/** 値・補足が使える幅 */
export const KPI_INNER_W = KPI_W - KPI_PAD_X * 2; // 155.4725

/* ------------------------------------------------------------------ *
 * 主グラフ（棒＋折れ線）— 紙面の主役
 * ------------------------------------------------------------------ */

export const CHART_TOP_GAP = 24;
export const CHART_TOP = KPI_BOTTOM - CHART_TOP_GAP; // 424.28
export const CHART_HEAD_SIZE = 9;
export const CHART_HEAD_TRACK = 1.2;
export const CHART_HEAD_H = 20;
export const CHART_BOTTOM = 199; // 下段の必要高から逆算した固定値
/** グラフ帯の高さ。プレビューの SVG はこの寸法の viewBox で描く */
export const CHART_H = CHART_TOP - CHART_BOTTOM; // 225.28

export const AXIS_W = 54; // Y 軸ラベルの幅
export const AXIS_LABEL_H = 15; // X 軸の月ラベルの高さ
export const PLOT_L = CONTENT_L + AXIS_W; // 98
export const PLOT_R = CONTENT_R - 6; // 791.89
export const PLOT_W = PLOT_R - PLOT_L; // 693.89
export const PLOT_T = CHART_TOP - CHART_HEAD_H; // 404.28
export const PLOT_B = CHART_BOTTOM + AXIS_LABEL_H; // 214
export const PLOT_H = PLOT_T - PLOT_B; // 190.28

/** 目盛線は 0 を含めて 5 本（＝区間は 4 つ） */
export const GRID_STEPS = 4;
export const AXIS_TICK_SIZE = 7.5;
export const AXIS_TICK_GAP = 8; // 目盛ラベルの右端から PLOT_L まで
export const BAR_MAX_W = 30;
export const BAR_RATIO = 0.56; // スロット幅に対する棒の幅
export const MONTH_LABEL_SIZE = 7.5;
export const MONTH_LABEL_TOP = 11; // PLOT_B からラベルのベースライン
export const LINE_THICK = 1.2; // 折れ線
export const MARKER_HALF = 1.9; // 折れ線のマーカー（半辺）
export const YOY_TICK_THICK = 1.2; // 前年同月マーカー
export const YOY_TICK_OVER = 3; // 棒より左右へはみ出す量
/**
 * 前年同月マーカーは**破線**にする。
 * ⚠ 実線のままだと、同じ太さ・近い濃さの折れ線（3か月移動平均）と見分けがつかない（実測の紙面で確認）。
 *   色だけで区別させない ＝ 印刷（白黒）でも読める。
 */
export const YOY_TICK_DASH: readonly number[] = [2.2, 1.6];
export const LEGEND_SIZE = 7.5;
export const LEGEND_SWATCH_W = 9;
export const LEGEND_SWATCH_H = 6;
export const LEGEND_GAP = 4; // 記号と文字のあいだ
export const LEGEND_ITEM_GAP = 14;

/* ------------------------------------------------------------------ *
 * 下段左：区分別ランキング（横棒）
 * ------------------------------------------------------------------ */

export const LOWER_TOP_GAP = 26;
export const LOWER_TOP = CHART_BOTTOM - LOWER_TOP_GAP; // 173
export const BLOCK_HEAD_SIZE = 9;
export const BLOCK_HEAD_TRACK = 1.2;
export const BLOCK_HEAD_GAP = 7;
export const BLOCK_RULE_Y = LOWER_TOP - BLOCK_HEAD_SIZE * ASC_RATIO - BLOCK_HEAD_GAP; // 158.26

export const RANK_L = CONTENT_L; // 44
export const RANK_R = 496;
export const RANK_NAME_W = 118;
export const RANK_BAR_L = RANK_L + RANK_NAME_W + 6; // 168
export const RANK_BAR_W = 132; // 右端 300
export const RANK_BAR_H = 8;
export const RANK_AMOUNT_R = 390;
export const RANK_SHARE_R = 436;
export const RANK_YOY_R = 496;
export const RANK_COLHEAD_SIZE = 7;
export const RANK_COLHEAD_H = 11;
export const RANK_ROW_TOP = BLOCK_RULE_Y - 5 - RANK_COLHEAD_H; // 142.26
export const RANK_ROW_H = 15;
export const RANK_TEXT_SIZE = 8.5;
export const RANK_MAX_ROWS = 6; // 上位5 ＋ その他

/* ------------------------------------------------------------------ *
 * 下段右：要約文
 * ------------------------------------------------------------------ */

export const SUMMARY_L = 526;
export const SUMMARY_R = CONTENT_R; // 797.89
export const SUMMARY_W = SUMMARY_R - SUMMARY_L; // 271.89
export const SUMMARY_BODY_SIZE = 8;
export const SUMMARY_LINE_H = 12;
export const SUMMARY_PARA_GAP = 4;
export const SUMMARY_BODY_TOP = BLOCK_RULE_Y - 9; // 149.26
export const SUMMARY_BODY_BOTTOM = 52.26; // ランキング最終行の下端と揃える
export const SUMMARY_BODY_H = SUMMARY_BODY_TOP - SUMMARY_BODY_BOTTOM; // 97

/* ------------------------------------------------------------------ *
 * フッター
 * ------------------------------------------------------------------ */

export const FOOTER_SIZE = 7.5;
export const FOOTER_BASELINE = CONTENT_B + FOOTER_SIZE * DESC_RATIO; // 33.05
/** 集計元の表示に使ってよい幅 */
export const FOOTER_SOURCE_W = CONTENT_W * 0.6;

/* ------------------------------------------------------------------ *
 * 色
 * ------------------------------------------------------------------ */

/**
 * 紙と画面で同じ色を使うための定義。
 * ink / sub / hairline / band は `_shared/pdfKit` の色と**同じ値**（16進で書き写したもの）。
 * bar / yoy はグラフ専用に足した淡墨で、pdf.ts が同じ値を rgb() へ写す。
 * ⚠ 一致は検証スクリプトで機械的に確かめている。
 */
export const COLOR = {
  ink: "#171717", // rgb(0.09, 0.09, 0.09)
  sub: "#6b6b6b", // rgb(0.42, 0.42, 0.42)
  hairline: "#c7c7c7", // rgb(0.78, 0.78, 0.78)
  band: "#f2f1ef", // rgb(0.949, 0.945, 0.937)
  paper: "#fdfcfa",
  /** 当月以外の棒・ランキングのバー */
  bar: "#ccc9c7",
  /** 前年同月マーカー */
  yoy: "#8c8a87",
} as const;

/* ------------------------------------------------------------------ *
 * 画面プレビューへの写し
 * ------------------------------------------------------------------ */

/** PDF の y（左下原点）を CSS の top（左上原点）へ写す */
export function topOf(y: number): number {
  return PAGE_H - y;
}

/**
 * ★プレビューへ渡す CSS 変数（単位なしの pt 値）。CSS 側は `calc(var(--rp-x) * var(--pt))` で使う。
 *
 * ここが「紙の数値をそのまま画面へ持ち込む」入口。
 * **CSS ファイルに数値を書き写さない**ので、版面を直せば紙とプレビューが同時に動く。
 */
export const PAPER_VARS: Record<string, string> = {
  "--rp-l": String(CONTENT_L),
  "--rp-w": String(CONTENT_W),
  "--rp-rule": String(RULE_W),
  "--rp-hair": String(HAIR_W),

  /* ヘッダー */
  "--rp-head-top": String(topOf(CONTENT_T)),
  "--rp-title-size": String(TITLE_SIZE),
  "--rp-title-track": String(TITLE_TRACK),
  "--rp-period-size": String(PERIOD_SIZE),
  "--rp-period-gap": String(PERIOD_GAP),
  "--rp-meta-size": String(HEAD_META_SIZE),
  "--rp-meta-line": String(HEAD_META_LINE_H),
  "--rp-rule-top": String(topOf(HEAD_RULE_Y)),

  /* KPI */
  "--rp-kpi-top": String(topOf(KPI_TOP)),
  "--rp-kpi-h": String(KPI_H),
  "--rp-kpi-gap": String(KPI_GAP),
  "--rp-kpi-pad": String(KPI_PAD_X),
  "--rp-kpi-label-size": String(KPI_LABEL_SIZE),
  "--rp-kpi-label-top": String(KPI_LABEL_TOP - KPI_LABEL_SIZE * ASC_RATIO),
  "--rp-kpi-value-size": String(KPI_VALUE_SIZE),
  "--rp-kpi-value-bottom": String(KPI_VALUE_BOTTOM - KPI_VALUE_SIZE * DESC_RATIO),
  "--rp-kpi-sub-size": String(KPI_SUB_SIZE),
  "--rp-kpi-sub-bottom": String(KPI_SUB_BOTTOM - KPI_SUB_SIZE * DESC_RATIO),

  /* グラフ */
  "--rp-chart-top": String(topOf(CHART_TOP)),
  "--rp-chart-h": String(CHART_H),
  "--rp-chart-head-h": String(CHART_HEAD_H),
  "--rp-chart-head-size": String(CHART_HEAD_SIZE),
  "--rp-chart-head-track": String(CHART_HEAD_TRACK),
  "--rp-legend-size": String(LEGEND_SIZE),
  "--rp-legend-swatch-w": String(LEGEND_SWATCH_W),
  "--rp-legend-swatch-h": String(LEGEND_SWATCH_H),
  "--rp-legend-gap": String(LEGEND_GAP),
  "--rp-legend-item-gap": String(LEGEND_ITEM_GAP),
  "--rp-line-thick": String(LINE_THICK),

  /* 下段（ランキング・要約） */
  "--rp-lower-top": String(topOf(LOWER_TOP)),
  "--rp-block-head-size": String(BLOCK_HEAD_SIZE),
  "--rp-block-head-track": String(BLOCK_HEAD_TRACK),
  "--rp-block-rule-top": String(LOWER_TOP - BLOCK_RULE_Y),
  "--rp-rank-w": String(RANK_R - RANK_L),
  "--rp-rank-name-w": String(RANK_BAR_L - RANK_L),
  "--rp-rank-bar-w": String(RANK_BAR_W),
  "--rp-rank-bar-h": String(RANK_BAR_H),
  "--rp-rank-amount-w": String(RANK_AMOUNT_R - (RANK_BAR_L + RANK_BAR_W)),
  "--rp-rank-share-w": String(RANK_SHARE_R - RANK_AMOUNT_R),
  "--rp-rank-yoy-w": String(RANK_YOY_R - RANK_SHARE_R),
  "--rp-rank-colhead-top": String(LOWER_TOP - (BLOCK_RULE_Y - 5)),
  "--rp-rank-colhead-h": String(RANK_COLHEAD_H),
  "--rp-rank-colhead-size": String(RANK_COLHEAD_SIZE),
  "--rp-rank-rows-top": String(LOWER_TOP - RANK_ROW_TOP),
  "--rp-rank-row-h": String(RANK_ROW_H),
  "--rp-rank-text-size": String(RANK_TEXT_SIZE),
  "--rp-sum-left": String(SUMMARY_L - CONTENT_L),
  "--rp-sum-w": String(SUMMARY_W),
  "--rp-sum-top": String(LOWER_TOP - SUMMARY_BODY_TOP),
  "--rp-sum-size": String(SUMMARY_BODY_SIZE),
  "--rp-sum-line": String(SUMMARY_LINE_H),
  "--rp-sum-gap": String(SUMMARY_PARA_GAP),

  /* フッター */
  "--rp-footer-top": String(topOf(FOOTER_BASELINE + FOOTER_SIZE * ASC_RATIO)),
  "--rp-footer-size": String(FOOTER_SIZE),

  /* 色（紙と同じ値） */
  "--rp-ink": COLOR.ink,
  "--rp-sub": COLOR.sub,
  "--rp-hairline": COLOR.hairline,
  "--rp-band": COLOR.band,
  "--rp-paper": COLOR.paper,
  "--rp-bar": COLOR.bar,
  "--rp-yoy": COLOR.yoy,
};
