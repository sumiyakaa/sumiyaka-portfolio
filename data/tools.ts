import type { Tool } from "@/types/tool";

/**
 * 自社で開発したツール。
 *
 * ⚠ 実際に動くものだけを載せる。作っていないものは並べない。
 * ⚠ 動くツールは壊れる（依存の更新・仕様変更）。本数は増やしすぎない。
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
];
