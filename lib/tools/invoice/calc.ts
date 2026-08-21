/**
 * 請求書PDF一括作成ツール — グルーピングと消費税の計算
 *
 * ⚠ この層も一切ネットワークへ出ない。純粋な計算だけを行う。
 *
 * ── 採用した丸めの方針（重要） ──────────────────────────────
 * 1. 明細の金額 amount は `Math.round(quantity * unitPrice)` で **円単位の整数**にする。
 *    理由：請求書は円単位で表示・入金されるため、表示だけ丸めて内部に小数を残すと
 *    「明細の合計と小計が1円合わない」という事故が起きる。ここで確定させる。
 *    （Math.round は 0.5 を切り上げる。単価に小数を入れる運用は想定していない）
 * 2. 消費税額は **税率ごとに1回だけ** 算出する（適格請求書＝インボイスの要件）。
 *    明細ごとに税額を出して合計してはいけない。
 *    税率ごとの税抜合計 taxable に税率を掛け、CalcOptions.rounding（floor / round / ceil）
 *    を1回だけ適用する。
 * ────────────────────────────────────────────────────
 */

import type {
  CalcOptions,
  ComplianceCheck,
  InvoiceDoc,
  InvoiceItem,
  Issuer,
  LedgerRow,
  Rounding,
  TaxLine,
  TaxRate,
} from "./types";

/** 表示順（適格請求書は税率ごとに区分して並べる）。降順で 10% → 8% → 0% */
const RATE_ORDER: TaxRate[] = [10, 8, 0];

/** 適格請求書発行事業者の登録番号。T ＋ 数字13桁 */
const REGISTRATION_NO_RE = /^T\d{13}$/;

function applyRounding(value: number, mode: Rounding): number {
  if (mode === "ceil") return Math.ceil(value);
  if (mode === "round") return Math.round(value);
  return Math.floor(value);
}

interface Group {
  key: string;
  invoiceNo: string;
  rows: LedgerRow[];
}

/** 最初に現れた空でない値を採る（2行目以降でヘッダー情報を省く書き方に対応するため） */
function firstFilled(rows: LedgerRow[], pick: (r: LedgerRow) => string): string {
  for (const r of rows) {
    const v = pick(r);
    if (v && v.trim() !== "") return v.trim();
  }
  return "";
}

/**
 * 台帳の行を請求書ごとにまとめ、税率ごとに区分した金額を計算する。
 * グループは **元の出現順** を保つ。
 */
export function buildInvoices(rows: LedgerRow[], options: CalcOptions): InvoiceDoc[] {
  const order: string[] = [];
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const no = (row.invoiceNo ?? "").trim();
    // 請求書番号が空の行は取引先名でまとめ、あとから (自動採番) の連番を振る
    const key = no !== "" ? `no:${no}` : `auto:${(row.clientName ?? "").trim()}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, invoiceNo: no, rows: [] };
      groups.set(key, g);
      order.push(key);
    }
    g.rows.push(row);
  }

  let autoSeq = 0;
  const docs: InvoiceDoc[] = [];

  for (const key of order) {
    const g = groups.get(key);
    if (!g) continue;
    const invoiceNo = g.invoiceNo !== "" ? g.invoiceNo : `(自動採番)${++autoSeq}`;

    const items: InvoiceItem[] = g.rows.map((r) => {
      const quantity = Number.isFinite(r.quantity) ? r.quantity : 0;
      const unitPrice = Number.isFinite(r.unitPrice) ? r.unitPrice : 0;
      return {
        name: r.itemName,
        quantity,
        unit: r.unit,
        unitPrice,
        amount: Math.round(quantity * unitPrice),
        taxRate: r.taxRate,
        reduced: r.taxRate === 8 ? true : r.reduced,
        note: r.note,
      };
    });

    // 税率ごとの税抜合計
    const taxable = new Map<TaxRate, number>();
    for (const it of items) {
      taxable.set(it.taxRate, (taxable.get(it.taxRate) ?? 0) + it.amount);
    }

    // 税額は税率ごとに1回だけ丸める
    const taxLines: TaxLine[] = [];
    for (const rate of RATE_ORDER) {
      const base = taxable.get(rate);
      if (base === undefined || base === 0) continue; // 使われていない税率は載せない
      const tax = rate === 0 ? 0 : applyRounding((base * rate) / 100, options.rounding);
      taxLines.push({ rate, taxable: base, tax, reduced: rate === 8 });
    }

    const subtotal = taxLines.reduce((s, l) => s + l.taxable, 0);
    const taxTotal = taxLines.reduce((s, l) => s + l.tax, 0);

    const notes: string[] = [];
    for (const it of items) {
      const n = (it.note ?? "").trim();
      if (n && !notes.includes(n)) notes.push(n);
    }

    docs.push({
      invoiceNo,
      issueDate: firstFilled(g.rows, (r) => r.issueDate),
      dueDate: firstFilled(g.rows, (r) => r.dueDate),
      client: {
        name: firstFilled(g.rows, (r) => r.clientName),
        honorific: firstFilled(g.rows, (r) => r.clientHonorific) || "御中",
        zip: firstFilled(g.rows, (r) => r.clientZip),
        address: firstFilled(g.rows, (r) => r.clientAddress),
      },
      subject: firstFilled(g.rows, (r) => r.subject),
      items,
      taxLines,
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      notes,
    });
  }

  return docs;
}

/**
 * 適格請求書（インボイス）の記載事項6点をチェックする。
 * 参照：消費税法 第57条の4（適格請求書発行事業者の義務）
 */
export function checkCompliance(issuer: Issuer, doc: InvoiceDoc): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // ① 発行者の氏名又は名称 及び 登録番号
  const hasName = (issuer.companyName ?? "").trim() !== "";
  const regNo = (issuer.registrationNo ?? "").trim();
  const regOk = REGISTRATION_NO_RE.test(regNo);
  checks.push({
    key: "issuer",
    label: "① 発行者の氏名又は名称・登録番号",
    ok: hasName && regOk,
    hint: !hasName
      ? "発行者設定に会社名（屋号・氏名）を入力してください。"
      : !regOk
        ? regNo === ""
          ? "登録番号（T＋数字13桁）を発行者設定に入力してください。"
          : `登録番号「${regNo}」の形式が違います。T のあとに数字13桁で入力してください。`
        : "",
  });

  // ② 取引年月日
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(doc.issueDate ?? "");
  checks.push({
    key: "issueDate",
    label: "② 取引年月日",
    ok: dateOk,
    hint: dateOk ? "" : "台帳の「請求日」を 2026/08/21 のような形式で入力してください。",
  });

  // ③ 取引内容（軽減税率の対象品目である旨）
  const hasItems = doc.items.length > 0;
  const namedAll = hasItems && doc.items.every((i) => (i.name ?? "").trim() !== "");
  const reducedMarked = doc.items.every((i) => i.taxRate !== 8 || i.reduced);
  const itemsOk = hasItems && namedAll && reducedMarked;
  checks.push({
    key: "items",
    label: "③ 取引内容（軽減税率の対象品目である旨）",
    ok: itemsOk,
    hint: !hasItems
      ? "明細が1行もありません。台帳に品目を入力してください。"
      : !namedAll
        ? "品目が空の明細があります。何の取引かを書いてください。"
        : !reducedMarked
          ? "8%の明細に軽減税率対象の印が付いていません。税率欄を「軽減8%」にしてください。"
          : "",
  });

  // ④ 税率ごとに区分して合計した対価の額 及び 適用税率
  const taxableSum = doc.taxLines.reduce((s, l) => s + l.taxable, 0);
  const taxableOk = doc.taxLines.length > 0 && taxableSum === doc.subtotal;
  checks.push({
    key: "taxableByRate",
    label: "④ 税率ごとに区分して合計した対価の額・適用税率",
    ok: taxableOk,
    hint: taxableOk
      ? ""
      : doc.taxLines.length === 0
        ? "税率ごとの区分が作れませんでした。台帳の「税率」欄を確認してください。"
        : "税率ごとの合計と小計が一致しません。台帳の税率欄に想定外の値が入っていないか確認してください。",
  });

  // ⑤ 税率ごとに区分した消費税額等
  const taxSum = doc.taxLines.reduce((s, l) => s + l.tax, 0);
  const taxOk =
    doc.taxLines.length > 0 &&
    taxSum === doc.taxTotal &&
    doc.taxLines.every((l) => Number.isFinite(l.tax));
  checks.push({
    key: "taxByRate",
    label: "⑤ 税率ごとに区分した消費税額等",
    ok: taxOk,
    hint: taxOk ? "" : "税率ごとの消費税額を計算できませんでした。台帳の数量・単価・税率を確認してください。",
  });

  // ⑥ 交付を受ける事業者の氏名又は名称
  const clientOk = (doc.client.name ?? "").trim() !== "";
  checks.push({
    key: "client",
    label: "⑥ 交付を受ける事業者の氏名又は名称",
    ok: clientOk,
    hint: clientOk ? "" : "台帳の「取引先名」を入力してください。",
  });

  return checks;
}
