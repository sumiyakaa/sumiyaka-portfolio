/**
 * 月次レポートPDF — A4 横の組版
 *
 * ⚠ ここも完全にブラウザ内で動く。ネットワークへは出ない。
 * ⚠ **PDF は必ず `createJpPdf()` から始める。**
 *    自前で `registerFontkit(fontkit)` を書くと、@pdf-lib/fontkit 1.1.1 のサブセット生成の
 *    桁落ちで**日本語がおよそ半分消える**（消える字と出る字が混ざるので気づきにくい）。
 *
 * 使えるウェイトは Noto Sans JP Regular の 1 つだけ。太字が無いので、
 * 強弱は「サイズ・字間・罫線の太さ・淡墨・黒ベタ」だけで作っている。
 * **黒ベタはページに 1 か所＝主グラフの当月の棒だけ。**ここが視線の終着点。
 *
 * 座標は PDF 既定の左下原点。y が大きいほど上。版面定数は `layout.ts` にある。
 */

import { rgb } from "pdf-lib";

import { formatNumber, formatYen } from "../_shared/format";
import {
  BAND,
  HAIR,
  HAIRLINE,
  INK,
  OPTICAL_CENTER,
  RULE,
  SUB,
  Sheet,
  createJpPdf,
} from "../_shared/pdfKit";
import type { TextStyle } from "../_shared/pdfKit";

/** 検証フックは共通側が持つ。呼び出し側の互換のためここからも出す */
export { __setDrawAuditForTest } from "../_shared/pdfKit";
export type { DrawAudit } from "../_shared/pdfKit";

import { buildChartGeometry } from "./chart";
import type { ChartGeometry } from "./chart";
import {
  DASH,
  cleanLine,
  formatComparisonRate,
  formatMonthJa,
  formatPeriodJa,
  formatShare,
  formatSignedRate,
  formatSignedYen,
} from "./display";
import * as L from "./layout";
import { fitSummary } from "./summary";
import type { Comparison, ReportDoc, ReportMeta } from "./types";

/* ------------------------------------------------------------------ *
 * 色（layout.ts の 16 進と同じ値。共通側に無い 2 色だけここで作る）
 * ------------------------------------------------------------------ */

/** 当月以外の棒・ランキングのバー ＝ #ccc9c7 */
const BAR_TINT = rgb(204 / 255, 201 / 255, 199 / 255);
/** 前年同月マーカー ＝ #8c8a87 */
const YOY_TINT = rgb(140 / 255, 138 / 255, 135 / 255);
/** 折れ線は共通の SUB を流用する */
const LINE_TINT = SUB;

/* ------------------------------------------------------------------ *
 * 公開 API
 * ------------------------------------------------------------------ */

export interface RenderMonthlyReportOptions {
  doc: ReportDoc;
  meta: ReportMeta;
  fontBytes: Uint8Array;
  /** 集計元（フッターの出典に出す） */
  source: { name: string; rows: number };
}

/* ------------------------------------------------------------------ *
 * 紙に載せる文字を先に全部作る
 *
 * ★ここで作った文字列だけを描く。**描く前に全部集めてグリフ収録を検査する**ので、
 *   書体に無い文字を使った瞬間に例外で止まる（豆腐は最悪の事故なので描かせない）。
 * ------------------------------------------------------------------ */

interface KpiCell {
  label: string;
  value: string;
  sub: string;
}

interface RankRow {
  name: string;
  amount: string;
  share: string;
  yoy: string;
  /** バーの長さ（0..1） */
  ratio: number;
}

interface LegendItem {
  label: string;
  kind: "swatch" | "line";
  color: ReturnType<typeof rgb>;
  /** 破線の刻み（前年同月マーカー） */
  dash?: number[];
}

interface Prepared {
  title: string;
  period: string;
  organization: string;
  createdLine: string;
  kpis: KpiCell[];
  chartHead: string;
  legend: LegendItem[];
  rankHead: string;
  rankCols: [string, string, string];
  rankRows: RankRow[];
  summaryHead: string;
  summary: string[];
  footerLeft: string;
  footerRight: string;
  geometry: ChartGeometry;
}

/** 今日（作成日が空のとき用）。ブラウザのローカル時刻でよい */
function todayIso(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${now.getFullYear()}-${m < 10 ? "0" + m : m}-${d < 10 ? "0" + d : d}`;
}

/** YYYY-MM-DD → 2026年6月3日。読めなければそのまま返す */
function formatCreated(iso: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso.trim());
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : cleanLine(iso);
}

/**
 * KPI の補足。率が出せないときも**増減額は出す**（§7-7）。
 * 出せない理由まで書いて、利用者が「0 と読み違える」余地を残さない。
 */
function kpiSub(c: Comparison, label: string): string {
  if (c.baseKey === null) return "比較できる月がありません";
  const base = formatMonthJa(c.baseKey);
  if (c.delta === null) return `${base}のデータがありません`;
  const why =
    c.unavailable === "zero-base"
      ? `・${label}が${formatYen(0)}`
      : c.unavailable === "negative-base"
        ? `・${label}が負の額`
        : "";
  return `${formatSignedYen(c.delta)}（${base}比${why}）`;
}

function prepare(doc: ReportDoc, meta: ReportMeta, source: { name: string; rows: number }): Prepared {
  const target = doc.target;
  const created = formatCreated(meta.createdDate.trim() || todayIso());
  const author = cleanLine(meta.authorName);

  const unitPrice = target.unitPrice === null ? "" : `・平均 ${formatYen(target.unitPrice)}`;
  const ytdRate = doc.ytdYoy.rate === null ? null : formatSignedRate(doc.ytdYoy.rate);
  const fiscalYear = Number(doc.ytd.startKey.slice(0, 4));
  const fiscalMonth = Number(doc.ytd.startKey.slice(5, 7));

  const kpis: KpiCell[] = [
    {
      label: "当月売上",
      value: formatYen(target.amount),
      sub: `${formatMonthJa(target.key)}・${formatNumber(target.count)}件${unitPrice}`,
    },
    {
      label: "前月比",
      value: formatComparisonRate(doc.mom),
      sub: kpiSub(doc.mom, "前月"),
    },
    {
      label: "前年同月比",
      value: formatComparisonRate(doc.yoy),
      sub: kpiSub(doc.yoy, "前年同月"),
    },
    {
      label: "年度累計",
      value: formatYen(doc.ytd.amount),
      sub:
        ytdRate === null
          ? `${fiscalYear}年度（${fiscalMonth}月〜）・${formatNumber(doc.ytd.months)}か月ぶん`
          : `${fiscalYear}年度（${fiscalMonth}月〜）・前年同期 ${ytdRate}`,
    },
  ];

  const geometry = buildChartGeometry(doc);

  const maxRank = doc.breakdown.reduce((m, b) => Math.max(m, b.amount), 0);
  const rankRows: RankRow[] = doc.breakdown.map((b) => ({
    name: cleanLine(b.name),
    amount: formatYen(b.amount),
    share: formatShare(b.share),
    yoy: formatComparisonRate(b.yoy),
    ratio: maxRank > 0 ? Math.max(0, Math.min(1, b.amount / maxRank)) : 0,
  }));

  return {
    title: cleanLine(meta.title) || "月次レポート",
    period: formatPeriodJa(target.key),
    organization: cleanLine(meta.organization),
    createdLine: author ? `作成 ${created} ・ ${author}` : `作成 ${created}`,
    kpis,
    chartHead: `月次売上の推移（単位：${geometry.unitLabel}）`,
    legend: [
      { label: "当月", kind: "swatch", color: INK },
      { label: "前月まで", kind: "swatch", color: BAR_TINT },
      { label: "前年同月", kind: "line", color: YOY_TINT, dash: [...L.YOY_TICK_DASH] },
      { label: "3か月移動平均", kind: "line", color: LINE_TINT },
    ],
    rankHead: `${doc.axis === "item" ? "商品・サービス別" : "取引先別"}（${formatMonthJa(target.key)}）`,
    rankCols: ["金額", "構成比", "前年同月比"],
    rankRows,
    summaryHead: "要約",
    summary: doc.summary,
    footerLeft: `集計元：${cleanLine(source.name)}（${formatNumber(source.rows)}行）`,
    footerRight: `作成 ${created}`,
    geometry,
  };
}

/** 収録チェックに回す文字列。**描くものを漏れなく集める** */
function collectTexts(p: Prepared): string[] {
  const texts: string[] = [
    p.title,
    p.period,
    p.organization,
    p.createdLine,
    p.chartHead,
    p.rankHead,
    p.summaryHead,
    p.footerLeft,
    p.footerRight,
    // fit() があふれたときに足す約物と、出せない値の表記
    "…",
    DASH,
  ];
  for (const k of p.kpis) texts.push(k.label, k.value, k.sub);
  for (const l of p.legend) texts.push(l.label);
  for (const c of p.rankCols) texts.push(c);
  for (const r of p.rankRows) texts.push(r.name, r.amount, r.share, r.yoy);
  for (const s of p.summary) texts.push(s);
  for (const g of p.geometry.gridY) texts.push(g.label);
  for (const m of p.geometry.monthLabels) texts.push(m.text);
  return texts.filter((t) => t !== "");
}

/* ------------------------------------------------------------------ *
 * 1) ヘッダー（左寄せのタイトル ＋ 全幅の横罫）
 * ------------------------------------------------------------------ */

function drawHeader(sheet: Sheet, p: Prepared): void {
  const titleStyle: TextStyle = { size: L.TITLE_SIZE, tracking: L.TITLE_TRACK };
  const titleW = sheet.text(
    sheet.fit(p.title, titleStyle, L.TITLE_MAX_W),
    L.CONTENT_L,
    L.TITLE_BASELINE,
    titleStyle,
  );
  sheet.text(
    p.period,
    L.CONTENT_L + titleW + L.PERIOD_GAP,
    L.TITLE_BASELINE,
    { size: L.PERIOD_SIZE, color: SUB },
  );

  const metaStyle: TextStyle = { size: L.HEAD_META_SIZE, color: SUB };
  const metaW = 260;
  const firstBaseline = L.CONTENT_T - L.HEAD_META_TOP;
  if (p.organization) {
    sheet.textRight(sheet.fit(p.organization, metaStyle, metaW), L.CONTENT_R, firstBaseline, metaStyle);
  }
  sheet.textRight(
    sheet.fit(p.createdLine, metaStyle, metaW),
    L.CONTENT_R,
    p.organization ? firstBaseline - L.HEAD_META_LINE_H : firstBaseline,
    metaStyle,
  );

  sheet.rule(L.CONTENT_L, L.CONTENT_R, L.HEAD_RULE_Y, RULE, INK);
}

/* ------------------------------------------------------------------ *
 * 2) KPI ストリップ（4枠）
 *    ⚠ ここに黒ベタは使わない。淡い地＋上辺の罫だけで枠を作る
 * ------------------------------------------------------------------ */

function drawKpis(sheet: Sheet, p: Prepared): void {
  const labelStyle: TextStyle = { size: L.KPI_LABEL_SIZE, color: SUB };
  const valueStyle: TextStyle = { size: L.KPI_VALUE_SIZE };
  const subStyle: TextStyle = { size: L.KPI_SUB_SIZE, color: SUB };

  p.kpis.forEach((kpi, i) => {
    const x = L.kpiX(i);
    sheet.rect(x, L.KPI_BOTTOM, L.KPI_W, L.KPI_H, BAND);
    sheet.rule(x, x + L.KPI_W, L.KPI_TOP, RULE, INK);

    sheet.text(kpi.label, x + L.KPI_PAD_X, L.KPI_TOP - L.KPI_LABEL_TOP, labelStyle);
    sheet.numberRight(
      kpi.value,
      x + L.KPI_W - L.KPI_PAD_X,
      L.KPI_BOTTOM + L.KPI_VALUE_BOTTOM,
      valueStyle,
      L.KPI_INNER_W,
    );
    sheet.textRight(
      sheet.fit(kpi.sub, subStyle, L.KPI_INNER_W),
      x + L.KPI_W - L.KPI_PAD_X,
      L.KPI_BOTTOM + L.KPI_SUB_BOTTOM,
      subStyle,
    );
  });
}

/* ------------------------------------------------------------------ *
 * 3) 主グラフ（棒＋折れ線）＝ 紙面の主役
 * ------------------------------------------------------------------ */

function drawLegend(sheet: Sheet, p: Prepared, baseline: number): void {
  const style: TextStyle = { size: L.LEGEND_SIZE, color: SUB };
  const widths = p.legend.map((item) => sheet.measure(item.label, style));
  const total =
    widths.reduce((s, w) => s + w + L.LEGEND_SWATCH_W + L.LEGEND_GAP, 0) +
    L.LEGEND_ITEM_GAP * (p.legend.length - 1);

  let x = L.CONTENT_R - total;
  const center = baseline + L.LEGEND_SIZE * OPTICAL_CENTER;

  p.legend.forEach((item, i) => {
    if (item.kind === "swatch") {
      sheet.rect(x, center - L.LEGEND_SWATCH_H / 2, L.LEGEND_SWATCH_W, L.LEGEND_SWATCH_H, item.color);
    } else {
      sheet.line(x, center, x + L.LEGEND_SWATCH_W, center, L.LINE_THICK, item.color, item.dash);
    }
    x += L.LEGEND_SWATCH_W + L.LEGEND_GAP;
    sheet.text(item.label, x, baseline, style);
    x += widths[i] + L.LEGEND_ITEM_GAP;
  });
}

function drawChart(sheet: Sheet, p: Prepared): void {
  const headBaseline = L.CHART_TOP - L.CHART_HEAD_SIZE * L.ASC_RATIO;
  sheet.text(p.chartHead, L.CONTENT_L, headBaseline, {
    size: L.CHART_HEAD_SIZE,
    color: SUB,
    tracking: L.CHART_HEAD_TRACK,
  });
  drawLegend(sheet, p, headBaseline);

  const g = p.geometry;
  const tickStyle: TextStyle = { size: L.AXIS_TICK_SIZE, color: SUB };

  /* 目盛線（0 の線だけ太く濃く） */
  for (const grid of g.gridY) {
    sheet.rule(
      L.PLOT_L,
      L.PLOT_R,
      grid.y,
      grid.isZero ? RULE : HAIR,
      grid.isZero ? INK : HAIRLINE,
    );
    sheet.textRight(
      grid.label,
      L.PLOT_L - L.AXIS_TICK_GAP,
      sheet.baselineFromCenter(grid.y, L.AXIS_TICK_SIZE),
      tickStyle,
    );
  }

  /* 棒（当月だけ黒ベタ） */
  for (const bar of g.bars) {
    sheet.rect(bar.x, bar.y, bar.w, bar.h, bar.isCurrent ? INK : BAR_TINT);
  }

  /* 前年同月マーカー（棒に重ねる短い破線）
     ⚠ 実線にすると、同じ太さ・近い濃さの折れ線と紙面で見分けがつかない（実測で確認） */
  for (const tick of g.yoyTicks) {
    sheet.line(tick.x1, tick.y, tick.x2, tick.y, L.YOY_TICK_THICK, YOY_TINT, [...L.YOY_TICK_DASH]);
  }

  /* 3 か月移動平均（欠測で切れる区間ごとに引く） */
  for (const line of g.polylines) {
    for (let i = 0; i < line.length - 1; i++) {
      sheet.line(line[i].x, line[i].y, line[i + 1].x, line[i + 1].y, L.LINE_THICK, LINE_TINT);
    }
  }
  if (g.lastPoint) {
    sheet.dot(g.lastPoint.x, g.lastPoint.y, g.markerRadius, LINE_TINT);
  }

  /* 月ラベル */
  for (const label of g.monthLabels) {
    sheet.textCenter(label.text, label.x, L.PLOT_B - L.MONTH_LABEL_TOP, {
      size: L.MONTH_LABEL_SIZE,
      color: SUB,
    });
  }
}

/* ------------------------------------------------------------------ *
 * 4) 下段左：区分別ランキング（横棒）
 * ------------------------------------------------------------------ */

function drawBlockHead(sheet: Sheet, text: string, left: number, right: number): void {
  sheet.text(text, left, L.LOWER_TOP - L.BLOCK_HEAD_SIZE * L.ASC_RATIO, {
    size: L.BLOCK_HEAD_SIZE,
    color: SUB,
    tracking: L.BLOCK_HEAD_TRACK,
  });
  sheet.rule(left, right, L.BLOCK_RULE_Y, HAIR, HAIRLINE);
}

function drawRanking(sheet: Sheet, p: Prepared): void {
  drawBlockHead(sheet, p.rankHead, L.RANK_L, L.RANK_R);

  const colStyle: TextStyle = { size: L.RANK_COLHEAD_SIZE, color: SUB };
  const colBaseline = sheet.baselineFromCenter(
    L.RANK_ROW_TOP + L.RANK_COLHEAD_H / 2,
    L.RANK_COLHEAD_SIZE,
  );
  sheet.textRight(p.rankCols[0], L.RANK_AMOUNT_R, colBaseline, colStyle);
  sheet.textRight(p.rankCols[1], L.RANK_SHARE_R, colBaseline, colStyle);
  sheet.textRight(p.rankCols[2], L.RANK_YOY_R, colBaseline, colStyle);

  const textStyle: TextStyle = { size: L.RANK_TEXT_SIZE };
  const rows = p.rankRows.slice(0, L.RANK_MAX_ROWS);

  rows.forEach((row, i) => {
    const center = L.RANK_ROW_TOP - L.RANK_ROW_H * i - L.RANK_ROW_H / 2;
    const baseline = sheet.baselineFromCenter(center, L.RANK_TEXT_SIZE);

    sheet.text(sheet.fit(row.name, textStyle, L.RANK_NAME_W), L.RANK_L, baseline, textStyle);

    // 満尺の地を敷いてから、実際の長さを重ねる（「どれくらいか」が一目で分かる）
    sheet.rect(L.RANK_BAR_L, center - L.RANK_BAR_H / 2, L.RANK_BAR_W, L.RANK_BAR_H, BAND);
    if (row.ratio > 0) {
      sheet.rect(
        L.RANK_BAR_L,
        center - L.RANK_BAR_H / 2,
        L.RANK_BAR_W * row.ratio,
        L.RANK_BAR_H,
        BAR_TINT,
      );
    }

    sheet.numberRight(row.amount, L.RANK_AMOUNT_R, baseline, textStyle, 82);
    sheet.numberRight(row.share, L.RANK_SHARE_R, baseline, textStyle, 42);
    sheet.numberRight(row.yoy, L.RANK_YOY_R, baseline, textStyle, 52);
  });
}

/* ------------------------------------------------------------------ *
 * 5) 下段右：要約文
 * ------------------------------------------------------------------ */

function drawSummary(sheet: Sheet, p: Prepared, hasMissingNote: boolean): void {
  drawBlockHead(sheet, p.summaryHead, L.SUMMARY_L, L.SUMMARY_R);

  const style: TextStyle = { size: L.SUMMARY_BODY_SIZE };
  const countLines = (s: string) => sheet.wrap(s, style, L.SUMMARY_W).length;

  /*
   * 画面側は書体を持たないので文字幅の見積もりで席を決めている。
   * ここでは**実測で測り直す**。見積もりが甘くて溢れそうなときだけ、
   * 後ろの文を落として紙面を守る（欠測の説明だけは決して落とさない）。
   */
  const head = hasMissingNote ? p.summary.slice(0, -1) : p.summary;
  const tail = hasMissingNote ? (p.summary[p.summary.length - 1] ?? null) : null;
  const sentences = fitSummary(head, tail, countLines);

  let baseline = sheet.baselineFromTop(L.SUMMARY_BODY_TOP, L.SUMMARY_BODY_SIZE);
  for (const sentence of sentences) {
    for (const line of sheet.wrap(sentence, style, L.SUMMARY_W)) {
      sheet.text(line, L.SUMMARY_L, baseline, style);
      baseline -= L.SUMMARY_LINE_H;
    }
    baseline -= L.SUMMARY_PARA_GAP;
  }
}

/* ------------------------------------------------------------------ *
 * 6) フッター
 * ------------------------------------------------------------------ */

function drawFooter(sheet: Sheet, p: Prepared): void {
  const style: TextStyle = { size: L.FOOTER_SIZE, color: SUB };
  sheet.text(
    sheet.fit(p.footerLeft, style, L.FOOTER_SOURCE_W),
    L.CONTENT_L,
    L.FOOTER_BASELINE,
    style,
  );
  sheet.textRight(p.footerRight, L.CONTENT_R, L.FOOTER_BASELINE, style);
}

/* ------------------------------------------------------------------ *
 * 本体
 * ------------------------------------------------------------------ */

export async function renderMonthlyReportPdf(
  options: RenderMonthlyReportOptions,
): Promise<Uint8Array> {
  const { doc, meta, fontBytes, source } = options;
  const p = prepare(doc, meta, source);

  // 収録チェック → 当て木入り fontkit → subset 判定 → embedFont の順序は _shared/pdfKit が持つ
  const { pdf, sheet } = await createJpPdf({
    fontBytes,
    texts: collectTexts(p),
    title: `${p.title} ${p.period}`.trim(),
    producer: "akashiki monthly report tool",
    creator: "akashiki monthly report tool",
  });

  const page = pdf.addPage([L.PAGE_W, L.PAGE_H]);
  sheet.target = page;
  sheet.pageNo = 1;

  drawHeader(sheet, p);
  drawKpis(sheet, p);
  drawChart(sheet, p);
  drawRanking(sheet, p);
  drawSummary(sheet, p, doc.missing.length > 0);
  drawFooter(sheet, p);

  sheet.target = null;
  return pdf.save();
}
