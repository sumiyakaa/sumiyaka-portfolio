import type { Metadata } from "next";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import FVTypewriter from "@/components/animation/FVTypewriter";
import FVPulseRings from "@/components/animation/FVPulseRings";
import ContactForm from "@/components/contact/ContactForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "CONTACT — AKASHIKI | お問い合わせ",
  description:
    "AKASHIKI（灯敷）へのお問い合わせ。LP制作・WordPress構築・Webデザインのご相談はお気軽にどうぞ。",
  robots: { index: true, follow: true },
  openGraph: {
    images: [{ url: "/api/og?title=CONTACT&sub=%E3%81%8A%E5%95%8F%E3%81%84%E5%90%88%E3%82%8F%E3%81%9B", width: 1200, height: 630 }],
  },
};

export default function ContactPage() {
  return (
    <main>
      {/* ========== FV — 100vh ========== */}
      <SubPageFVAnim className={styles.fv} targetLetterSpacing="0.25em">
        <div className={styles.fvBg}>
          <div className={styles.fvGrain} aria-hidden="true" />
          <div className={styles.fvScanline} aria-hidden="true" />
        </div>

        <FVPulseRings />

        <div className={styles.fvContent}>
          <FVTypewriter text="CONTACT" className={styles.fvTitle} />
          <div data-fv-hr className={styles.fvHr} aria-hidden="true" />
        </div>

        <div className={styles.fvEdgeBl}>
          <span data-fv-edge className={styles.fvEdgeText}>CONTACT</span>
        </div>
        <div className={styles.fvEdgeBr}>
          <span data-fv-edge className={styles.fvEdgeText}>SCROLL</span>
        </div>
      </SubPageFVAnim>

      {/* ========== フォームセクション（白背景） ========== */}
      <section className={styles.formSection} aria-label="お問い合わせフォーム">
        <div className={styles.formInner}>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
