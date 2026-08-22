import type { Tool } from "@/types/tool";

/**
 * 自社で開発したツール。
 *
 * ⚠ 実際に動くものだけを載せる。作っていないものは並べない。
 * ⚠ 6本構成（2026-08-22 あおきさん判断）。Web制作のWorksと同じく6選で並べる。
 *    旧「本数は3本まで」は撤回。根拠だった「依存やAPIの変更で壊れる」は、
 *    6本ともブラウザ内で完結し外部APIを一切使わないため該当しない。
 * ⚠ 6本は「画面の主役の絵」が全部違うように選んである
 *    （A4の紙面／3色の突合リスト／リネーム対応表／列を結ぶ線／
 *      ビフォーアフター対比／グラフ入り紙面）。
 *    増やすときは、絵が既存と被らないかを先に確かめること。
 */
export const tools: Tool[] = [
  {
    slug: "invoice-batch",
    no: "T-01",
    title: "請求書PDF 一括作成",
    titleEn: "Invoice Batch",
    summary: "Excelの台帳から、取引先ごとの請求書PDFをまとめて作る。",
    description:
      "請求書番号でまとめ、取引先ごとの1枚に組み替えます。適格請求書（インボイス）の記載要件に対応。読み込んだ台帳はブラウザの中だけで処理され、外部へ送信されません。",
    tags: ["Excel / CSV", "PDF", "インボイス対応", "ブラウザ内完結"],
    // 資産は public/tools/invoice/ にまとめている（テンプレートExcelと同じ場所）
    thumbnail: "/tools/invoice/thumbnail.webp",
    order: 1,
    isPickUp: true,
  },
  {
    slug: "payment-reconcile",
    no: "T-02",
    title: "入金消込 突合",
    titleEn: "Payment Reconcile",
    summary: "銀行の入出金明細と請求台帳を突き合わせ、入金済み・未入金・要確認に分ける。",
    description:
      "振込名義のカナのゆれ、振込手数料の差引、複数請求の合算入金、分割入金。金額が合わない理由まで示して3つに分けます。読み込んだ明細はブラウザの中だけで処理され、外部へ送信されません。",
    tags: ["銀行CSV", "名寄せ", "消込", "ブラウザ内完結"],
    thumbnail: "/tools/reconcile/thumbnail.webp",
    order: 2,
    isPickUp: true,
  },
  {
    slug: "evidence-rename",
    no: "T-03",
    title: "電帳法ファイル名 一括リネーム",
    titleEn: "Evidence Rename",
    summary: "証憑ファイルの束を、規則的なファイル名へまとめて付け替える。",
    description:
      "台帳に書いた取引年月日・取引先・取引金額をもとに、PDFや画像のファイル名を一括で付け替え、索引簿と一緒にZIPで書き出します。ファイルはブラウザの中だけで処理され、外部へ送信されません。",
    tags: ["ZIP", "Excel / CSV", "電子帳簿保存法", "ブラウザ内完結"],
    thumbnail: "/tools/evidence/thumbnail.webp",
    order: 3,
    isPickUp: true,
  },
  {
    slug: "table-unify",
    no: "T-04",
    title: "列マッピング統合",
    titleEn: "Table Unify",
    summary: "列の並びも名前もバラバラな複数の表を、決めた管理表の形へ揃えて1つにする。",
    description:
      "A社のCSVとB社のExcelを、御社の管理表の形に揃えます。見出しの名前から対応づけを機械が下書きし、線を引き直して確定できます。読み込んだファイルはブラウザの中だけで処理され、外部へ送信されません。",
    tags: ["Excel / CSV", "列マッピング", "複数ファイル統合", "ブラウザ内完結"],
    thumbnail: "/tools/unify/thumbnail.webp",
    order: 4,
    isPickUp: true,
  },
  {
    slug: "list-cleanup",
    no: "T-05",
    title: "名簿クレンジング",
    titleEn: "List Cleanup",
    summary: "顧客名簿の表記ゆれを診断して、まとめて直す。",
    description:
      "半角カナ・全角英数・法人格の略記・余分な空白といった表記のゆれを種類ごとに数え、直す規則を1つずつ選んで一括で直します。修正前と修正後を並べて確かめられ、重複の疑いがある行も見つけます。読み込んだ名簿はブラウザの中だけで処理され、外部へ送信されません。",
    tags: ["Excel / CSV", "表記ゆれ", "重複検出", "ブラウザ内完結"],
    thumbnail: "/tools/cleanup/thumbnail.webp",
    order: 5,
    isPickUp: true,
  },
  {
    slug: "monthly-report",
    no: "T-06",
    title: "月次レポートPDF",
    titleEn: "Monthly Report",
    summary: "Excelの売上表から、前月比・前年同月比つきのレポートPDFを1枚作る。",
    description:
      "日付と金額の列があれば、月へ畳んで前月比・前年同月比・年度累計まで計算し、グラフの載ったA4横1枚のレポートPDFにします。要約文はルールベースで組み立てた事実だけで、評価や推測は書きません。読み込んだ売上表はブラウザの中だけで処理され、外部へ送信されません。",
    tags: ["Excel / CSV", "PDF", "グラフ", "ブラウザ内完結"],
    thumbnail: "/tools/report/thumbnail.webp",
    order: 6,
    isPickUp: true,
  },
];
