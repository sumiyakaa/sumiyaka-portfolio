/**
 * 請求書PDF一括作成ツール — サンプル台帳
 *
 * ⚠ 取引先・住所・電話番号・登録番号はすべて **架空** です。実在の企業・個人とは関係ありません。
 *
 * 「サンプルで試す」ボタンから読み込む想定のデータ。次の3点を必ず含めてある。
 *  ・軽減税率8%（飲食料品）の行 … 税率ごとの区分表示の検証用
 *  ・非課税0%の行 …………………… 0% の区分表示の検証用
 *  ・明細が9行の請求書1件 ………… PDF の改ページ検証用
 */

import type { Issuer, LedgerRow, TaxRate } from "./types";

interface SampleItem {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate?: TaxRate;
  note?: string;
}

interface SampleInvoice {
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientHonorific?: string;
  clientZip: string;
  clientAddress: string;
  subject: string;
  items: SampleItem[];
}

const SAMPLE_INVOICES: SampleInvoice[] = [
  {
    invoiceNo: "INV-2026-001",
    issueDate: "2026-08-05",
    dueDate: "2026-08-31",
    clientName: "株式会社ミナトデザイン",
    clientZip: "100-0000",
    clientAddress: "東京都千代田区架空町1-2-3 サンプルビル4F",
    subject: "2026年7月分 Webサイト保守運用",
    items: [
      { itemName: "Webサイト保守運用費（2026年7月分）", quantity: 1, unit: "式", unitPrice: 50000 },
      { itemName: "サーバー・ドメイン費用（2026年7月分）", quantity: 1, unit: "式", unitPrice: 4500 },
      {
        itemName: "追加ページ制作（採用情報）",
        quantity: 2,
        unit: "ページ",
        unitPrice: 38000,
        note: "7/15 ご発注分",
      },
    ],
  },
  {
    invoiceNo: "INV-2026-002",
    issueDate: "2026-08-07",
    dueDate: "2026-08-31",
    clientName: "合同会社あおば工房",
    clientZip: "460-0000",
    clientAddress: "愛知県名古屋市中区仮想1-4-8",
    subject: "商品撮影ディレクション",
    items: [
      { itemName: "商品撮影ディレクション費", quantity: 1, unit: "式", unitPrice: 120000 },
      {
        itemName: "撮影時 飲料・軽食（立替分）",
        quantity: 1,
        unit: "式",
        unitPrice: 3240,
        taxRate: 8,
        note: "軽減税率対象（飲食料品）",
      },
    ],
  },
  {
    invoiceNo: "INV-2026-003",
    issueDate: "2026-08-11",
    dueDate: "2026-09-10",
    clientName: "有限会社みどり不動産",
    clientZip: "530-0000",
    clientAddress: "大阪府大阪市北区仮称2-2-2",
    subject: "物件紹介ランディングページ制作",
    items: [
      { itemName: "物件紹介ランディングページ制作一式", quantity: 1, unit: "式", unitPrice: 480000 },
    ],
  },
  {
    // 明細9行 ＝ PDF の改ページ検証用
    invoiceNo: "INV-2026-004",
    issueDate: "2026-08-14",
    dueDate: "2026-08-31",
    clientName: "さくら歯科クリニック",
    clientZip: "980-0000",
    clientAddress: "宮城県仙台市青葉区架空3-7-1 サンプル駅前ビル2F",
    subject: "公式サイトリニューアル（第1回）",
    items: [
      { itemName: "要件整理・情報設計", quantity: 1, unit: "式", unitPrice: 60000 },
      { itemName: "デザインカンプ制作（トップページ）", quantity: 1, unit: "式", unitPrice: 90000 },
      { itemName: "デザインカンプ制作（下層ページ）", quantity: 5, unit: "ページ", unitPrice: 24000 },
      { itemName: "コーディング（トップページ）", quantity: 1, unit: "式", unitPrice: 80000 },
      { itemName: "コーディング（下層ページ）", quantity: 5, unit: "ページ", unitPrice: 18000 },
      { itemName: "予約フォーム設置・動作確認", quantity: 1, unit: "式", unitPrice: 45000 },
      { itemName: "写真レタッチ", quantity: 12, unit: "点", unitPrice: 1500 },
      { itemName: "原稿整理・校正", quantity: 1, unit: "式", unitPrice: 30000 },
      { itemName: "打ち合わせ交通費", quantity: 3, unit: "回", unitPrice: 1240, note: "実費" },
    ],
  },
  {
    invoiceNo: "INV-2026-005",
    issueDate: "2026-08-18",
    dueDate: "2026-09-30",
    clientName: "株式会社ヒノデ物産",
    clientZip: "812-0000",
    clientAddress: "福岡県福岡市博多区仮設5-1-9",
    subject: "会社案内パンフレット制作",
    items: [
      { itemName: "会社案内パンフレット デザイン制作", quantity: 1, unit: "式", unitPrice: 220000 },
      {
        itemName: "登記事項証明書 取得実費",
        quantity: 2,
        unit: "通",
        unitPrice: 600,
        taxRate: 0,
        note: "非課税（行政手数料）",
      },
    ],
  },
  {
    invoiceNo: "INV-2026-006",
    issueDate: "2026-08-20",
    dueDate: "2026-09-15",
    clientName: "立花写真事務所",
    clientHonorific: "様",
    clientZip: "760-0000",
    clientAddress: "香川県高松市架空町7-3",
    subject: "ロゴデータ整備",
    items: [{ itemName: "ロゴデータ整備（ai／png 書き出し）", quantity: 1, unit: "式", unitPrice: 8000 }],
  },
];

function buildSampleLedger(): LedgerRow[] {
  const rows: LedgerRow[] = [];
  // 1行目は見出し行の想定なので、明細は2行目から始まる
  let line = 2;
  for (const inv of SAMPLE_INVOICES) {
    for (const item of inv.items) {
      const taxRate: TaxRate = item.taxRate ?? 10;
      rows.push({
        invoiceNo: inv.invoiceNo,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        clientName: inv.clientName,
        clientHonorific: inv.clientHonorific ?? "御中",
        clientZip: inv.clientZip,
        clientAddress: inv.clientAddress,
        subject: inv.subject,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        taxRate,
        reduced: taxRate === 8,
        note: item.note ?? "",
        sourceLine: line++,
      });
    }
  }
  return rows;
}

/** サンプル台帳（6社・18明細）。8%の軽減税率行と0%の非課税行を含む */
export const SAMPLE_LEDGER: LedgerRow[] = buildSampleLedger();

/** サンプルの発行者情報。登録番号・電話・住所は一目でサンプルと分かる値にしてある */
export const SAMPLE_ISSUER: Issuer = {
  companyName: "AKASHIKI（灯敷）",
  registrationNo: "T1234567890123",
  zip: "000-0000",
  address: "サンプル県サンプル市サンプル町0-0-0 サンプルビル000",
  tel: "03-0000-0000",
  email: "sample@example.com",
  personName: "灯敷 太郎",
  bank: {
    name: "サンプル銀行",
    branch: "サンプル支店",
    type: "普通",
    number: "0000000",
    holder: "アカシキ タロウ",
  },
  closingNote:
    "※ 恐れ入りますが、振込手数料は貴社にてご負担くださいますようお願いいたします。\n※ これはサンプルデータです。取引先名・住所・登録番号はすべて架空のものです。",
  sealDataUrl: "",
  logoDataUrl: "",
};
