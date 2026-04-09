import Link from "next/link";
import HomeClient from "@/components/home/HomeClient";
import Marquee from "@/components/home/Marquee";
import PickUpWorks from "@/components/home/PickUpWorks";
import PriceAnim from "@/components/home/PriceAnim";
import ScrollReveal from "@/components/animation/ScrollReveal";
import MagneticType from "@/components/home/MagneticType";
import PriceRunner from "@/components/home/PriceRunner";
import DynamicLantern from "@/components/webgl/DynamicLantern";
import { getPickUpWorks } from "@/lib/works";
import styles from "./page.module.css";

export default function Home() {
  const pickupWorks = getPickUpWorks();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AKASHIKI — 灯敷",
    url: "https://akashiki.com",
    description:
      "Webデザイン・コーディングのポートフォリオサイト。LP制作・WordPress構築を中心に、設計から実装までワンストップで対応。",
    publisher: {
      "@type": "Organization",
      name: "AKASHIKI",
      alternateName: "灯敷",
    },
    inLanguage: "ja",
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* 1. HomeClient（Hero + OpeningAnimation連携） */}
      <HomeClient>
        {/* 2. Marquee Band */}
        <Marquee text="WEB DESIGN — DEVELOPMENT — CODING — WORDPRESS" />

        {/* 3. Pick Up Works */}
        <PickUpWorks works={pickupWorks} />

        {/* 4. About Teaser — Asymmetric Split */}
        <section className={styles.aboutTeaser}>
          <ScrollReveal direction="left" className={styles.aboutLeft}>
            <MagneticType
              label="WHY AKASHIKI"
              labelClassName={styles.aboutLabel}
              lines={[
                { text: "DESIGN" },
                { text: "&" },
                { text: "DEPLOY." },
              ]}
              linesClassName={styles.aboutLargeType}
            />
          </ScrollReveal>
          <ScrollReveal direction="right" delay={0.15} className={styles.aboutRight}>
            <p>
              20サイト以上の制作実績を持つ、Web デザイン × コーディングの専門家。見た目だけでなく、表示速度・保守性・運用まで見据えたサイトを構築します。
            </p>
            <div className={styles.aboutStrengths}>
              <div className={styles.aboutStrength}>
                <span className={styles.aboutStrengthLabel}>LP / CORPORATE / WORDPRESS</span>
                <p className={styles.aboutStrengthDesc}>あらゆるサイト種別に対応。多言語サイトは3言語まで実績あり。</p>
              </div>
              <div className={styles.aboutStrength}>
                <span className={styles.aboutStrengthLabel}>ONE-STOP WORKFLOW</span>
                <p className={styles.aboutStrengthDesc}>構成・デザイン・コーディング・公開まで、すべてワンストップで完結。</p>
              </div>
              <div className={styles.aboutStrength}>
                <span className={styles.aboutStrengthLabel}>MOTION &amp; INTERACTION</span>
                <p className={styles.aboutStrengthDesc}>GSAP・スクロール連動アニメーションなど、動きのある表現を標準実装。</p>
              </div>
            </div>
            <Link href="/about" className={styles.aboutLink}>
              MORE <span>→</span>
            </Link>
          </ScrollReveal>
        </section>

        {/* 5. Marquee Band (Reverse) */}
        <Marquee
          text="LP DESIGN — CORPORATE SITE — WORDPRESS — AI SEARCH OPTIMIZATION"
          reverse
        />

        {/* 6. Price Digest — 旧サイト忠実再現（白背景・リスト型） */}
        <PriceAnim className={styles.priceSection}>
          <PriceRunner />
          <div className={styles.priceInner}>
            <div data-price-header className={styles.priceHead}>
              <h2 className={styles.priceTitle}>
                PRICE — <span className={styles.priceTitleJp}>料金</span>
              </h2>
              <div className={styles.priceHr} />
            </div>

            <div className={styles.priceList}>
              <div data-price-card className={styles.priceItem}>
                <div className={styles.priceItemLeft}>
                  <h3 className={styles.priceName}>LP DESIGN</h3>
                  <p className={styles.priceDesc}>静的コーディング / レスポンシブ対応</p>
                </div>
                <span data-price-amount className={styles.priceAmount}>¥150,000〜</span>
              </div>
              <div data-price-card className={styles.priceItem}>
                <div className={styles.priceItemLeft}>
                  <h3 className={styles.priceName}>WORDPRESS</h3>
                  <p className={styles.priceDesc}>テーマ構築 / カスタマイズ</p>
                </div>
                <span data-price-amount className={styles.priceAmount}>¥200,000〜</span>
              </div>
            </div>
          </div>

          <div data-price-cta className={styles.priceCta}>
            <Link href="/service" className={styles.priceCtaLink}>
              <span className={styles.priceCtaLinkText}>VIEW DETAILS →</span>
            </Link>
          </div>
        </PriceAnim>

        {/* 7. Lantern WebGL */}
        <section className={styles.lanternSection}>
          <DynamicLantern />
        </section>

        {/* 8. Contact CTA */}
        <section className={styles.contactSection}>
          <ScrollReveal className={styles.contactInner}>
            <h2 className={styles.contactHeading}>CONTACT</h2>
            <p className={styles.contactText}>
              お気軽にご相談ください
            </p>
            <Link href="/contact" className={styles.contactLink}>
              GET IN TOUCH <span>→</span>
            </Link>
          </ScrollReveal>
        </section>
      </HomeClient>
    </main>
  );
}
