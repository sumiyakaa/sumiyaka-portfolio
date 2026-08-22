/**
 * 名簿クレンジングツール（T-05） — 診断
 *
 * ⚠ この層は一切ネットワークへ出ない（共通仕様 §3-1）。fetch / "use server" を書かない。
 *
 * ── 実装の芯（計画書 §7-1）──────────────────────────────────
 * **診断のために別のロジックを書かない。**
 * 「すべての列 × すべての行に、その役割に効く規則を `applyRulesTo` で試し打ちして、
 *   変わったら数える」という1本の走査だけで `Finding` を作る。
 * こうすると診断と修正が**原理的に**食い違わない
 * （「12件あります」と言ったのに11件しか直らない、が起きない）。
 * 実際に食い違っていないことは ._check-c.mts で機械的に確認する。
 * ────────────────────────────────────────────────────
 *
 * ⚠ 診断は **全規則を ON にした仮定**（ALL_ON）で計算する。
 *    画面の件数バッジは「この規則を入れると◯セル変わります」の意味であり、
 *    規則を OFF にしても件数は消えない（消すと、直っていないのに直った気になる）。
 *
 * ⚠ `findings` は **18規則すべて**を返す（該当0件の規則も cells: 0 で含める）。
 *    画面は18規則を常時並べるため。
 *
 * ⚠ `role: "skip"` の列は走査しない（診断もしない＝一切触らない）。
 *    ただし `duplicateHeader` だけは見出し行そのものの話なので全列を見る。
 */

import { trimBoth } from "./normalize";
import { ALL_ON, RULES, applyRulesTo } from "./rules";
import {
  SAMPLE_LIMIT,
  type ColumnSpec,
  type Finding,
  type Notice,
  type ParseResult,
  type RuleId,
  type RuleOptions,
} from "./types";

/* ------------------------------------------------------------------ *
 * 定数
 * ------------------------------------------------------------------ */

/**
 * 47都道府県。`addressPrefectureMixed` の判定にだけ使う。
 *
 * ⚠ これは郵便番号マスタのような外部データではなく、固定の47語なので定数として持ってよい。
 * ⚠ **補完はしない。** 混在していることを知らせるだけ（計画書 §7-3・§8-5）。
 */
const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;

/** ハイフン類（U+2010–2015 / U+2043 / U+2212 / U+FE63 / U+FF0D と半角ハイフン） */
const HYPHEN_CLASS = "\\u002D\\u2010-\\u2015\\u2043\\u2212\\uFE63\\uFF0D";

/** 「三丁目八番三十八号」式（漢数字が 丁目 / 番地 / 番 / 号 の直前にある） */
const CHOME_KANJI_RE = /[一二三四五六七八九十百千]\s*(?:丁目|番地|番|号)/;

/** 「3-8-38」式（算用数字がハイフン類で連結されている。全角数字も見る） */
const CHOME_ARABIC_RE = new RegExp(`[0-9\\uFF10-\\uFF19]\\s*[${HYPHEN_CLASS}]\\s*[0-9\\uFF10-\\uFF19]`);

/** 全角の英数字（U+FF10–19 / U+FF21–3A / U+FF41–5A） */
const FULL_ALNUM_RE = /[０-９Ａ-Ｚａ-ｚ]/;

/** 半角の英数字 */
const HALF_ALNUM_RE = /[0-9A-Za-z]/;

/* ------------------------------------------------------------------ *
 * 内部の集計器
 * ------------------------------------------------------------------ */

interface FindingAcc {
  cells: number;
  rows: Set<number>;
  columns: string[];
  columnSeen: Set<string>;
  samples: Finding["samples"];
}

interface NoticeAcc {
  rows: Set<number>;
  columns: string[];
  columnSeen: Set<string>;
  samples: string[];
}

function newNoticeAcc(): NoticeAcc {
  return { rows: new Set(), columns: [], columnSeen: new Set(), samples: [] };
}

function addColumn(acc: { columns: string[]; columnSeen: Set<string> }, header: string): void {
  if (acc.columnSeen.has(header)) return;
  acc.columnSeen.add(header);
  acc.columns.push(header);
}

function addSample(list: string[], value: string): void {
  if (list.length < SAMPLE_LIMIT) list.push(value);
}

/** 見出しを「」で並べる（最大3つ。それ以上は「ほか」） */
function quoteHeaders(headers: readonly string[]): string {
  const shown = headers.slice(0, SAMPLE_LIMIT).map((h) => `「${h}」`).join("");
  return headers.length > SAMPLE_LIMIT ? `${shown}ほか` : shown;
}

/** 値が「空欄」か（未入力・半角空白だけ・全角空白だけ を同じ扱いにする） */
function isBlank(value: string): boolean {
  return trimBoth(value) === "";
}

/* ------------------------------------------------------------------ *
 * 診断
 * ------------------------------------------------------------------ */

/**
 * 名簿を診断する。
 *
 * @param parsed   読み取り結果（**原文のまま**の行）
 * @param columns  列の役割（利用者がプルダウンで変えた後の状態を渡す）
 * @param options  規則の向き（波ダッシュの寄せ先など）
 * @returns findings＝18規則すべて（RULES の並び順）／notices＝該当したものだけ
 */
export function diagnose(
  parsed: ParseResult,
  columns: readonly ColumnSpec[],
  options?: RuleOptions,
): { findings: Finding[]; notices: Notice[] } {
  const rows = parsed.rows;

  /* --- 規則の試し打ち（1本の走査で Finding を作る）------------------ */

  const acc = new Map<RuleId, FindingAcc>();
  for (const rule of RULES) {
    acc.set(rule.id, { cells: 0, rows: new Set(), columns: [], columnSeen: new Set(), samples: [] });
  }

  for (let c = 0; c < columns.length; c++) {
    const spec = columns[c];
    // 役割が決まらない列は一切触らない（計画書 §15-7）
    if (spec.role === "skip") continue;

    for (let r = 0; r < rows.length; r++) {
      const before = rows[r].cells[c];
      // 空文字はどの規則でも変わらない（規則の契約1）ので走査を省く
      if (typeof before !== "string" || before === "") continue;

      const app = applyRulesTo(before, spec.role, ALL_ON, options);
      if (app.hits.length === 0) continue;

      for (const hit of app.hits) {
        const a = acc.get(hit.ruleId);
        if (!a) continue;
        a.cells += 1;
        a.rows.add(r);
        addColumn(a, spec.header);
        if (a.samples.length < SAMPLE_LIMIT) {
          a.samples.push({
            header: spec.header,
            sourceLine: rows[r].sourceLine,
            before: hit.before,
            after: hit.after,
          });
        }
      }
    }
  }

  const findings: Finding[] = RULES.map((rule) => {
    const a = acc.get(rule.id);
    if (!a) return { ruleId: rule.id, cells: 0, rows: 0, columns: [], samples: [] };
    return {
      ruleId: rule.id,
      cells: a.cells,
      rows: a.rows.size,
      columns: a.columns,
      samples: a.samples,
    };
  });

  return { findings, notices: buildNotices(parsed, columns) };
}

/* ------------------------------------------------------------------ *
 * Notice（直さずに知らせるだけ・計画書 §7-3）
 *
 * ⚠ **これがこのツールの誠実さの担保。**
 *    直せないもの・直すべきでないものを、黙って見なかったことにしない。
 * ------------------------------------------------------------------ */

function buildNotices(parsed: ParseResult, columns: readonly ColumnSpec[]): Notice[] {
  const rows = parsed.rows;
  const notices: Notice[] = [];

  /* --- 1. 住所の丁目表記の混在 -------------------------------------- */

  const chomeKanji = newNoticeAcc();
  const chomeArabic = newNoticeAcc();

  /* --- 2. 都道府県の有無の混在 -------------------------------------- */

  const prefYes = newNoticeAcc();
  const prefNo = newNoticeAcc();

  /* --- 3. 元 Excel で数値として保存されていた列 ---------------------- */

  const numeric = newNoticeAcc();

  /* --- 5. 空欄 ------------------------------------------------------ */

  const empty = newNoticeAcc();
  const emptyPerColumn = new Map<string, number>();
  let emptyCells = 0;

  /* --- 6. 1列の中の全角／半角の混在 --------------------------------- */

  const widthMixed = newNoticeAcc();

  for (let c = 0; c < columns.length; c++) {
    const spec = columns[c];
    // skip 列は診断の対象外（見出しの重複だけは後で全列を見る）
    if (spec.role === "skip") continue;

    const widthFullRows: number[] = [];
    const widthHalfRows: number[] = [];
    let blankInColumn = 0;

    for (let r = 0; r < rows.length; r++) {
      const raw = rows[r].cells[c];

      // 空欄（未入力・空白だけ）
      if (typeof raw !== "string" || isBlank(raw)) {
        blankInColumn += 1;
        emptyCells += 1;
        empty.rows.add(r);
        addColumn(empty, spec.header);
        continue;
      }

      const value = raw;

      // 全角／半角の混在（英数字だけを見る。カナの幅は halfWidthKana 規則の担当）
      if (FULL_ALNUM_RE.test(value)) widthFullRows.push(r);
      else if (HALF_ALNUM_RE.test(value)) widthHalfRows.push(r);

      // 元 Excel で数値保存だったセル（郵便番号・電話番号・型番のみ知らせる）
      if (
        (spec.role === "zip" || spec.role === "tel" || spec.role === "code") &&
        parsed.numericCells.has(`${r},${c}`)
      ) {
        numeric.rows.add(r);
        addColumn(numeric, spec.header);
        addSample(numeric.samples, `${spec.header}: ${value}`);
      }

      if (spec.role !== "address") continue;

      // 丁目表記
      if (CHOME_KANJI_RE.test(value)) {
        chomeKanji.rows.add(r);
        addColumn(chomeKanji, spec.header);
        addSample(chomeKanji.samples, value);
      } else if (CHOME_ARABIC_RE.test(value)) {
        chomeArabic.rows.add(r);
        addColumn(chomeArabic, spec.header);
        addSample(chomeArabic.samples, value);
      }

      // 都道府県から始まるか
      const head = trimBoth(value);
      const prefAcc = PREFECTURES.some((p) => head.startsWith(p)) ? prefYes : prefNo;
      prefAcc.rows.add(r);
      addColumn(prefAcc, spec.header);
      addSample(prefAcc.samples, value);
    }

    if (blankInColumn > 0) emptyPerColumn.set(spec.header, blankInColumn);

    // 同じ列の中に全角英数の行と半角英数の行が両方あるときだけ「混在」
    if (widthFullRows.length > 0 && widthHalfRows.length > 0) {
      addColumn(widthMixed, spec.header);
      for (const r of widthFullRows) widthMixed.rows.add(r);
      for (const r of widthHalfRows) widthMixed.rows.add(r);
      for (const r of widthFullRows) addSample(widthMixed.samples, `${spec.header}: ${rows[r].cells[c]}`);
    }
  }

  /* --- 組み立て ------------------------------------------------------ */

  // 1. 丁目表記の混在（両方の式が同じ列にあるときだけ）
  if (chomeKanji.rows.size > 0 && chomeArabic.rows.size > 0) {
    notices.push({
      id: "addressChomeMixed",
      label:
        `住所の列に「三丁目八番三十八号」式（${chomeKanji.rows.size}行）と` +
        `「3-8-38」式（${chomeArabic.rows.size}行）が混在しています。` +
        `どちらへ寄せても元へ戻せないため、このツールでは直しません。`,
      // 「該当した行数」＝どちらかの式で書かれている行の実数
      rows: chomeKanji.rows.size + chomeArabic.rows.size,
      columns: mergeColumns(chomeKanji, chomeArabic),
      samples: chomeKanji.samples.slice(0, SAMPLE_LIMIT),
    });
  }

  // 2. 都道府県の有無の混在
  if (prefYes.rows.size > 0 && prefNo.rows.size > 0) {
    const minority = prefYes.rows.size <= prefNo.rows.size ? prefYes : prefNo;
    notices.push({
      id: "addressPrefectureMixed",
      label:
        `住所の列に、都道府県から始まる行（${prefYes.rows.size}行）と、` +
        `そうでない行（${prefNo.rows.size}行）が混在しています。` +
        `都道府県の補完には外部の住所データが要るため、このツールでは行いません。`,
      rows: prefYes.rows.size + prefNo.rows.size,
      columns: mergeColumns(prefYes, prefNo),
      samples: minority.samples.slice(0, SAMPLE_LIMIT),
    });
  }

  // 3. 数値として保存されていた列
  if (numeric.rows.size > 0) {
    notices.push({
      id: "numericStoredCode",
      label:
        `${quoteHeaders(numeric.columns)}の列が、元の Excel で数値として保存されています` +
        `（${numeric.rows.size}行）。先頭の 0 は読み込む前に失われており、復元できません。`,
      rows: numeric.rows.size,
      columns: numeric.columns,
      samples: numeric.samples,
    });
  }

  // 4. 見出しの重複（見出し行そのものの話なので skip 列も見る）
  const headerCount = new Map<string, number>();
  for (const spec of columns) {
    const h = spec.header;
    if (trimBoth(h) === "") continue;
    headerCount.set(h, (headerCount.get(h) ?? 0) + 1);
  }
  const duplicated: string[] = [];
  for (const [header, count] of headerCount) if (count >= 2) duplicated.push(header);
  if (duplicated.length > 0) {
    notices.push({
      id: "duplicateHeader",
      label:
        `同じ見出しの列があります（${duplicated
          .slice(0, SAMPLE_LIMIT)
          .map((h) => `「${h}」×${headerCount.get(h)}`)
          .join("・")}${duplicated.length > SAMPLE_LIMIT ? "ほか" : ""}）。` +
        `意図した並びであればそのままで構いません。`,
      // 列の話であって行の話ではないので 0
      rows: 0,
      columns: duplicated,
      samples: duplicated.slice(0, SAMPLE_LIMIT),
    });
  }

  // 5. 空欄
  if (emptyCells > 0) {
    const detail = [...emptyPerColumn.entries()]
      .slice(0, SAMPLE_LIMIT)
      .map(([header, n]) => `${header} ${n}セル`)
      .join(" / ");
    notices.push({
      id: "emptyCells",
      label:
        `${emptyPerColumn.size}列に空欄が${emptyCells}セルあります（${detail}` +
        `${emptyPerColumn.size > SAMPLE_LIMIT ? " ほか" : ""}）。推測での補完は行いません。`,
      rows: empty.rows.size,
      columns: empty.columns,
      samples: [...emptyPerColumn.entries()].slice(0, SAMPLE_LIMIT).map(([h, n]) => `${h}: ${n}セル`),
    });
  }

  // 6. 1列の中の全角／半角の混在
  if (widthMixed.columns.length > 0) {
    notices.push({
      id: "widthMixedInColumn",
      label:
        `1つの列の中で全角英数と半角英数が混在しています` +
        `（${widthMixed.columns.length}列・${widthMixed.rows.size}行）。` +
        `規則を OFF にすると、この状態がそのまま残ります。`,
      rows: widthMixed.rows.size,
      columns: widthMixed.columns,
      samples: widthMixed.samples,
    });
  }

  return notices;
}

function mergeColumns(a: NoticeAcc, b: NoticeAcc): string[] {
  const out = [...a.columns];
  for (const h of b.columns) if (!out.includes(h)) out.push(h);
  return out;
}
