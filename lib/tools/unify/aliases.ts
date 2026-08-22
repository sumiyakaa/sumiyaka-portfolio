/**
 * 列マッピング統合ツール（T-04） — 見出しの別名辞書
 *
 * 「得意先名」「顧客名」「会社名」がどれも同じものを指す、という業務上の知識をここに置く。
 * オートマッピングの段階2（別名一致・スコア80）がこの辞書だけを見る。
 *
 * ⚠ **静的層**（画面が最初から import する層）。`_shared/sheetReader` から
 *    **値を import しない**こと（先頭で fflate を引いているため、ページを開いただけで
 *    fflate が落ちてくる）。ここが import してよいのは `./key`（依存ゼロ）と
 *    `./types` の型だけ。
 *
 * ⚠ **同じ語を2つの束に入れない。** 入れると `aliasGroupOf()` の答えが
 *    束の並び順に依存し、辞書を並べ替えただけで割当が変わる（＝非決定的になる）。
 *    重複の検査は検証スクリプト側で行う（計画書 §13-2）。
 *
 * ⚠ 「摘要」は品目と備考の両方で使われるが **note（備考）側に置く**。
 *    会計ソフトの「摘要」は説明文であることが多い、という判断（計画書 §7-5）。
 *
 * ⚠ **辞書は資産である。** 特注案件で新しい別名に出会ったらここへ足す。
 *    足したら必ず §13-2 の重複検査を回すこと。
 */

import { unifyKey } from "./key";
import type { ColumnKind } from "./types";

export interface AliasGroup {
  /** 束の名前（画面には出さない・デバッグと重複検査用） */
  id: string;
  /** 正規化前の表記で列挙する。読み込み時に unifyKey を通して Map に載せる */
  words: string[];
  /** この束が指す値の種類 */
  kind: ColumnKind;
}

export const ALIAS_GROUPS: AliasGroup[] = [
  {
    id: "partner",
    kind: "text",
    words: [
      "取引先名", "取引先", "取引先名称", "顧客名", "顧客", "得意先名", "得意先",
      "会社名", "社名", "企業名", "法人名", "屋号", "店舗名", "取引先会社名",
      "請求先", "請求先名", "販売先", "納品先", "仕入先", "支払先", "客先",
      "client", "customer", "company", "account", "vendor", "supplier",
    ],
  },
  {
    id: "personName",
    kind: "text",
    words: [
      "氏名", "名前", "お名前", "姓名", "担当者名", "ご担当者", "ご担当者名",
      "担当者", "申請者", "申請者名", "利用者名", "会員名", "顧客氏名",
      "name", "fullname", "personname",
    ],
  },
  {
    id: "partnerCode",
    kind: "text",
    words: [
      "取引先コード", "取引先ｺｰﾄﾞ", "顧客コード", "得意先コード", "会社コード",
      "顧客番号", "取引先番号", "会員番号", "コード", "customercode", "clientcode", "code",
    ],
  },
  {
    id: "date",
    kind: "date",
    words: [
      "日付", "取引日", "年月日", "売上日", "計上日", "発生日", "使用日",
      "利用日", "購入日", "受注日", "発注日", "納品日", "出荷日", "伝票日付",
      "date", "transactiondate", "orderdate",
    ],
  },
  {
    id: "dueDate",
    kind: "date",
    words: [
      "支払期日", "支払日", "入金日", "入金予定日", "支払予定日", "期日", "振込日",
      "duedate", "paymentdate",
    ],
  },
  {
    id: "amount",
    kind: "number",
    words: [
      "金額", "合計金額", "売上金額", "請求金額", "請求額", "税込金額", "税込",
      "税抜金額", "税抜", "小計", "合計", "総額", "支払金額", "取引金額",
      "amount", "total", "subtotal", "price",
    ],
  },
  {
    id: "unitPrice",
    kind: "number",
    words: [
      "単価", "税抜単価", "税込単価", "販売単価", "仕入単価", "価格", "定価",
      "unitprice", "rate",
    ],
  },
  {
    id: "quantity",
    kind: "number",
    words: [
      "数量", "個数", "数", "本数", "枚数", "点数", "数量計", "出荷数",
      "qty", "quantity", "count",
    ],
  },
  {
    id: "item",
    kind: "text",
    words: [
      "品目", "品名", "商品名", "商品", "製品名", "サービス名", "内容", "取引内容",
      "件名", "明細", "作業内容", "項目", "品目名",
      "item", "itemname", "product", "productname", "description", "subject",
    ],
  },
  {
    id: "slipNo",
    kind: "text",
    words: [
      "伝票番号", "伝票no", "伝票ｎｏ", "注文番号", "受注番号", "発注番号",
      "請求書番号", "管理番号", "整理番号", "no", "id", "番号",
      "orderno", "ordernumber", "invoiceno", "slipno",
    ],
  },
  {
    id: "email",
    kind: "text",
    words: [
      "メールアドレス", "メール", "eメール", "e-mail", "mail", "email",
      "メアド", "連絡先メール", "mailaddress", "emailaddress",
    ],
  },
  {
    id: "tel",
    kind: "text",
    words: [
      "電話番号", "電話", "tel", "telno", "phone", "携帯", "携帯番号",
      "連絡先", "連絡先電話番号", "固定電話", "phonenumber",
    ],
  },
  {
    id: "zip",
    kind: "text",
    words: ["郵便番号", "〒", "zip", "zipcode", "postalcode", "postcode"],
  },
  {
    id: "address",
    kind: "text",
    words: [
      "住所", "所在地", "住所1", "住所2", "都道府県", "市区町村", "番地",
      "建物名", "ビル名", "address", "address1", "address2", "prefecture", "city",
    ],
  },
  {
    id: "staff",
    kind: "text",
    words: [
      "担当", "営業担当", "担当営業", "担当部署", "担当者コード", "販売担当",
      "staff", "owner", "salesrep", "assignee",
    ],
  },
  {
    id: "department",
    kind: "text",
    words: [
      "部署", "部門", "所属", "所属部署", "課", "部", "事業部", "支店", "店舗",
      "拠点", "department", "division", "branch",
    ],
  },
  {
    id: "account",
    kind: "text",
    words: [
      "勘定科目", "科目", "費目", "経費科目", "補助科目", "税区分",
      "accounttitle", "account_title", "category",
    ],
  },
  {
    id: "note",
    kind: "text",
    words: [
      "備考", "メモ", "摘要", "注記", "コメント", "特記事項", "補足", "備考欄",
      "remarks", "note", "notes", "memo", "comment",
    ],
  },
];

/* ------------------------------------------------------------------ *
 * 索引（モジュール読み込み時に1回だけ組む）
 *
 * 語数は 200 前後しかないので、組み立ての費用は無視できる。
 * 逆に autoMap() は (出力列 × 入力列) の全ペアで引くので、
 * 毎回 ALIAS_GROUPS を舐めると 2,400 回 × 200 語の線形探索になる。
 * ------------------------------------------------------------------ */

/** unifyKey(word) → 束ID */
const KEY_TO_GROUP: Map<string, string> = new Map();
/** 束ID → その束が指す値の種類 */
const GROUP_KIND: Map<string, ColumnKind> = new Map();

for (const group of ALIAS_GROUPS) {
  GROUP_KIND.set(group.id, group.kind);
  for (const word of group.words) {
    const key = unifyKey(word);
    // 空になる語は索引に載せない（載せると空見出しが全部この束に当たる）
    if (!key) continue;
    // 先勝ち。重複は起こさない約束なので、ここでの分岐に意味を持たせない
    if (!KEY_TO_GROUP.has(key)) KEY_TO_GROUP.set(key, group.id);
  }
}

/**
 * 照合キーが属する束のIDを返す。属さなければ null。
 *
 * ⚠ 引数は **`unifyKey()` を通したあとのキー**。生の見出しを渡さないこと
 *   （`SourceColumn.key` はすでに通してある）。
 */
export function aliasGroupOf(key: string): string | null {
  if (!key) return null;
  return KEY_TO_GROUP.get(key) ?? null;
}

/** 束IDが指す値の種類を返す。未知のIDなら null */
export function aliasKindOf(groupId: string): ColumnKind | null {
  return GROUP_KIND.get(groupId) ?? null;
}
