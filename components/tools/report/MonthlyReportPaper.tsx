"use client";

import type { CSSProperties } from "react";

import { formatNumber, formatYen } from "@/lib/tools/_shared/format";
import { chartUnitLabel } from "@/lib/tools/report/chart";
import {
  DASH,
  cleanLine,
  formatComparisonRate,
  formatMonthJa,
  formatPeriodJa,
  formatShare,
  formatSignedRate,
  formatSignedYen,
} from "@/lib/tools/report/display";
import * as L from "@/lib/tools/report/layout";
import type { Comparison, ReportDoc, ReportMeta } from "@/lib/tools/report/types";
import ReportChart from "./ReportChart";
import styles from "./MonthlyReportPaper.module.css";

/**
 * A4 横（297×210mm）の月次レポート プレビュー。
 *
 * PDF側（lib/tools/report/pdf.ts）と同じ版面設計を、pt を単位に再現している。
 * 位置と大きさは `layout.ts` の `PAPER_VARS` から CSS 変数として流し込み、
 * CSS 側では `calc(var(--rp-x) * var(--pt))` としか書かない。
 * ＝ **CSS に数値を書き写さない**ので、版面を直すと紙とプレビューが同時に動く。
 *
 * ⚠ 数字は `ReportDoc` の値をそのまま表示する。ここで計算し直さない。
 */

interface MonthlyReportPaperProps {
  doc: ReportDoc;
  meta: ReportMeta;
  source: { name: string; rows: number };
  className?: string;
}

/** YYYY-MM-DD → 2026年6月3日 */
function formatCreated(iso: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso.trim());
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : cleanLine(iso);
}

/** KPI の補足。率が出せないときも増減額は出す（紙と同じ文言） */
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

export default function MonthlyReportPaper({
  doc,
  meta,
  source,
  className = "",
}: MonthlyReportPaperProps) {
  const created = formatCreated(meta.createdDate) || "";
  const author = cleanLine(meta.authorName);
  const organization = cleanLine(meta.organization);
  const title = cleanLine(meta.title) || "月次レポート";

  const unitPrice =
    doc.target.unitPrice === null ? "" : `・平均 ${formatYen(doc.target.unitPrice)}`;
  const fiscalYear = Number(doc.ytd.startKey.slice(0, 4));
  const fiscalMonth = Number(doc.ytd.startKey.slice(5, 7));

  const kpis = [
    {
      label: "当月売上",
      value: formatYen(doc.target.amount),
      sub: `${formatMonthJa(doc.target.key)}・${formatNumber(doc.target.count)}件${unitPrice}`,
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
        doc.ytdYoy.rate === null
          ? `${fiscalYear}年度（${fiscalMonth}月〜）・${formatNumber(doc.ytd.months)}か月ぶん`
          : `${fiscalYear}年度（${fiscalMonth}月〜）・前年同期 ${formatSignedRate(doc.ytdYoy.rate)}`,
    },
  ];

  const maxRank = doc.breakdown.reduce((m, b) => Math.max(m, b.amount), 0);
  const rows = doc.breakdown.slice(0, L.RANK_MAX_ROWS);

  return (
    <div
      className={`${styles.paper} ${className}`}
      style={L.PAPER_VARS as unknown as CSSProperties}
      data-report-paper
    >
      {/* ---- ヘッダー ---- */}
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <h3 className={styles.title}>{title}</h3>
          <span className={styles.period}>{formatPeriodJa(doc.target.key)}</span>
        </div>
        <div className={styles.headRight}>
          {organization ? <p className={styles.metaLine}>{organization}</p> : null}
          <p className={styles.metaLine}>
            作成 {created}
            {author ? ` ・ ${author}` : ""}
          </p>
        </div>
      </div>
      <span className={styles.headRule} aria-hidden="true" />

      {/* ---- KPI ---- */}
      <div className={styles.kpis}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpi}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <span className={styles.kpiValue}>{kpi.value}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* ---- 主グラフ ---- */}
      <div className={styles.chart}>
        <div className={styles.chartHead}>
          <span className={styles.chartTitle}>
            月次売上の推移（単位：{chartUnitLabel(doc)}）
          </span>
          <span className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchInk}`} aria-hidden="true" />
              当月
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchBar}`} aria-hidden="true" />
              前月まで
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dash} ${styles.dashYoy}`} aria-hidden="true" />
              前年同月
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dash} ${styles.dashLine}`} aria-hidden="true" />
              3か月移動平均
            </span>
          </span>
        </div>
        <div className={styles.chartBody}>
          <ReportChart doc={doc} />
        </div>
      </div>

      {/* ---- 下段左：区分別ランキング ---- */}
      <div className={styles.rank}>
        <span className={styles.blockHead}>
          {doc.axis === "item" ? "商品・サービス別" : "取引先別"}（
          {formatMonthJa(doc.target.key)}）
        </span>
        <span className={styles.blockRule} aria-hidden="true" />
        <div className={styles.rankColHead}>
          <span />
          <span />
          <span className={styles.num}>金額</span>
          <span className={styles.num}>構成比</span>
          <span className={styles.num}>前年同月比</span>
        </div>
        <div className={styles.rankRows}>
          {rows.map((row) => (
            <div key={row.name} className={styles.rankRow}>
              <span className={styles.rankName}>{row.name}</span>
              <span className={styles.rankBarTrack}>
                <span
                  className={styles.rankBarFill}
                  style={{
                    width: `${maxRank > 0 ? Math.max(0, Math.min(1, row.amount / maxRank)) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className={styles.num}>{formatYen(row.amount)}</span>
              <span className={styles.num}>{formatShare(row.share)}</span>
              <span className={styles.num}>
                {row.isOthers ? DASH : formatComparisonRate(row.yoy)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- 下段右：要約 ---- */}
      <div className={styles.summary}>
        <span className={styles.blockHead}>要約</span>
        <span className={styles.blockRule} aria-hidden="true" />
        <div className={styles.summaryBody}>
          {doc.summary.map((sentence, i) => (
            <p key={i} className={styles.summaryLine}>
              {sentence}
            </p>
          ))}
        </div>
      </div>

      {/* ---- フッター ---- */}
      <div className={styles.footer}>
        <span>
          集計元：{cleanLine(source.name)}（{formatNumber(source.rows)}行）
        </span>
        <span>作成 {created}</span>
      </div>
    </div>
  );
}
