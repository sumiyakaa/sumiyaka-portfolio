import { works } from "@/data/works";

/**
 * 制作実績データの配信エンドポイント。
 *
 * 用途: Works Finder（https://sumiyakastudio.github.io/works-finder/）が起動時に取得し、
 * 「ポートフォリオに作品を追加したら Finder 側も自動で最新になる」状態をつくる。
 *
 * - 読み取り専用・公開情報のみ（works.ts に載っている＝すでに公開済みの内容）
 * - 画像はこのサイトの絶対URLで返す（Finder 側に画像を置かなくてよい）
 *   card = og.jpg（800×450 の16:9・カードに最適）／ full = 01.webp（ページ全体）
 * - ビルド時に静的生成されるため、実行コストは実質ゼロ
 */

export const dynamic = "force-static";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://sumiyaka-portfolio.vercel.app");

const asset = (slug: string, file: string) => `${SITE_ORIGIN}/works/${slug}/${file}`;

/**
 * フィルタ軸の正規化。
 *
 * works.ts の値は「その作品を一言で説明する」ための表現なので、そのままだと
 * 24作品で目的が18種類に分かれ、絞り込み軸として機能しない。
 * ここで検索用の粒度に丸める（ポートフォリオ本体の表示は works.ts の原文のまま）。
 * マップに無い値はそのまま通すので、新ジャンルを足しても壊れない。
 */
const GENRE_MAP: Record<string, string> = {
  "化粧品・スキンケア": "美容・コスメ",
};

const SITE_TYPE_MAP: Record<string, string> = {
  "LP（ランディングページ）": "LP",
  "ブランドサイト＋LP（複合）": "ブランドサイト",
  "ブランドサイト（コーポレート）": "ブランドサイト",
};

const PURPOSE_MAP: Record<string, string> = {
  "ブランド訴求・販路開拓": "ブランド訴求",
  "ブランディング・世界観訴求": "ブランド訴求",
  "ブランディング・販売導線（モール誘引）": "ブランド訴求",
  "ブランディング・集客": "ブランド訴求",
  "集客・予約促進": "集客・予約",
  "集患・予約・来院促進": "集客・予約",
  "集客・体験予約": "集客・予約",
  "入園促進・見学予約・採用": "集客・予約",
  "集客・無料テスト洗浄予約": "集客・問い合わせ",
  "集客・CVR向上": "集客・問い合わせ",
  "物件紹介・集客・問い合わせ": "集客・問い合わせ",
  "ポートフォリオ・採用・問い合わせ": "ポートフォリオ・採用",
  "ポートフォリオ・作品検索": "ポートフォリオ・採用",
};

const canonical = (map: Record<string, string>, value: string) => map[value] ?? value;

export function GET() {
  const payload = {
    schema: 1,
    source: "sumiyaka-portfolio",
    count: works.length,
    works: [...works]
      .sort((a, b) => a.order - b.order)
      .map((work) => ({
        slug: work.slug,
        id: work.id ?? null,
        title: work.title,
        // 画像はポートフォリオ側の絶対URL
        card: asset(work.slug, "og.jpg"),
        full: asset(work.slug, "01.webp"),
        // 分類（検索軸として使える粒度に丸める）
        genre: canonical(GENRE_MAP, work.genre),
        siteType: canonical(SITE_TYPE_MAP, work.siteType),
        purpose: canonical(PURPOSE_MAP, work.purpose),
        // 原文も残す（詳細表示や将来の用途向け）
        genreRaw: work.genre,
        siteTypeRaw: work.siteType,
        purposeRaw: work.purpose,
        tags: work.tags,
        // 本文
        summary: work.summary,
        challenge: work.challenge ?? null,
        designTone: work.designTone ?? null,
        features: work.features ?? [],
        techTags: work.techTags,
        techStack: work.techStack,
        // 補足
        pageCount: work.pageCount ?? null,
        scale: work.scale ?? null,
        budgetRange: work.budgetRange ?? null,
        durationRange: work.durationRange ?? null,
        year: work.year ?? null,
        // フラグ
        isFeatured: work.isFeatured ?? false,
        hasCms: work.hasCms ?? false,
        hasAnimation: work.hasAnimation ?? false,
        hasForm: work.hasForm ?? false,
        isConcept: false,
        // 導線
        siteUrl: work.siteUrl ?? work.liveUrl ?? null,
        detailUrl: work.detailUrl ?? null,
      })),
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // 外部サイト（Works Finder）からの取得を許可する読み取り専用API
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
