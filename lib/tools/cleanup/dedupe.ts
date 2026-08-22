/**
 * 名簿クレンジングツール（T-05） — 重複検出
 *
 * ⚠ この層は一切ネットワークへ出ない（共通仕様 §3-1）。fetch / "use server" を書かない。
 *
 * ⚠⚠ **重複は候補までである。行を自動でまとめない・削除しない**（計画書 §4-2・§15-3）。
 *     どちらを残すかは人が決める。ここが業務ツールとしての信用の分かれ目。
 *
 * ── 4段階（計画書 §9-1）───────────────────────────────────
 *   exact      … **クレンジング前**の文字列がそのまま一致
 *   normalized … 比較キー（§9-2）が一致
 *   kana       … フリガナ列の比較キーが一致
 *   near       … 編集距離による近似一致（候補。人が確かめる前提）
 *
 * **同じ行の組が複数の段階に当たったら上の段階を採用する。**
 * 実装では「上の段階でグループに入った行は、下の段階の対象から外す」形にしている。
 * 画面は1行に1つの記号（A / B / C …）しか出せない＝グループは互いに素でなければならない、
 * という制約と同じことなので、この形が仕様と一致する。
 *
 * ⚠ 既知の取りこぼし（正直に書いておく）：
 *   1. 上の段階で確定した行は下の段階に出てこない。
 *      「完全一致した2行に、表記だけ違う3行目がある」場合、3行目は候補に出ない。
 *   2. ブロッキング（先頭2文字）のため、**先頭が大きく違う組は near で見つけられない**（§9-5-6）。
 *      画面にその旨を1行書くこと。
 * ────────────────────────────────────────────────────
 */

import {
  fullWidthAlnumToHalf,
  halfWidthKanaToFull,
  hiraganaToKatakana,
  stripCorporateForm,
  variantToStandard,
} from "./normalize";
import {
  BLOCK_PREFIX,
  MAX_GROUP_ROWS,
  type ColumnRole,
  type ColumnSpec,
  type DedupeInput,
  type DuplicateGroup,
  type DuplicateLevel,
  type NameRow,
} from "./types";

/**
 * 複数列で突合するときの区切り（U+0001）。
 *
 * ⚠ 生の NUL バイト・生の制御文字をソースに書かない（共通仕様 §7-3。git がバイナリ扱いする）。
 *   ここではコードポイントから組み立てて、ソースを ASCII のまま保つ。
 */
const KEY_SEPARATOR = String.fromCharCode(0x01);

/** 人が読む値の区切り（画面と書き出しに出る） */
const VALUE_SEPARATOR = " / ";

/**
 * 比較キーの4番「記号・括弧・中黒を落とす」で落とす文字。
 *
 * ⚠ 々（U+3005）と 〇（U+3007）は**落とさない**。
 *    「佐々木」→「佐木」になると、別姓と同じキーになってしまう。
 * ⚠ 半角の濁点・半濁点（U+FF9E / U+FF9F）も落とさない。7番の合成に使うため。
 */
const KEY_SYMBOL_RE = new RegExp(
  "[" +
    "\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E" + // ASCII の記号
    "\\u00B7\\u2010-\\u2027\\u2030-\\u205E\\u2212" + // 中点・ダッシュ・引用符・…
    "\\u3001-\\u3004\\u3006\\u3008-\\u3020\\u3030\\u303D\\u303F" + // 、。〈〉「」【】〒 など
    "\\u30FB\\uFE63" + // ・（全角中黒）／小さいハイフン
    "\\uFF01-\\uFF0F\\uFF1A-\\uFF20\\uFF3B-\\uFF40\\uFF5B-\\uFF65" + // 全角記号・｡｢｣､･
    "]",
  "g",
);

/**
 * 比較キーの10番「長音・ハイフン類をすべて落とす」。
 * 「ミナトデザイン」「ミナト・デザイン」「ミナトーデザイン」を同じキーにするため。
 */
const KEY_PROLONG_RE = new RegExp(
  "[\\u002D\\u2010-\\u2015\\u2043\\u2212\\u30FC\\uFE63\\uFF0D\\uFF70]",
  "g",
);

/** 空白（半角・全角・タブ・改行） */
const KEY_SPACE_RE = new RegExp("[\\s\\u3000]+", "g");

/* ------------------------------------------------------------------ *
 * 比較キー
 * ------------------------------------------------------------------ */

/**
 * 比較キーを作る（計画書 §9-2 の10手順を、その順に）。
 *
 * OpenRefine の fingerprint は「空白で語を切る」ことが前提で、日本語には空白の語境界が
 * 無いのでそのままでは効かない。だから日本語向けに組み直したものがこれ。
 *
 *   1. クレンジング後の値から始める（呼び出し側が全規則 ON の結果を渡す）
 *   2. NFC で合成する
 *   3. すべての空白を落とす
 *   4. 記号・括弧・中黒を落とす
 *   5. 英字を小文字にする
 *   6. ひらがなをカタカナに寄せる
 *   7. 半角カナを全角カナに寄せる
 *   8. 異体字を正字へ寄せる      ← ★ここが肝
 *   9. 法人格語を落とす
 *  10. 長音・ハイフン類をすべて落とす
 *
 * ★ 8番は「危険だから直さない」変換（異体字）を、**比較のためだけに**使う。
 *   こうすると「髙橋一郎」と「高橋一郎」が**候補として並ぶが、値は書き換わらない**。
 * ★ 9番があるので「株式会社ミナト」と「ミナト株式会社」が同じキーになる。
 *   前株・後株の違いは**検出はするが値は直さない**（商号を変えることになるため。§8-5）。
 */
export function comparisonKey(value: string): string {
  if (value === "") return "";
  let s = value.normalize("NFC"); // 2
  s = s.replace(KEY_SPACE_RE, ""); // 3
  s = s.replace(KEY_SYMBOL_RE, ""); // 4
  // 5（英字を小文字にする）
  // ⚠ 先に全角英数を半角へ寄せる。toLowerCase() は "Ａ"→"ａ" と全角のまま小さくするので、
  //    これが無いと "ＡＢＣ商事" と "ABC商事" が別キーになる。
  //    fullyCleaned は R07（全角英数→半角）を通っているので通常は影響しないが、
  //    R07 の対象外である code 役割の列を突合に選んだときに、ここだけでキーが割れる。
  s = fullWidthAlnumToHalf(s);
  s = s.toLowerCase();
  s = hiraganaToKatakana(s); // 6
  s = halfWidthKanaToFull(s); // 7
  s = variantToStandard(s); // 8
  s = stripCorporateForm(s); // 9
  s = s.replace(KEY_PROLONG_RE, ""); // 10
  return s;
}

/* ------------------------------------------------------------------ *
 * 編集距離
 * ------------------------------------------------------------------ */

/**
 * 打ち切り付きレーベンシュタイン距離（2行DP・バンド付き）。
 *
 * ⚠ 引数は**コードポイントの配列**（`Array.from(s)`）。
 *   UTF-16 のコードユニットで測るとサロゲートペア（𠮷 など）が2文字に数えられる。
 *
 * - 長さの差が max を超えるペアは計算せずに捨てる
 *   （編集距離は必ず長さの差以上になるので、数学的に安全な枝刈り）
 * - 各行の最小値が max を超えたら即打ち切り、**-1 を返す**
 *
 * @returns 距離（0〜max）。max を超える／打ち切った場合は -1
 */
export function levenshteinWithin(a: string[], b: string[], max: number): number {
  const n = a.length;
  const m = b.length;
  if (max < 0) return -1;
  if (Math.abs(n - m) > max) return -1;
  if (n === 0) return m <= max ? m : -1;
  if (m === 0) return n <= max ? n : -1;

  const INF = max + 1;
  let prev = new Array<number>(m + 2);
  let cur = new Array<number>(m + 2);

  for (let j = 0; j <= m; j++) prev[j] = j <= max ? j : INF;
  prev[m + 1] = INF;

  for (let i = 1; i <= n; i++) {
    const lo = Math.max(1, i - max);
    const hi = Math.min(m, i + max);

    cur[0] = i <= max ? i : INF;
    if (lo > 1) cur[lo - 1] = INF; // バンドの左外側
    let rowMin = cur[0];

    for (let j = lo; j <= hi; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = prev[j - 1] + cost;
      const del = prev[j] + 1;
      if (del < v) v = del;
      const ins = cur[j - 1] + 1;
      if (ins < v) v = ins;
      if (v > INF) v = INF;
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }

    cur[hi + 1] = INF; // バンドの右外側（次の行が prev[j] として読む）

    if (rowMin > max) return -1;

    const swap = prev;
    prev = cur;
    cur = swap;
  }

  const d = prev[m];
  return d > max ? -1 : d;
}

/* ------------------------------------------------------------------ *
 * 突合に使う列
 * ------------------------------------------------------------------ */

/** `keyRoles` の順に、その役割を持つ列の位置（rows.cells の添字）を返す */
function keyPositions(columns: readonly ColumnSpec[], roles: readonly ColumnRole[]): number[] {
  const out: number[] = [];
  for (const role of roles) {
    if (role === "skip") continue;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].role === role && !out.includes(c)) out.push(c);
    }
  }
  return out;
}

/**
 * 突合に使う列（画面と `runCleanup` のメッセージ用）。
 * ⚠ 契約に無い追加の export だが、既存の署名は一切変えていない。
 */
export function keyColumnsFor(
  columns: readonly ColumnSpec[],
  roles: readonly ColumnRole[],
): ColumnSpec[] {
  return keyPositions(columns, roles).map((c) => columns[c]);
}

/* ------------------------------------------------------------------ *
 * 重複検出
 * ------------------------------------------------------------------ */

interface Stage {
  level: DuplicateLevel;
  /** 行ごとのキー（空文字＝突合しない） */
  keys: string[];
  /** 判定に使った列の位置 */
  positions: number[];
}

interface Edge {
  a: number;
  b: number;
  similarity: number;
  distance: number;
}

function joinRaw(row: NameRow | undefined, positions: readonly number[]): string {
  if (!row) return "";
  return positions.map((c) => row.cells[c] ?? "").join(KEY_SEPARATOR);
}

function joinKey(row: NameRow | undefined, positions: readonly number[]): string {
  if (!row) return "";
  const parts = positions.map((c) => comparisonKey(row.cells[c] ?? ""));
  return parts.every((p) => p === "") ? "" : parts.join(KEY_SEPARATOR);
}

/** 人が読める突合値（比較キーではなく**元の値**） */
function readableValue(row: NameRow | undefined, positions: readonly number[]): string {
  if (!row) return "";
  return positions
    .map((c) => row.cells[c] ?? "")
    .filter((v) => v !== "")
    .join(VALUE_SEPARATOR);
}

/** グループの記号 A / B / … / Z / AA / AB … */
function markFor(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/**
 * 重複の候補を探す。
 *
 * ⚠ `exact` は **original**（クレンジング前）で判定する。
 * ⚠ 比較キーは **fullyCleaned**（全規則 ON の結果）から作る。
 *    規則の ON/OFF で重複の判定が揺れると、利用者が理由を説明できなくなるため（§9-2 の1番）。
 */
export function findDuplicates(input: DedupeInput): DuplicateGroup[] {
  const { original, fullyCleaned, columns, options } = input;
  if (!options.enabled) return [];

  const n = original.length;
  if (n < 2) return [];

  const keyPos = keyPositions(columns, options.keyRoles);
  const kanaPos = keyPositions(columns, ["kana"]);
  if (keyPos.length === 0 && kanaPos.length === 0) return [];

  /** すでにどれかのグループに入った行（上の段階が勝つ） */
  const assigned = new Uint8Array(n);
  const groups: DuplicateGroup[] = [];

  const headersOf = (positions: readonly number[]): string[] =>
    positions.map((c) => columns[c].header);

  /* --- Map で O(n) に決まる3段階 -------------------------------------- */

  const stages: Stage[] = [];

  if (keyPos.length > 0) {
    // exact … クレンジング前の文字列そのまま
    const rawKeys = original.map((row) => {
      const raw = joinRaw(row, keyPos);
      // 空白しか無い組は突合しない（空行がまとめて1つの巨大グループになるのを防ぐ）
      const bare = raw.split(KEY_SEPARATOR).join("").replace(KEY_SPACE_RE, "");
      return bare === "" ? "" : raw;
    });
    stages.push({ level: "exact", keys: rawKeys, positions: keyPos });

    // normalized … 比較キー
    stages.push({
      level: "normalized",
      keys: original.map((_, r) => joinKey(fullyCleaned[r], keyPos)),
      positions: keyPos,
    });
  }

  if (kanaPos.length > 0) {
    // kana … フリガナ列の比較キー
    stages.push({
      level: "kana",
      keys: original.map((_, r) => joinKey(fullyCleaned[r], kanaPos)),
      positions: kanaPos,
    });
  }

  for (const stage of stages) {
    const buckets = new Map<string, number[]>();
    for (let r = 0; r < n; r++) {
      if (assigned[r]) continue;
      const key = stage.keys[r];
      if (key === "") continue;
      const list = buckets.get(key);
      if (list) list.push(r);
      else buckets.set(key, [r]);
    }
    for (const [key, rowsIdx] of buckets) {
      if (rowsIdx.length < 2) continue;
      // 上限を超えた分は打ち切る（キーの選び方が悪いサイン。message は runCleanup が出す）
      for (const r of rowsIdx) assigned[r] = 1;
      const kept = rowsIdx.slice(0, MAX_GROUP_ROWS);
      groups.push({
        mark: "",
        level: stage.level,
        key,
        rows: kept.map((r) => r + 1),
        sourceLines: kept.map((r) => original[r].sourceLine),
        columns: headersOf(stage.positions),
        values: kept.map((r) => readableValue(original[r], stage.positions)),
      });
    }
  }

  /* --- near（編集距離による近似一致）----------------------------------- */

  if (options.useNear && keyPos.length > 0) {
    const keys = original.map((_, r) => joinKey(fullyCleaned[r], keyPos));
    const points: (string[] | null)[] = new Array(n).fill(null);
    const blocks = new Map<string, number[]>();

    for (let r = 0; r < n; r++) {
      if (assigned[r]) continue;
      const key = keys[r];
      if (key === "") continue;
      const cp = Array.from(key);
      // 短いキーには near をかけない（「田中」と「山中」は距離1・類似度0.5だが別人）
      if (cp.length < options.minKeyLength) continue;
      points[r] = cp;
      // ブロッキング：先頭 BLOCK_PREFIX 文字が一致する組だけを比較する
      const prefix = cp.slice(0, BLOCK_PREFIX).join("");
      const list = blocks.get(prefix);
      if (list) list.push(r);
      else blocks.set(prefix, [r]);
    }

    const edges: Edge[] = [];

    for (const list of blocks.values()) {
      if (list.length < 2) continue;
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const ra = list[i];
          const rb = list[j];
          const a = points[ra];
          const b = points[rb];
          if (!a || !b) continue;
          const dist = levenshteinWithin(a, b, options.maxDistance);
          if (dist < 0) continue;
          const longest = Math.max(a.length, b.length);
          const sim = longest === 0 ? 1 : 1 - dist / longest;
          // ★ minSimilarity と maxDistance の**両方**を満たしたときだけ near にする。
          //   長い文字列は割合で、短い文字列は絶対数で守られる。この二重条件が設計の芯。
          if (sim < options.minSimilarity) continue;
          edges.push({ a: ra, b: rb, similarity: sim, distance: dist });
        }
      }
    }

    for (const g of nearGroups(edges, original, keys, keyPos, headersOf, assigned)) {
      groups.push(g);
    }
  }

  /* --- 表示順と記号 ----------------------------------------------------- */

  // 先頭行が若い順に並べる（画面の並びと合わせる）
  groups.sort((a, b) => a.rows[0] - b.rows[0]);
  groups.forEach((g, i) => {
    g.mark = markFor(i);
  });

  return groups;
}

/**
 * near のペアを**連結成分**でグループにする。
 *
 * ⚠ A≈B、B≈C でも **A と C は似ていない可能性がある**。
 *   だから「実際に似ていた組」を `pairs` として残し、画面で見せる。
 */
function nearGroups(
  edges: readonly Edge[],
  original: readonly NameRow[],
  keys: readonly string[],
  keyPos: readonly number[],
  headersOf: (positions: readonly number[]) => string[],
  assigned: Uint8Array,
): DuplicateGroup[] {
  if (edges.length === 0) return [];

  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let root = x;
    let up = parent.get(root);
    while (up !== undefined && up !== root) {
      root = up;
      up = parent.get(root);
    }
    let cur = x;
    let next = parent.get(cur);
    while (next !== undefined && next !== cur) {
      parent.set(cur, root);
      cur = next;
      next = parent.get(cur);
    }
    return root;
  };

  for (const e of edges) {
    if (!parent.has(e.a)) parent.set(e.a, e.a);
    if (!parent.has(e.b)) parent.set(e.b, e.b);
    const ra = find(e.a);
    const rb = find(e.b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const members = [...parent.keys()].sort((x, y) => x - y);
  const components = new Map<number, number[]>();
  const roots: number[] = [];
  for (const r of members) {
    const root = find(r);
    const list = components.get(root);
    if (list) list.push(r);
    else {
      components.set(root, [r]);
      roots.push(root);
    }
  }

  const out: DuplicateGroup[] = [];
  for (const root of roots) {
    const rowsIdx = components.get(root);
    if (!rowsIdx || rowsIdx.length < 2) continue;
    for (const r of rowsIdx) assigned[r] = 1;
    const kept = rowsIdx.slice(0, MAX_GROUP_ROWS);
    const keptSet = new Set(kept);
    const pairs = edges
      .filter((e) => keptSet.has(e.a) && keptSet.has(e.b))
      .map((e) => ({ a: e.a + 1, b: e.b + 1, similarity: e.similarity, distance: e.distance }));
    out.push({
      mark: "",
      level: "near",
      // near は行ごとにキーが違う。代表として先頭行のキーを出す
      key: keys[kept[0]],
      rows: kept.map((r) => r + 1),
      sourceLines: kept.map((r) => original[r].sourceLine),
      columns: headersOf(keyPos),
      values: kept.map((r) => readableValue(original[r], keyPos)),
      similarity: pairs.reduce((min, p) => Math.min(min, p.similarity), 1),
      distance: pairs.reduce((max, p) => Math.max(max, p.distance), 0),
      pairs,
    });
  }
  return out;
}
