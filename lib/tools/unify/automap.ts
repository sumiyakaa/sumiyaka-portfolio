/**
 * 列マッピング統合ツール（T-04） — オートマッピング
 *
 * 入力ファイルの見出しと、出力スキーマの見出しを突き合わせて **下書きの線を引く**。
 * 確定させるのは人であり、ここは下書きしか作らない。
 *
 * ★このツールの差別化は「よく当てること」ではなく **「自信が無いときに線を引かないこと」**。
 *   誤った線は、線が無いことより悪い（計画書 §14）。だから
 *   ・同点の候補が2つ以上ある出力列には割り当てず、候補名だけ返す（§7-4）
 *   ・部分一致・編集距離で当たったものは「要確認」の段階（partial / similar）で返し、
 *     画面に破線で描かせる
 *   ・人が引いた線（manual / const）は機械が上書きしない
 *
 * ⚠ **静的層**（画面が最初から import する層）。`_shared/sheetReader` から
 *    **値を import しない**こと（先頭で fflate を引いているため、
 *    ページを開いただけで fflate が落ちてくる）。
 *
 * ⚠ **決定的であること。** 同じ入力なら常に同じ結果を返す。
 *    そのために ①スコアは小数第2位で丸める ②並べ替えの比較関数を全順序にする
 *    （score → targetIndex → 入力列の並び順）③戻り値のキーはスキーマ順に積む、
 *    の3つを守っている。ここを崩すと「開き直すと線が変わる」不具合になり、
 *    利用者から見て原因が分からない。
 *
 * ⚠ 照合キーは `SourceColumn.key`（parse.ts が `unifyKey()` を通して入れたもの）を
 *    そのまま信じる。ここで見出しから作り直さない（二重の正規化規則を持たないため）。
 */

import { aliasGroupOf } from "./aliases";
import { unifyKey } from "./key";
import {
  AUTOMAP_MIN_SCORE,
  CONTAIN_MIN_LENGTH,
  FUZZY_MIN_LENGTH,
  SIMILAR_MAX_RATIO,
} from "./types";
import type {
  Assignment,
  AutoMapResult,
  MatchLevel,
  SourceColumn,
  SourceFile,
  TargetColumn,
  TargetSchema,
} from "./types";

/* ============================================================ *
 * 1. 編集距離
 * ============================================================ */

/**
 * レーベンシュタイン距離（挿入・削除・置換の最小回数）。
 *
 * 見出しは長くても数十文字なので、2行だけ持つ素直な DP で足りる。
 * ⚠ 文字数は UTF-16 のコード単位で数える（`String.length` と同じ）。
 *    見出しにサロゲートペアが出ることは実務上ほぼ無く、
 *    `length` と数え方を揃えておく方が比の計算と食い違わない。
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array<number>(bl + 1);
  let cur = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1;
      const ins = cur[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      let best = del;
      if (ins < best) best = ins;
      if (sub < best) best = sub;
      cur[j] = best;
    }
    const swap = prev;
    prev = cur;
    cur = swap;
  }
  return prev[bl];
}

/* ============================================================ *
 * 2. 段階の判定（計画書 §7-3）
 * ============================================================ */

/** 自動割当が当たりうる段階（manual と none は機械が付けない） */
type AutoLevel = Exclude<MatchLevel, "manual" | "none">;

interface Stage {
  level: AutoLevel;
  /** 補正前のスコア */
  base: number;
}

/**
 * 上から順に試し、**最初に当たった段階**を採る。
 *
 * | # | 段階 | 条件 | スコア |
 * |---|---|---|---|
 * | 1 | 完全一致 | キーが同じ | 100 |
 * | 2 | 別名辞書 | 同じ AliasGroup に属する | 80 |
 * | 3 | 部分一致 | どちらかがもう一方を含む・短い方が CONTAIN_MIN_LENGTH(2) 以上 | 60 + 10×(短/長) |
 * | 4 | 編集距離 | 両方 FUZZY_MIN_LENGTH(3) 以上・dist/長 <= SIMILAR_MAX_RATIO | 40 + 10×(1 − dist/長) |
 *
 * ★段階3と段階4で下限が違う（2 と 3）のは意図的（2026-08-23 メインCC裁定）。
 *   危ないのは編集距離のほうで、2文字で距離1なら半分が違う。
 *   包含は日本語の業務見出しでは略記として頻繁に起き（「担当」と「担当者」）、比較的安全。
 *   かつ包含は **破線＝要確認** で出るので、最後に決めるのは人のまま。
 *   ⚠ 1文字は包含でも当てない（`CONTAIN_MIN_LENGTH` が 2）。
 *     「数」が「件数」「手数料」に当たると誤爆する。
 *     ただし「数」のように **辞書に載っている語**は段階2で当たる。それは辞書の意思。
 *
 * ⚠ 空文字のキーはどの段階にも当てない。
 *    `"abc".includes("")` は true なので、空を通すと全ペアが部分一致になる。
 */
function stageOf(sourceKey: string, targetKey: string): Stage | null {
  if (!sourceKey || !targetKey) return null;

  // 1. 完全一致
  if (sourceKey === targetKey) return { level: "exact", base: 100 };

  // 2. 別名辞書
  const sourceGroup = aliasGroupOf(sourceKey);
  if (sourceGroup !== null && sourceGroup === aliasGroupOf(targetKey)) {
    return { level: "alias", base: 80 };
  }

  const shortLen = Math.min(sourceKey.length, targetKey.length);
  const longLen = Math.max(sourceKey.length, targetKey.length);

  // 3. 部分一致（包含）。1文字は当てない（「数」が「手数料」に当たる）
  if (
    shortLen >= CONTAIN_MIN_LENGTH &&
    (sourceKey.includes(targetKey) || targetKey.includes(sourceKey))
  ) {
    return { level: "partial", base: 60 + 10 * (shortLen / longLen) };
  }

  // 4. 編集距離。包含より足切りが1文字きつい（2文字で距離1なら半分が違う）
  if (shortLen < FUZZY_MIN_LENGTH) return null;
  const ratio = levenshtein(sourceKey, targetKey) / longLen;
  if (ratio <= SIMILAR_MAX_RATIO) {
    return { level: "similar", base: 40 + 10 * (1 - ratio) };
  }

  return null;
}

/**
 * スコアは小数第2位で丸める。
 *
 * 部分一致・編集距離のスコアは割り算で出るため、
 * 60 + 10×(3/7) のような値が二進小数の誤差を持つ。
 * 丸めずに `===` で同点を判定すると、**本来同点のはずの2候補が同点にならず、
 * 誤った線が1本引かれる**（＝このツールがいちばんやってはいけないこと）。
 */
function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 段階が確定したあとの補正（計画書 §7-3）。
 *
 * | 補正 | 値 | 理由 |
 * |---|---|---|
 * | 値の種類が食い違う | −15 | 「金額」という見出しなのに中身が文字列、のような組は疑わしい |
 * | 値の種類が一致・かつ text 以外 | +5 | 日付列どうし・数値列どうしは確度が上がる |
 * | 列の位置が1つ違い以内 | +2 | 同点崩し。決定的な結果にするために要る |
 */
function adjustScore(
  base: number,
  source: SourceColumn,
  target: TargetColumn,
  targetIndex: number,
): number {
  let score = base;
  if (source.guessedKind !== target.kind) {
    score -= 15;
  } else if (target.kind !== "text") {
    score += 5;
  }
  if (Math.abs(source.index - targetIndex) <= 1) {
    score += 2;
  }
  return roundScore(score);
}

/* ============================================================ *
 * 3. 候補
 * ============================================================ */

interface Candidate {
  targetId: string;
  /** スキーマ上の並び順（0始まり）。位置補正と同点崩しに使う */
  targetIndex: number;
  /** SourceColumn.index（＝マッピングの実体） */
  sourceIndex: number;
  /** file.columns 上の並び順。同点崩しに使う（index と別なのは列が飛ぶ場合のため） */
  sourceOrder: number;
  /** 画面にそのまま出す見出し（ambiguous に積む） */
  sourceHeader: string;
  level: AutoLevel;
  score: number;
}

/** 全順序。返り値 0 になる組が無いので、ソートの安定性に依存しない */
function compareForGreedy(a: Candidate, b: Candidate): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.targetIndex !== b.targetIndex) return a.targetIndex - b.targetIndex;
  return a.sourceOrder - b.sourceOrder;
}

/** 出力列ごとの候補の並び。スコア降順 → 入力列の並び順 */
function compareWithinTarget(a: Candidate, b: Candidate): number {
  if (a.score !== b.score) return b.score - a.score;
  return a.sourceOrder - b.sourceOrder;
}

/* ============================================================ *
 * 4. 本体
 * ============================================================ */

/**
 * 1ファイル分の下書きマッピングを作る。
 *
 * @param file     取り込んだファイル1つ
 * @param schema   出力スキーマ
 * @param previous すでに引かれている線。**`const` と `manual` は触らずそのまま残す**
 *                 （人が引いた線を機械が上書きしない）。それ以外は引き直す
 *
 * 手順（計画書 §7-1）
 *   1. previous の const / manual を先に確保し、使っている入力列も使用済みにする
 *   2. 残りの (出力列 × 入力列) の全ペアでスコアを出す（AUTOMAP_MIN_SCORE 未満は捨てる）
 *   3. スコア降順に貪欲に確定する。確定した出力列・入力列は候補から外す
 *   4. その出力列に同点の候補が2つ以上残っていたら **割り当てず** ambiguous に積む
 *
 * 計算量は 40列 × 60列 = 2,400ペア、1ペアあたり編集距離が最大でも数十×数十。
 * ファイルを取り込むたびに同期で走らせて構わない。
 */
export function autoMap(
  file: SourceFile,
  schema: TargetSchema,
  previous?: Record<string, Assignment>,
): AutoMapResult {
  /** targetId → 確定した割当 */
  const assigned = new Map<string, Assignment>();
  /** targetId → 同点で見送った候補の見出し */
  const ambiguousByTarget = new Map<string, string[]>();
  /** もう触らない出力列（割当済み・または同点で見送り済み） */
  const decidedTargets = new Set<string>();
  /** すでに使った入力列の index（1つの入力列を2つの出力列に割り当てない） */
  const usedSources = new Set<number>();

  const sourceIndexes = new Set<number>();
  for (const column of file.columns) sourceIndexes.add(column.index);

  /* --- 1. 人が引いた線を先に確保する --- */
  if (previous) {
    for (const target of schema.columns) {
      const prev = previous[target.id];
      if (!prev) continue;
      if (prev.kind === "const") {
        // 固定値は入力列を消費しない（何列にでも入れられる）
        assigned.set(target.id, prev);
        decidedTargets.add(target.id);
      } else if (prev.kind === "column" && prev.level === "manual") {
        // ⚠ 読み直し（シート変更・見出し行変更）で列が消えていたら、その線は成立しない。
        //    残すと unify() が存在しない列を読むので、ここで捨てて引き直す。
        if (!sourceIndexes.has(prev.index)) continue;
        assigned.set(target.id, prev);
        decidedTargets.add(target.id);
        usedSources.add(prev.index);
      }
      // kind === "column" で level が manual 以外（＝前回の自動割当）は引き直す。
      // kind === "none" も同じく引き直す（「未割当」を人の意思として保存する仕組みは持たない）。
    }
  }

  /* --- 2. 全ペアのスコアを出す --- */
  const candidates: Candidate[] = [];
  const byTarget = new Map<string, Candidate[]>();

  for (let ti = 0; ti < schema.columns.length; ti++) {
    const target = schema.columns[ti];
    if (decidedTargets.has(target.id)) continue;
    const targetKey = unifyKey(target.name);

    for (let si = 0; si < file.columns.length; si++) {
      const source = file.columns[si];
      if (usedSources.has(source.index)) continue;

      const stage = stageOf(source.key, targetKey);
      if (!stage) continue;

      const score = adjustScore(stage.base, source, target, ti);
      if (score < AUTOMAP_MIN_SCORE) continue;

      const candidate: Candidate = {
        targetId: target.id,
        targetIndex: ti,
        sourceIndex: source.index,
        sourceOrder: si,
        sourceHeader: source.header,
        level: stage.level,
        score,
      };
      candidates.push(candidate);
      const list = byTarget.get(target.id);
      if (list) list.push(candidate);
      else byTarget.set(target.id, [candidate]);
    }
  }

  for (const list of byTarget.values()) list.sort(compareWithinTarget);
  candidates.sort(compareForGreedy);

  /* --- 3〜4. スコア降順に貪欲確定。同点なら見送る --- */
  for (const candidate of candidates) {
    if (decidedTargets.has(candidate.targetId)) continue;
    if (usedSources.has(candidate.sourceIndex)) continue;

    // ここに来た候補は、その出力列に残っている中で最高スコア
    //（より高い候補は先に現れており、入力列が埋まっていたから飛ばされている）。
    const list = byTarget.get(candidate.targetId);
    const tied: string[] = [];
    if (list) {
      for (const other of list) {
        if (other.score !== candidate.score) continue;
        if (usedSources.has(other.sourceIndex)) continue;
        tied.push(other.sourceHeader);
      }
    }

    decidedTargets.add(candidate.targetId);

    if (tied.length >= 2) {
      // ★どちらとも決められないので線を引かない。画面には候補名を出す
      ambiguousByTarget.set(candidate.targetId, tied);
      continue;
    }

    usedSources.add(candidate.sourceIndex);
    assigned.set(candidate.targetId, {
      kind: "column",
      index: candidate.sourceIndex,
      level: candidate.level,
      score: candidate.score,
    });
  }

  /* --- 5. スキーマ順に積む（キーの並びまで決定的にする） --- */
  const assignments: Record<string, Assignment> = {};
  const ambiguous: Record<string, string[]> = {};
  for (const target of schema.columns) {
    const value = assigned.get(target.id);
    if (value) assignments[target.id] = value;
    const names = ambiguousByTarget.get(target.id);
    if (names) ambiguous[target.id] = names;
  }
  return { assignments, ambiguous };
}
