/**
 * 月次レポートPDF — 要約文
 *
 * ── 大原則（ここを緩めたら、このツールの価値が無くなる）─────────────
 * 1. **AI は使わない。**ブラウザ内で完結し、売上データを外へ出さないため。
 *    文は決められた型に数字を差し込んで組み立てる。
 * 2. **事実だけを書く。**「増加／減少」は事実、「改善／悪化」は評価。
 *    評価・助言・原因の推測は書かない（生成後に禁止語で機械的に検査する）。
 * 3. **数字は ReportDoc の値だけを使う。**ここで計算し直さない。
 *    紙面の他の場所と数字が食い違ったら、それは再計算している証拠。
 * 4. **出せない指標について「—」を含む文を作らない。**その文型ごと出さない。
 *    唯一の例外が欠測の説明（#6）で、これは黙って隠さないために必ず最後に置く。
 * ────────────────────────────────────────────────────
 */

import { formatNumber, formatYen } from "../_shared/format";
import {
  formatMonthJa,
  formatSignedRate,
  formatSignedYen,
  monthKeyOfYm,
  shiftMonth,
} from "./display";
import { SUMMARY_BODY_H, SUMMARY_LINE_H, SUMMARY_PARA_GAP, SUMMARY_BODY_SIZE, SUMMARY_W } from "./layout";
import { FLAT_RATE_THRESHOLD, FORBIDDEN_SUMMARY_WORDS } from "./types";
import type { MonthlyPoint, ReportDoc } from "./types";

/* ------------------------------------------------------------------ *
 * 収まりの見積もり
 *
 * ⚠ 紙の実寸を測るには書体（5.4MB）が要るが、要約文は画面を開いた瞬間にも要る。
 *    そこで **1 文字ぶんの幅を表にして見積もる**。全角は 1em、それ以外は下表。
 *    値は Noto Sans JP を実測して入れてある（検証スクリプトで実測と突き合わせている）。
 *    要約文に出る文字は「数字・¥・%・記号・年月の漢字」に限られるので、見積もりが効く。
 * ------------------------------------------------------------------ */

/** 全角以外の文字の想定幅（em 比） */
const NARROW_EM: Record<string, number> = {
  "0": 0.57, "1": 0.57, "2": 0.57, "3": 0.57, "4": 0.57,
  "5": 0.57, "6": 0.57, "7": 0.57, "8": 0.57, "9": 0.57,
  "¥": 0.57,
  "%": 0.83,
  "+": 0.6,
  "-": 0.34,
  ",": 0.26,
  ".": 0.26,
  "±": 0.6,
  " ": 0.26,
};

/** 表に無い半角文字の既定値（要約文には基本的に出ない） */
const NARROW_DEFAULT = 0.6;

function charEm(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  // U+3000 以降は全角（かな・漢字・全角記号・全角英数）とみなす
  if (code >= 0x3000) return 1;
  return NARROW_EM[ch] ?? NARROW_DEFAULT;
}

/** 幅 maxWidth で折り返したときの行数。pdfKit の wrap を素朴になぞったもの */
export function estimateLines(text: string, size: number, maxWidth: number): number {
  if (!text) return 1;
  let lines = 1;
  let x = 0;
  for (const ch of text) {
    const w = charEm(ch) * size;
    if (x + w > maxWidth + 1e-6) {
      lines++;
      x = 0;
    }
    x += w;
  }
  return lines;
}

/** 段落の集合が占める高さ（pt） */
function blockHeight(sentences: readonly string[], countLines: (s: string) => number): number {
  if (sentences.length === 0) return 0;
  let lines = 0;
  for (const s of sentences) lines += countLines(s);
  return lines * SUMMARY_LINE_H + (sentences.length - 1) * SUMMARY_PARA_GAP;
}

/**
 * 上から順に入るだけ入れる。**最後の文（欠測の説明）だけは必ず残す。**
 * 席が足りなければ、その手前の文を後ろから落として席を作る。
 *
 * @param head    優先順位の高い順に並んだ文（#1〜#5）
 * @param tail    必ず入れる文（#6）。無ければ null
 * @param countLines 1文が何行になるか
 */
export function fitSummary(
  head: readonly string[],
  tail: string | null,
  countLines: (s: string) => number,
): string[] {
  const body: string[] = [];
  for (const s of head) {
    const next = [...body, s];
    if (blockHeight(tail ? [...next, tail] : next, countLines) <= SUMMARY_BODY_H) {
      body.push(s);
    } else {
      break;
    }
  }
  if (tail === null) return body;
  while (body.length > 0 && blockHeight([...body, tail], countLines) > SUMMARY_BODY_H) {
    body.pop();
  }
  return [...body, tail];
}

/* ------------------------------------------------------------------ *
 * 文の組み立て
 * ------------------------------------------------------------------ */

/** 前月を上回った（下回った）月が何か月続いているか。同額のところで切る */
function consecutiveRun(series: readonly MonthlyPoint[]): { months: number; up: boolean } | null {
  let months = 0;
  let dir = 0;
  for (let i = series.length - 1; i >= 1; i--) {
    const cur = series[i];
    const prev = series[i - 1];
    // 月が飛んでいたら「連続」とは言えない
    if (prev.key !== monthKeyOfYm(shiftMonth(cur.ym, -1))) break;
    const diff = cur.amount - prev.amount;
    if (diff === 0) break;
    const sign = diff > 0 ? 1 : -1;
    if (dir === 0) dir = sign;
    else if (sign !== dir) break;
    months++;
  }
  return months >= 2 ? { months, up: dir > 0 } : null;
}

/** 欠測月の並べ方。多いときは頭 3 件＋残りの件数（月数は必ず言う） */
function missingPhrase(keys: readonly string[]): string {
  if (keys.length <= 4) return keys.map(formatMonthJa).join("・");
  const head = keys.slice(0, 3).map(formatMonthJa).join("・");
  return `${head}ほか${keys.length - 3}か月`;
}

/** 率の言い回し。丸めて 0.0% になるものは「ほぼ横ばい」と書く（これは評価ではなく丸めの事実） */
function ratePhrase(rate: number, delta: number | null): string {
  const amount = delta === null ? "" : `・${formatSignedYen(delta)}`;
  if (Math.abs(rate) < FLAT_RATE_THRESHOLD) return `ほぼ横ばい（±0.1%未満${amount}）`;
  return delta === null ? formatSignedRate(rate) : `${formatSignedRate(rate)}（${formatSignedYen(delta)}）`;
}

/**
 * 要約文を組み立てる。
 * ⚠ 呼ぶのは `buildReport` の最後だけ。ここで doc の数字を作り直さない。
 */
export function buildSummary(doc: ReportDoc): string[] {
  const head: string[] = [];
  const target = doc.target;

  /* #1 当月の実績（常に出す） */
  const unit = target.unitPrice === null ? "" : `・平均単価${formatYen(target.unitPrice)}`;
  head.push(
    `${formatMonthJa(target.key)}の売上は${formatYen(target.amount)}でした（件数${formatNumber(target.count)}件${unit}）。`,
  );

  /* #2 前月比（＋連続の付記） */
  if (doc.mom.rate !== null && doc.mom.baseKey) {
    const run = consecutiveRun(doc.series);
    const runText = run ? `${run.months}か月連続で前月を${run.up ? "上回って" : "下回って"}います。` : "";
    head.push(
      `前月（${formatMonthJa(doc.mom.baseKey)}）比は${ratePhrase(doc.mom.rate, doc.mom.delta)}です。${runText}`,
    );
  }

  /* #3 前年同月比／#3' 前年同月のデータが無い旨 */
  if (doc.yoy.rate !== null && doc.yoy.baseKey) {
    head.push(
      `前年同月（${formatMonthJa(doc.yoy.baseKey)}）比は${ratePhrase(doc.yoy.rate, doc.yoy.delta)}です。`,
    );
  } else if (doc.yoy.unavailable === "no-data" && doc.yoy.baseKey) {
    head.push(
      `前年同月（${formatMonthJa(doc.yoy.baseKey)}）のデータが含まれていないため、前年同月比は算出していません。`,
    );
  }

  /* #4 年度累計 */
  const fiscalYear = Number(doc.ytd.startKey.slice(0, 4));
  const fiscalMonth = Number(doc.ytd.startKey.slice(5, 7));
  const ytdHead = `${fiscalYear}年度（${fiscalMonth}月開始）の累計は${formatYen(doc.ytd.amount)}`;
  head.push(
    doc.ytdYoy.rate === null
      ? `${ytdHead}です。`
      : `${ytdHead}で、前年同期比は${formatSignedRate(doc.ytdYoy.rate)}です。`,
  );

  /* #5 表示期間の最大・最小 */
  if (doc.series.length >= 3) {
    let max = doc.series[0];
    let min = doc.series[0];
    for (const p of doc.series) {
      if (p.amount > max.amount) max = p;
      if (p.amount < min.amount) min = p;
    }
    head.push(
      `表示している${doc.series.length}か月では、${formatMonthJa(max.key)}の${formatYen(max.amount)}が最大、${formatMonthJa(min.key)}の${formatYen(min.amount)}が最小です。`,
    );
  }

  /* #6 欠測の説明（必ず最後・落とさない） */
  const tail =
    doc.missing.length > 0
      ? `${missingPhrase(doc.missing.map((m) => m.key))}はデータが含まれていないため、集計から除いています。`
      : null;

  const sentences = fitSummary(head, tail, (s) =>
    estimateLines(s, SUMMARY_BODY_SIZE, SUMMARY_W),
  );
  assertNoJudgement(sentences);
  return sentences;
}

/* ------------------------------------------------------------------ *
 * 検査
 * ------------------------------------------------------------------ */

/**
 * 評価語・助言・原因の推測が混ざっていないかを機械的に見る。
 * ⚠ 文型を足したら必ずここを通す。事実だけを書くという約束は、目視では守れない。
 */
export function assertNoJudgement(sentences: readonly string[]): void {
  for (const s of sentences) {
    for (const word of FORBIDDEN_SUMMARY_WORDS) {
      if (s.includes(word)) {
        throw new Error(`要約文に評価語が混入しています：「${word}」／ ${s}`);
      }
    }
  }
}
