/**
 * 電帳法ファイル名 一括リネーム — サンプルデータ（画面の初期表示用）
 *
 * 架空の設定：小さな設計事務所が2021年1〜3月に受け取った証憑8件。
 * ⚠ 取引先はすべて **架空** です。「㈱霞商店」「国税工務店㈱」は国税庁の
 *    「電子帳簿保存法一問一答【電子取引関係】」および索引簿サンプルに出てくる架空名です。
 *
 * ⚠ **証憑の実体（バイト列）は持たない。** `blob` は 0 バイトの空 Blob、`size` も 0。
 *    サイズを嘘の値で埋めない（`statusStats` の合計は 0.0 MB と出るのが正しい）。
 *    このためサンプル状態では ZIP を書き出せない（ZIPボタンは disabled）。
 *    最後まで試したい人向けに `public/tools/evidence/evidence-sample.zip` を配る。
 *
 * ⚠ このファイルは画面から**静的 import** される。重い依存を持ち込まないこと
 *    （`fflate` も `_shared/sheetReader` も要らない）。
 *
 * ⚠ `public/tools/evidence/evidence-sample.zip` の中の記入済み台帳は、
 *    `scripts/tools/build-evidence-template.mjs` が下の SAMPLE_RECORDS から生成する。
 *    ただし HEIC は生成できないため、ZIP の中の #7 だけ `.jpg` に差し替えてある。
 */

import { ACCEPTED_EXTENSIONS, PDF_EXTENSIONS } from "./types";
import type { EvidenceFile, EvidenceKind, LedgerRow } from "./types";

/** サンプル1件（台帳の1行と、対応する証憑ファイル1件の両方のもとになる） */
interface SampleRecord {
  fileName: string;
  date: string;
  vendor: string;
  amount: number;
  docType: string;
}

/**
 * サンプル台帳の中身。
 *
 * 現場で実際に起きることを一通り踏むように選んである：
 *  #5 「名称未設定.png」＝いちばん多い名前 ／ #6 マイナス金額（返金）
 *  #7 iPhone のままの HEIC ／ #8 末尾に半角スペース（命名時に落とされる）
 *  取引先が3社に集中しているので、フォルダ分けに切り替えると効果が目に見える
 *
 * ⚠ この配列は `scripts/tools/build-evidence-template.mjs` が正規表現で読み出す。
 *    キー名（fileName / date / vendor / amount / docType）を変えるとサンプルZIPの生成が壊れる。
 */
const SAMPLE_RECORDS: SampleRecord[] = [
  {
    fileName: "IMG_4821.jpg",
    date: "2021-01-31",
    vendor: "㈱霞商店",
    amount: 110000,
    docType: "請求書",
  },
  {
    fileName: "scan_0002.pdf",
    date: "2021-02-15",
    vendor: "国税工務店㈱",
    amount: 88000,
    docType: "請求書",
  },
  {
    fileName: "請求書 (2).pdf",
    date: "2021-02-28",
    vendor: "㈱霞商店",
    amount: 110000,
    docType: "請求書",
  },
  {
    fileName: "20210305_領収書.pdf",
    date: "2021-03-05",
    vendor: "霞リース株式会社",
    amount: 33000,
    docType: "領収書",
  },
  {
    fileName: "名称未設定.png",
    date: "2021-03-10",
    vendor: "合同会社あかり事務機",
    amount: 6600,
    docType: "領収書",
  },
  {
    fileName: "download (3).pdf",
    date: "2021-03-18",
    vendor: "国税工務店㈱",
    amount: -22000,
    docType: "返金",
  },
  {
    fileName: "IMG_4930.HEIC",
    date: "2021-03-25",
    vendor: "カフェ・ド・スミヤカ",
    amount: 1480,
    docType: "領収書",
  },
  {
    fileName: "注文請書_最終版_v2 .pdf",
    date: "2021-03-31",
    vendor: "㈱霞商店",
    amount: 275000,
    docType: "注文請書",
  },
];

/**
 * サンプル台帳の明細が始まる行番号。
 * 配布テンプレートは 1行目＝注記 / 2行目＝見出し なので、明細は3行目から。
 * （`evidence-sample.zip` の記入済み台帳を読み込んだときと同じ行番号になる）
 */
const FIRST_DATA_LINE = 3;

const ACCEPTED = new Set<string>(ACCEPTED_EXTENSIONS);
const PDF = new Set<string>(PDF_EXTENSIONS);

/** 拡張子（小文字・ドットなし）。無ければ "" */
function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** サンプル台帳（8行） */
export const SAMPLE_LEDGER: LedgerRow[] = SAMPLE_RECORDS.map(
  (rec, i): LedgerRow => ({
    originalName: rec.fileName,
    date: rec.date,
    vendor: rec.vendor,
    amount: rec.amount,
    docType: rec.docType,
    note: "",
    sourceLine: FIRST_DATA_LINE + i,
  })
);

/**
 * サンプルの証憑8件。
 * 個別選択で読み込んだ想定なので `relativePath` は空、`key` はファイル名。
 * ⚠ 実体は持たない（`blob` は 0 バイト・`size` は 0）。
 */
export const SAMPLE_FILES: EvidenceFile[] = SAMPLE_RECORDS.map((rec): EvidenceFile => {
  const ext = extOf(rec.fileName);
  const kind: EvidenceKind = PDF.has(ext) ? "pdf" : "image";
  return {
    key: rec.fileName,
    name: rec.fileName,
    relativePath: "",
    ext,
    kind,
    accepted: ACCEPTED.has(ext),
    size: 0,
    blob: new Blob([]),
  };
});

/** 画面の `statusFile` に出す、サンプル状態のときの台帳名 */
export const SAMPLE_SOURCE_NAME = "サンプル台帳";
