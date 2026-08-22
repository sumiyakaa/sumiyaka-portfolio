/**
 * 月次レポートPDF — サンプル売上表
 *
 * ⚠ 会社名・取引先名・金額はすべて **架空** です。実在の企業・個人とは関係ありません。
 *
 * 2025年4月〜2026年5月（14か月）・対象月＝2026年5月・年度の期首＝4月。
 * この並びは、前月比／前年同月比／年度累計／前年同期比の4つが**すべて計算できる**唯一の形。
 * 対象月を年度の後半に置くと、14か月では前年同期が必ず欠ける。**この期間を動かさない。**
 *
 * ── 行の作り方（70行ではなく 336行にした理由）─────────────────────
 * 計画書の初案は「14か月 × 5区分 ＝ 70行」だったが、それだと 1 か月に 1 区分 1 行しか
 * 存在せず、**商品・サービス別と取引先別のランキングが必ず同じ金額の並べ替えになる。**
 * 画面には軸を切り替えるボタンがあるので、切り替えても棒の長さが1本も変わらないのは
 * デモとして不自然（＝作り物だと分かる）。
 * そこで「商品 × 取引先」の交差表を月ごとに持ち、両方の軸が別々の分布になるようにした。
 * 交差表は 5×5 のうち 24 セル（受託開発×カネマツ電機だけ 0）＝ 1 か月 24 行・計 336 行。
 * ⚠ 月合計（§12-2）と、対象月・前年同月の区分内訳（§12-3）は計画書のとおり厳密に一致する。
 * ────────────────────────────────────────────────────
 */

import type { ReportMeta, SalesRow } from "./types";

/** 区分の軸A。交差表の行 */
const ITEMS = ["定期保守", "受託開発", "ライセンス", "スポット対応", "物販"] as const;

/** 区分の軸B。交差表の列 */
const CLIENTS = [
  "株式会社あさひ商会",
  "峰岸製作所",
  "ライトウェル合同会社",
  "南部フーズ",
  "カネマツ電機",
] as const;

/** 商品 × 取引先 の交差表（**万円**）。行 ＝ ITEMS、列 ＝ CLIENTS */
type Mix = readonly (readonly number[])[];

/**
 * 対象月 2026年5月の内訳。
 * 行合計 ＝ 382 / 314 / 226 / 138 / 86（計画書 §12-3）
 * 列合計 ＝ 356 / 268 / 214 / 176 / 132 ＝ 1,146万円
 */
const MIX_TARGET: Mix = [
  [120, 96, 76, 56, 34],
  [130, 92, 52, 40, 0],
  [64, 48, 50, 40, 24],
  [30, 22, 26, 26, 34],
  [12, 10, 10, 14, 40],
];

/**
 * 前年同月 2025年5月の内訳。
 * 行合計 ＝ 341 / 302 / 188 / 124 / 69（計画書 §12-3）
 * 列合計 ＝ 322 / 246 / 188 / 158 / 110 ＝ 1,024万円
 */
const MIX_BASE: Mix = [
  [108, 86, 68, 50, 29],
  [126, 88, 50, 38, 0],
  [54, 40, 42, 32, 20],
  [26, 22, 22, 24, 30],
  [8, 10, 6, 14, 31],
];

interface MonthTotal {
  /** "YYYY-MM" */
  key: string;
  /** 月の売上合計（円） */
  amount: number;
  /** 月の件数合計 */
  count: number;
}

/** 月合計（計画書 §12-2）。ここが正で、行はここから作る */
const MONTHLY: readonly MonthTotal[] = [
  { key: "2025-04", amount: 9880000, count: 128 },
  { key: "2025-05", amount: 10240000, count: 131 },
  { key: "2025-06", amount: 9860000, count: 126 },
  { key: "2025-07", amount: 10510000, count: 134 },
  { key: "2025-08", amount: 7930000, count: 102 },
  { key: "2025-09", amount: 10470000, count: 133 },
  { key: "2025-10", amount: 10120000, count: 129 },
  { key: "2025-11", amount: 10880000, count: 138 },
  { key: "2025-12", amount: 12940000, count: 159 },
  { key: "2026-01", amount: 8760000, count: 113 },
  { key: "2026-02", amount: 9340000, count: 119 },
  { key: "2026-03", amount: 10510000, count: 132 },
  { key: "2026-04", amount: 10930000, count: 137 },
  { key: "2026-05", amount: 11460000, count: 142 },
];

interface MixCell {
  item: string;
  client: string;
  weight: number;
}

/** 交差表を「重み付きのセルの並び」へ畳む（0 のセルは行を作らない） */
function cellsOf(mix: Mix): MixCell[] {
  const cells: MixCell[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    for (let c = 0; c < CLIENTS.length; c++) {
      const weight = mix[i][c];
      if (weight > 0) cells.push({ item: ITEMS[i], client: CLIENTS[c], weight });
    }
  }
  return cells;
}

/**
 * total を weights の比で整数へ配分する（最大剰余方式）。
 * **合計は必ず total に一致する**ので、月合計が丸めで崩れない。
 * weights の合計がちょうど total のときは weights がそのまま返る。
 */
function apportion(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map((v) => Math.floor(v));
  let rest = total - out.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < order.length && rest > 0; k++) {
    out[order[k].i]++;
    rest--;
  }
  return out;
}

/** 件数の配分。金額のある行が 0 件にならないよう、いちばん多い行から 1 件だけ回す */
function apportionCounts(total: number, weights: readonly number[]): number[] {
  const out = apportion(total, weights);
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== 0 || weights[i] <= 0) continue;
    let max = 0;
    for (let j = 1; j < out.length; j++) if (out[j] > out[max]) max = j;
    if (out[max] > 1) {
      out[max]--;
      out[i]++;
    }
  }
  return out;
}

function buildSampleSales(): SalesRow[] {
  const rows: SalesRow[] = [];
  // 1行目は見出し行の想定なので、明細は2行目から始まる
  let line = 2;

  for (const month of MONTHLY) {
    const mix = month.key === "2025-05" ? MIX_BASE : MIX_TARGET;
    const cells = cellsOf(mix);
    const weights = cells.map((c) => c.weight);
    const mans = apportion(month.amount / 10000, weights);
    const counts = apportionCounts(month.count, weights);

    for (let j = 0; j < cells.length; j++) {
      // 月内に散らす（1..27 に収めるので 2月でも実在する日付になる）
      const day = 2 + ((j * 7) % 26);
      rows.push({
        date: `${month.key}-${day < 10 ? "0" + day : day}`,
        amount: mans[j] * 10000,
        count: counts[j],
        itemName: cells[j].item,
        clientName: cells[j].client,
        sourceLine: line++,
      });
    }
  }
  return rows;
}

/** サンプル売上表（14か月・336行）。欠測month・0円の月ともに無い、素直なデータ */
export const SAMPLE_SALES: SalesRow[] = buildSampleSales();

/** 画面の `statusFile` に出す名前 */
export const SAMPLE_SOURCE_NAME = "サンプル売上表";

/**
 * 検証用①：直近3か月だけ（2026-03〜05）。
 * 前年同月比が出せないこと（`—` になり、0% にならないこと）を確かめる。
 */
export const SAMPLE_SALES_SHORT: SalesRow[] = SAMPLE_SALES.filter(
  (r) => r.date >= "2026-03",
);

/**
 * 検証用②：2025年11月の行をすべて落としたもの。
 * 棒が13本になり、欠測月として名指しされ、**0円の棒が描かれない**ことを確かめる。
 */
export const SAMPLE_SALES_GAP: SalesRow[] = SAMPLE_SALES.filter(
  (r) => !r.date.startsWith("2025-11"),
);

/**
 * 検証用③：2026年4月の金額をすべて 0 にしたもの。
 * 前月比の率が出せず（zero-base）、それでも増減額は出ることを確かめる。
 */
export const SAMPLE_SALES_ZERO: SalesRow[] = SAMPLE_SALES.map((r) =>
  r.date.startsWith("2026-04") ? { ...r, amount: 0 } : r,
);

/** サンプルの表題・作成者。一目でサンプルと分かる値にしてある */
export const SAMPLE_META: ReportMeta = {
  organization: "AKASHIKI（灯敷）　営業部",
  authorName: "灯敷 太郎",
  createdDate: "2026-06-03",
  title: "月次レポート",
};
