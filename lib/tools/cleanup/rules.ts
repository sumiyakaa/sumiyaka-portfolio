/**
 * 名簿クレンジングツール（T-05） — 18の修正規則
 *
 * ⚠ **`RULES` 配列の並び順が適用順であり、順序に意味がある。並べ替えない**（計画書 §8-3）。
 *    1. R01–R04 を先に。不可視文字と分解濁点が残っていると、以降の判定がすり抜ける
 *    2. R05（半角カナ→全角）を R07（全角英数→半角）より前に。中間状態を作らない
 *    3. R04 は「全角空白も空白として数える」ので R06 の前に置いても結果が変わらない
 *    4. R09（ハイフン統一）→ R10（長音）の順。R10 の判定が1種類で済む
 *    5. R08（法人格）は R07 の後。ただし R08 は全角括弧版も直接持つ（R07 が OFF でも効く）
 *
 * ⚠ **内訳＝ safe 6 / caution 9 / danger 3。既定 ON 12 / 既定 OFF 6。**
 *    数が合わなくなったらどこかが間違っている（`._check-a.mts` で毎回数える）。
 *
 * ⚠ **危険度を実装中に下げない**（計画書 §15-8）。壊れにくいと感じたら `roles` を狭めて解決する。
 *
 * ⚠ **`_shared/sheetReader` を import しない。** UI がこのファイルを静的 import するので、
 *    import すると `fflate` が初期バンドルへ落ちてくる（共通仕様 §8-5）。
 *
 * ⚠ 各規則の `apply` の契約（`types.ts`）：
 *    1. 変化しないときは受け取った文字列をそのまま返す
 *    2. 冪等（`apply(apply(x)) === apply(x)`）
 *    3. `options` を省略したら `DEFAULT_RULE_OPTIONS` と同じ挙動
 */

import {
  circledToPlain,
  collapseSpaces,
  fullWidthAlnumToHalf,
  halfWidthKanaToFull,
  hiraganaToKatakana,
  kanjiNumeralInAddress,
  openCorporateForm,
  prolongedAfterKana,
  stripControlChars,
  trimBoth,
  unifyBrackets,
  unifyHyphens,
  variantToStandard,
} from "./normalize";
import {
  DEFAULT_RULE_OPTIONS,
  type CleanupRule,
  type ColumnRole,
  type RuleApplication,
  type RuleHit,
  type RuleId,
  type RuleOptions,
  type RuleSwitches,
} from "./types";

/* ------------------------------------------------------------------ *
 * 対象の役割
 * ------------------------------------------------------------------ */

/**
 * 「すべて」＝ `skip` 以外のすべての役割。
 * ⚠ `roles` に**空配列を使わない**。対象を必ず列挙する（空配列だと「全部」なのか「無し」なのか読めない）。
 * ⚠ `skip` は**どの規則にも決して入れない**（`skip` は一切触らない列）。
 */
const ALL_ROLES: readonly ColumnRole[] = [
  "companyName",
  "department",
  "personName",
  "kana",
  "zip",
  "address",
  "tel",
  "email",
  "code",
  "free",
];

/** `code`（型番・管理番号）以外のすべて。全角英数を半角に寄せると型番が別物になるため */
const ALL_ROLES_EXCEPT_CODE: readonly ColumnRole[] = ALL_ROLES.filter((role) => role !== "code");

/* ------------------------------------------------------------------ *
 * 規則ごとの変換（原始関数だけで書けないもの）
 * ------------------------------------------------------------------ */

/** R03：分解された濁点を1文字に戻す。**NFC だけ。NFKC は使わない**（計画書 §8-4） */
function composeNfc(value: string): string {
  const composed = value.normalize("NFC");
  return composed === value ? value : composed;
}

/** R06：全角スペース（U+3000）を半角スペースに */
function ideographicSpaceToHalf(value: string): string {
  if (value.indexOf("　") < 0) return value;
  return value.split("　").join(" ");
}

/** R12 が郵便番号から取り除くもの＝〒・郵便記号・空白・ハイフン類 */
const ZIP_NOISE_G = /[〒〠\s　‐-―⁃−﹣－\-]/g;

/**
 * R12：郵便番号を `NNN-NNNN` に。
 *
 * ⚠ **数字7桁でなければ何もしない**（`"10000"` はそのまま）。桁数を推測して埋めない。
 * ⚠ 全角数字も自分で半角へ寄せる。R07 が OFF のときにも `〒１０００００１` を扱えるようにするため。
 * ⚠ 冪等：`"100-0001"` → 記号を落とすと7桁 → `"100-0001"`。**末尾にハイフンを足さない**。
 */
function formatZip(value: string): string {
  if (value === "") return value;
  const digits = fullWidthAlnumToHalf(value.replace(ZIP_NOISE_G, ""));
  if (!/^[0-9]{7}$/.test(digits)) return value;
  const formatted = digits.slice(0, 3) + "-" + digits.slice(3);
  return formatted === value ? value : formatted;
}

/**
 * 先頭の `(03)` `（03）` を `03-` にする。市外局番の区切り位置は推測しない。
 * 閉じ括弧の直後に続くハイフン・空白は、二重の区切りにならないよう吸収する。
 */
const TEL_PAREN_AREA = /^[(（]([0-9]{1,5})[)）][\s-]*(.+)$/;

/**
 * R13：電話番号の括弧をハイフンに。
 *
 * ⚠ **区切りの無い `"0312345678"` は触らない**（どこで切るかを推測しない）。
 * ⚠ 全角数字は扱わない。R07（既定 ON・`tel` も対象）が先に半角へ寄せている前提で、
 *    R07 が OFF のときは**何もしない**（＝迷ったら直さない／計画書 §15-1）。
 * ⚠ 冪等：変換後は先頭が括弧でなくなるので2回目は一致しない。
 */
function formatTel(value: string): string {
  const matched = TEL_PAREN_AREA.exec(value);
  if (matched === null) return value;
  const formatted = matched[1] + "-" + matched[2];
  return formatted === value ? value : formatted;
}

/** 波ダッシュ U+301C */
const WAVE_DASH = "〜";
/** 全角チルダ U+FF5E */
const FULLWIDTH_TILDE = "～";

/**
 * R15：波ダッシュと全角チルダを揃える。**向きは `options.waveDashTo` で外から選ぶ**。
 *
 * ⚠ 規則を2本に割ると18規則の内訳が崩れるので、**規則は1本のまま向きだけを外から与える**。
 * ⚠ `options` を省略したら `DEFAULT_RULE_OPTIONS`（＝ U+301C を U+FF5E へ寄せる）と同じ挙動。
 */
function unifyWaveDash(value: string, options?: RuleOptions): string {
  const to = (options ?? DEFAULT_RULE_OPTIONS).waveDashTo;
  const from = to === FULLWIDTH_TILDE ? WAVE_DASH : FULLWIDTH_TILDE;
  if (value.indexOf(from) < 0) return value;
  return value.split(from).join(to);
}

/* ------------------------------------------------------------------ *
 * 18規則（この並び順が適用順）
 * ------------------------------------------------------------------ */

/**
 * ⚠ `example` の記号：`␣`＝半角スペース ／ `□`＝全角スペース（U+3000） ／ `·`＝ゼロ幅スペース（U+200B）。
 *    実際の空白をそのまま書くと画面で見えないので、可視の代替記号に置き換えてある（§11-3 と同じ作法）。
 */
export const RULES: readonly CleanupRule[] = [
  /* ---- safe（意味が変わらない・既定 ON）---- */
  {
    id: "trim",
    label: "前後の空白を落とす",
    detail: "先頭と末尾の半角スペース・全角スペース・タブを落とします。",
    example: "「□株式会社ミナト␣」 → 「株式会社ミナト」",
    risk: "safe",
    defaultOn: true,
    roles: ALL_ROLES,
    apply: trimBoth,
  },
  {
    id: "controlChars",
    label: "不可視文字を落とす",
    detail:
      "ゼロ幅スペースなど、目に見えないのに別の文字として扱われる文字を落とします（改行しない空白は半角スペースにします）。",
    example: "「山田·太郎」 → 「山田太郎」",
    risk: "safe",
    defaultOn: true,
    roles: ALL_ROLES,
    apply: stripControlChars,
  },
  {
    id: "nfcCompose",
    label: "分解された濁点を1文字に戻す",
    detail:
      "「カ」＋「濁点」の2文字で入っている「ガ」を、1文字の「ガ」に戻します。見た目が同じなのに一致しない原因です。",
    example: "「ガ」（カ＋濁点の2文字） → 「ガ」（1文字）",
    risk: "safe",
    defaultOn: true,
    roles: ALL_ROLES,
    apply: composeNfc,
  },
  {
    id: "collapseSpace",
    label: "連続する空白を1つにまとめる",
    detail: "2つ以上続く空白を、半角スペース1つにまとめます。全角スペースも空白として数えます。",
    example: "「山田␣␣␣太郎」 → 「山田␣太郎」",
    risk: "safe",
    defaultOn: true,
    roles: ALL_ROLES,
    apply: collapseSpaces,
  },
  {
    id: "halfWidthKana",
    label: "半角カナを全角カナに",
    detail: "半角カタカナを全角にします。濁点・半濁点は次の1文字と合わせて1文字にします。",
    example: "「ﾐﾅﾄﾃﾞｻﾞｲﾝ」 → 「ミナトデザイン」",
    risk: "safe",
    defaultOn: true,
    roles: ALL_ROLES,
    apply: halfWidthKanaToFull,
  },
  {
    id: "ideographicSpace",
    label: "全角スペースを半角スペースに",
    detail: "全角スペース（U+3000）を半角スペースにします。",
    example: "「山田□太郎」 → 「山田␣太郎」",
    risk: "safe",
    defaultOn: true,
    roles: ALL_ROLES,
    apply: ideographicSpaceToHalf,
  },

  /* ---- caution（対象の役割を絞ることで安全側に倒している）---- */
  {
    id: "fullWidthAlnum",
    label: "全角英数字・全角記号を半角に",
    detail:
      "全角の英数字と記号を半角にします。型番・管理番号の列は、別の型番に化けるので対象から外してあります。全角チルダ「～」だけは、波ダッシュ「〜」と対で扱うため下の規則にまかせます。",
    example: "「ＡＢＣ商事」 → 「ABC商事」（型番の列は触りません）",
    risk: "caution",
    defaultOn: true,
    roles: ALL_ROLES_EXCEPT_CODE,
    apply: fullWidthAlnumToHalf,
  },
  {
    id: "corporateForm",
    label: "法人格の略記を開く",
    detail:
      "㈱ (株) （株） ㍿ を「株式会社」に、㈲ (有) （有）を「有限会社」にします。前株・後株の位置は変えません。",
    example: "「㈱ミナト」 → 「株式会社ミナト」／「ミナト(株)」 → 「ミナト株式会社」",
    risk: "caution",
    defaultOn: true,
    roles: ["companyName"],
    apply: openCorporateForm,
  },
  {
    id: "hyphenUnify",
    label: "ハイフン類を半角ハイフンに",
    detail:
      "見た目の似たダッシュ・マイナス・全角ハイフンを、半角ハイフンに揃えます。長音記号「ー」は触りません。",
    example: "「03−1234−5678」 → 「03-1234-5678」",
    risk: "caution",
    defaultOn: true,
    roles: ["zip", "tel", "address", "code"],
    apply: unifyHyphens,
  },
  {
    id: "prolongedSound",
    label: "カナの直後のハイフンを長音記号に",
    detail: "カタカナ・ひらがなの直後にあるハイフン類を、長音記号「ー」にします。",
    example: "「デ―タ整備」 → 「データ整備」",
    risk: "caution",
    defaultOn: true,
    roles: ["companyName", "personName", "kana", "department", "free"],
    apply: prolongedAfterKana,
  },
  {
    id: "bracketWidth",
    label: "括弧の全角半角を揃える",
    detail: "全角の丸括弧・角括弧・波括弧を半角にします。",
    example: "「ミナト（東京）」 → 「ミナト(東京)」",
    risk: "caution",
    defaultOn: true,
    roles: ["companyName", "department", "address"],
    apply: unifyBrackets,
  },
  {
    id: "zipFormat",
    label: "郵便番号を 000-0000 の形に",
    detail:
      "〒 を外し、数字がちょうど7桁のときだけハイフンを1つ入れます。7桁でなければ何もしません。",
    example: "「〒１０００００１」 → 「100-0001」（「10000」はそのまま）",
    risk: "caution",
    defaultOn: true,
    roles: ["zip"],
    apply: formatZip,
  },
  {
    id: "telFormat",
    label: "電話番号の括弧をハイフンに",
    detail:
      "先頭の「(03)」のような括弧書きの市外局番をハイフン区切りにします。区切りの無い番号は、どこで切るか推測しないのでそのままです。",
    example: "「(03)1234-5678」 → 「03-1234-5678」（「0312345678」はそのまま）",
    risk: "caution",
    defaultOn: false,
    roles: ["tel"],
    apply: formatTel,
  },
  {
    id: "kanaOnly",
    label: "フリガナ列のひらがなをカタカナに",
    detail: "フリガナの列に混ざったひらがなをカタカナにします。",
    example: "「やまだ␣たろう」 → 「ヤマダ␣タロウ」",
    risk: "caution",
    defaultOn: false,
    roles: ["kana"],
    apply: hiraganaToKatakana,
  },
  {
    id: "waveDash",
    label: "波ダッシュと全角チルダを揃える",
    detail:
      "見た目がほとんど同じ2つの記号（波ダッシュと全角チルダ）を、どちらかに揃えます。向きはこの画面で選べます。",
    example: "「9:00〜18:00」 → 「9:00～18:00」",
    risk: "caution",
    defaultOn: false,
    roles: ["free", "address"],
    apply: unifyWaveDash,
  },

  /* ---- danger（別物に化けうる・必ず既定 OFF・確認文つき）---- */
  {
    id: "circledNumber",
    label: "丸数字・ローマ数字を素の数字に",
    detail: "①〜⑳を 1〜20 に、Ⅰ〜Ⅹを 1〜10 にします。",
    example: "「①号室」 → 「1号室」",
    risk: "danger",
    defaultOn: false,
    roles: ["free", "address"],
    confirm: "丸数字が種別の記号として使われていると、元が丸数字だったことが消えます。",
    apply: circledToPlain,
  },
  {
    id: "variantKanji",
    label: "旧字体・異体字を常用字体に",
    detail:
      "髙→高、﨑→崎 のように、対応表に載っている字だけを常用字体に寄せます。氏名の列は既定で対象外です。",
    example: "「髙﨑␣一郎」 → 「高崎␣一郎」",
    risk: "danger",
    defaultOn: false,
    roles: ["companyName", "address"],
    confirm: "人名の旧字体を直すと、別人として扱っていた行が同じに見えることがあります。",
    apply: variantToStandard,
  },
  {
    id: "kanjiNumeral",
    label: "住所の漢数字を算用数字に",
    detail:
      "丁目・番・番地・号 のすぐ前にある漢数字だけを算用数字にします。それ以外の漢数字は触りません。",
    example: "「銀座三丁目」 → 「銀座3丁目」",
    risk: "danger",
    defaultOn: false,
    roles: ["address"],
    confirm: "「三番町」のような地名の漢数字も「3番町」に変わります。",
    apply: kanjiNumeralInAddress,
  },
];

/* ------------------------------------------------------------------ *
 * 索引・スイッチ
 * ------------------------------------------------------------------ */

const RULE_BY_ID: ReadonlyMap<RuleId, CleanupRule> = new Map(
  RULES.map((rule) => [rule.id, rule] as const),
);

export function ruleById(id: RuleId): CleanupRule {
  const rule = RULE_BY_ID.get(id);
  if (rule === undefined) throw new Error("未知の規則 ID: " + id);
  return rule;
}

function buildSwitches(pick: (rule: CleanupRule) => boolean): RuleSwitches {
  const switches = {} as RuleSwitches;
  for (const rule of RULES) switches[rule.id] = pick(rule);
  return switches;
}

/**
 * ⚠ 次の3つは共有の定数。**書き換えず、必要なら複製して使う**（`{ ...DEFAULT_SWITCHES }`）。
 */
/** 既定の ON/OFF（`defaultOn` から作る）。12本が ON */
export const DEFAULT_SWITCHES: RuleSwitches = buildSwitches((rule) => rule.defaultOn);
/** 全部 ON。診断と、重複判定の比較キーを作るときに使う */
export const ALL_ON: RuleSwitches = buildSwitches(() => true);
/** 全部 OFF。検証に使う */
export const ALL_OFF: RuleSwitches = buildSwitches(() => false);

/* ------------------------------------------------------------------ *
 * 役割ごとの適用
 * ------------------------------------------------------------------ */

/** `skip` 用の空配列（毎回作らないよう使い回す） */
const NO_RULES: readonly CleanupRule[] = [];

const RULES_BY_ROLE: ReadonlyMap<ColumnRole, readonly CleanupRule[]> = new Map(
  ALL_ROLES.map(
    (role) => [role, RULES.filter((rule) => rule.roles.indexOf(role) >= 0)] as const,
  ),
);

/**
 * その役割に効く規則を**適用順のまま**返す。
 * ⚠ `skip` は空配列（一切触らない列）。
 */
export function rulesForRole(role: ColumnRole): readonly CleanupRule[] {
  return RULES_BY_ROLE.get(role) ?? NO_RULES;
}

/**
 * 1つの値に、その役割で ON になっている規則を**適用順に**当てる。
 *
 * ⚠ `role === "skip"` なら**入力をそのまま返し、`hits` は空**。
 * ⚠ `hits` には**実際に値が変わった規則だけ**を、適用順に積む。
 * ⚠ 変化が無ければ `value` は入力と同一（`===` で比較できる）。
 */
export function applyRulesTo(
  value: string,
  role: ColumnRole,
  switches: RuleSwitches,
  options?: RuleOptions,
): RuleApplication {
  if (role === "skip") return { value, hits: [] };
  const hits: RuleHit[] = [];
  let current = value;
  for (const rule of rulesForRole(role)) {
    if (!switches[rule.id]) continue;
    const next = rule.apply(current, options);
    if (next !== current) {
      hits.push({ ruleId: rule.id, before: current, after: next });
      current = next;
    }
  }
  return { value: current, hits };
}
