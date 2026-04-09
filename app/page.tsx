import Link from "next/link";
import HomeClient from "@/components/home/HomeClient";
import Marquee from "@/components/home/Marquee";
import PickUpWorks from "@/components/home/PickUpWorks";
import ScrollReveal from "@/components/animation/ScrollReveal";
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
            <span className={styles.aboutLabel}>WHO WE ARE</span>
            <div className={styles.aboutLargeType}>
              <span>WEB</span>
              <span>DESIGNER</span>
              <span>&amp;</span>
              <span>DEVELOPER</span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right" delay={0.15} className={styles.aboutRight}>
            <p>
              構成からデザイン、コーディング、公開まで一括対応。
            </p>
            <p>
              見た目を再現するだけでは足りない。表示速度、アクセシビリティ、保守性——運用まで見据えた、実務に耐えるWebサイトを作ること。それが私たちの仕事です。
            </p>
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

        {/* 6. Price Digest */}
        <section className={styles.priceSection}>
          <div className={styles.priceInner}>
            <ScrollReveal>
              <div className={styles.priceHeader}>
                <span className={styles.priceLabel}>
                  PRICE<span className={styles.priceLabelSub}>料金</span>
                </span>
              </div>
            </ScrollReveal>

            <div className={styles.priceCards}>
              <ScrollReveal delay={0.1}>
                <div className={styles.priceCard}>
                  <span className={styles.priceCardLabel}>LP DESIGN</span>
                  <p className={styles.priceCardDesc}>
                    静的コーディング / レスポンシブ対応
                  </p>
                  <span className={styles.priceCardAmount}>¥150,000〜</span>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <div className={styles.priceCard}>
                  <span className={styles.priceCardLabel}>WORDPRESS</span>
                  <p className={styles.priceCardDesc}>
                    テーマ構築 / カスタマイズ
                  </p>
                  <span className={styles.priceCardAmount}>¥200,000〜</span>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.3}>
              <div className={styles.priceCta}>
                <Link href="/service" className={styles.priceCtaLink}>
                  VIEW DETAILS <span>→</span>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

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
