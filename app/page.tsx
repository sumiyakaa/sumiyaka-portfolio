import Link from "next/link";
import HomeIntro from "@/components/home/HomeIntro";
import Marquee from "@/components/home/Marquee";
import Atari from "@/components/home/Atari";
import Deguchi from "@/components/home/Deguchi";
import PickUpWorks from "@/components/home/PickUpWorks";
import PriceAnim from "@/components/home/PriceAnim";
import PriceRunner from "@/components/home/PriceRunner";
import BoundaryFigure from "@/components/home/BoundaryFigure";
import Person from "@/components/home/Person";
import CtaSection from "@/components/home/CtaSection";
import { getPickUpWorks } from "@/lib/works";
import styles from "./page.module.css";

export default function Home() {
  // 件数はハードコードせず、作品データから毎回集計する（作品追加で自動追従）
  const pickupWorks = getPickUpWorks();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "墨家 / SUMIYAKA — 灯敷（AKASHIKI）",
    url: "https://akashiki.com",
    description:
      "バラバラな事務作業を、ひとりでに回る仕組みに変えます。業務の自動化・ツール開発、Web制作、AI導入の設計・教育。設計から実装・公開まで、すべて一人で対応。",
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

      {/* 2. マーキー帯A＝削除（2026-08-16 あおきさん指示「FV下のスクロール文字はAI臭の典型のため削除」。帯Bの扱いは確認中） */}

      {/* 3. 言い当て */}
      <Atari />

      {/* 4. できること（3つの出口） */}
      <Deguchi />

      {/* 5. 制作実績（Pickup） */}
      <PickUpWorks works={pickupWorks} />

      {/* 6. 価格の考え方（PriceRunner が年額を運ぶ・[data-price-amount] 契約維持） */}
      <PriceAnim className={styles.priceSection}>
        <PriceRunner />
        <div className={styles.priceInner}>
          <div data-price-header className={styles.priceHead}>
            <h2 className={styles.priceTitle}>
              いくらかかるかより先に、いくら浮くか。
            </h2>
          </div>

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

          {/* Web制作の料金表は現状 /service にある（C4の /works 移設は P6 で実施予定＝それまでリンク先はサービスページ） */}
          <p className={styles.priceNote}>
            価格は、削減額から逆算してご提案します。Web制作の料金は
            <Link href="/service" className={styles.priceNoteLink}>サービスページ</Link>
            へ。
          </p>
        </div>
      </PriceAnim>

      {/* 7. Boundary Easter Egg（位置・動き不変） */}
      <BoundaryFigure />

      {/* 8. マーキー帯B */}
      <Marquee variant="washi" text="灯を、ひとつずつ、ともすように。" />

      {/* 9. どんな人か */}
      <Person />

      {/* 10. CTA */}
      <CtaSection />
    </main>
  );
}
