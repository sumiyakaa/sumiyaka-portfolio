import Link from "next/link";
import HomeIntro from "@/components/home/HomeIntro";
import Way from "@/components/home/Way";
import Atari from "@/components/home/Atari";
import Deguchi from "@/components/home/Deguchi";
import PickUpWorks from "@/components/home/PickUpWorks";
import PriceAnim from "@/components/home/PriceAnim";
import PriceRunner from "@/components/home/PriceRunner";
import BoundaryFigure from "@/components/home/BoundaryFigure";
import Person from "@/components/home/Person";
import CtaSection from "@/components/home/CtaSection";
import { getPickUpWorks } from "@/lib/works";
import { getPickUpTools } from "@/lib/toolCatalog";
import styles from "./page.module.css";

export default function Home() {
  // 件数はハードコードせず、作品データから毎回集計する（作品追加で自動追従）
  const pickupWorks = getPickUpWorks();
  // 02 ツール制作の枠。0件なら PickUpWorks 側が「準備中」プレートに戻る
  const pickupTools = getPickUpTools();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "墨家 / SUMIYAKA — 灯敷（AKASHIKI）",
    url: "https://akashiki.com",
    description:
      "AIスペシャリスト 墨家 / SUMIYAKA。御社の仕事のやり方をAIに教え込み、社員の方が自分で回せる状態まで伴走します。業務の自動化・ツール開発、Web制作も、設計から公開まで一人で。",
    publisher: {
      "@type": "Organization",
      name: "灯敷（AKASHIKI）",
      alternateName: "墨家 / SUMIYAKA",
    },
    inLanguage: "ja",
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* 1. Hero（OP→Hero の配線は HomeIntro＝子CC-E提供） */}
      <HomeIntro />

      {/* 2. 働き方（P9・2026-08-27）＝FV「その意味を、見る」の飛び先 #way。
          FV の黒から白へ落ちる最初の紙。宣言・2声・答え＋写真は「いくら浮くか」から移設 */}
      <Way />

      {/* 2b. マーキー帯A＝削除（2026-08-16 あおきさん指示「FV下のスクロール文字はAI臭の典型のため削除」。帯Bの扱いは確認中） */}

      {/* 3. 言い当て */}
      <Atari />

      {/* 4. できること（3つの出口） */}
      <Deguchi />

      {/* 5. 制作実績（Pickup） */}
      <PickUpWorks works={pickupWorks} tools={pickupTools} />

      {/* 6. いくら浮くか（掘り下げ構成・2026-08-18 REVIEW2／P9・2026-08-27 で軽量化）
          - id="value" は PriceAnim が section を描画する都合上、ラッパー div に付与（PriceAnim は変更禁止）
            ※ FV「その意味を、見る」の飛び先は P9 で #way（Way）へ。id="value" 自体は不変
          - 宣言「コンサルティングでは、ありません。」・社長の声2つ・答え＋写真は Way へ移設
          - PriceRunner の動き・発火・[data-price-amount] 契約は不変 */}
      <div id="value" className={styles.valueAnchor}>
        <PriceAnim className={styles.priceSection}>
          <PriceRunner />
          <div className={styles.priceInner}>
            {/* 1. 中見出し（既存・[data-price-header] 契約維持）
                P9＝先頭に来るので h3→h2 へ昇格。.priceHead の margin-top は 0（page.module.css） */}
            <div data-price-header className={styles.priceHead}>
              <h2 className={styles.priceTitle}>
                いくらかかるかより先に、いくら浮くか。
              </h2>
            </div>

            {/* 2. 逆算3行（既存・[data-price-card]/[data-price-amount] 契約維持） */}
            <div className={styles.priceRows}>
              <div data-price-card className={styles.priceRow}>
                <span className={styles.priceLabel}>月20時間の削減</span>
                <span className={styles.priceLeader} aria-hidden="true" />
                <span className={styles.priceArrow}>→</span>
                <span data-price-amount className={styles.priceAmount}>年 約50万円</span>
              </div>
              <div data-price-card className={styles.priceRow}>
                <span className={styles.priceLabel}>事務作業の30%を自動化</span>
                <span className={styles.priceLeader} aria-hidden="true" />
                <span className={styles.priceArrow}>→</span>
                <span data-price-amount className={styles.priceAmount}>年 約120万円</span>
              </div>
              <div data-price-card className={styles.priceRow}>
                <span className={styles.priceLabel}>1人分の業務を丸ごと</span>
                <span className={styles.priceLeader} aria-hidden="true" />
                <span className={styles.priceArrow}>→</span>
                <span data-price-amount className={styles.priceAmount}>年 約400万円</span>
              </div>
            </div>

            {/* 3. 注記（既存）— Web制作の料金表は /works#price（C4 実施済み・P6-1）
                P6-4＝できないこと・進め方・料金の考え方の本体は /service に置いたので導線を足す */}
            <p className={styles.priceNote}>
              価格は、削減額から逆算してご提案します。できないこと・進め方・料金の考え方は
              <Link href="/service" className={styles.priceNoteLink}>サービスページ</Link>
              へ、Web制作の料金は
              <Link href="/works#price" className={styles.priceNoteLink}>Web制作ページ</Link>
              へ。
            </p>
          </div>
        </PriceAnim>
      </div>

      {/* 7. Boundary Easter Egg（位置・動き不変） */}
      <BoundaryFigure />

      {/* 8. マーキー帯B＝削除（2026-08-17 あおきさん決定「帯は全廃」） */}

      {/* 9. どんな人か */}
      <Person />

      {/* 10. CTA */}
      <CtaSection />
    </main>
  );
}
