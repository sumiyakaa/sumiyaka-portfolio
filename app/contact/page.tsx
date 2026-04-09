import type { Metadata } from "next";
import ScrollReveal from "@/components/animation/ScrollReveal";
import ContactForm from "@/components/contact/ContactForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "CONTACT — AKASHIKI | お問い合わせ",
  description:
    "AKASHIKI（灯敷）へのお問い合わせ。LP制作・WordPress構築・コーディングのご相談はこちらから。ヒアリングシートに沿ったご相談で、方向性をスムーズに固められます。",
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <main>
      {/* Hero FV */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>CONTACT</h1>
          <p className={styles.heroSub}>お問い合わせ・ご相談</p>
        </div>
        <span className={styles.heroCornerLeft}>CONTACT</span>
        <span className={styles.heroCornerRight}>FORM</span>
      </section>

      {/* Lead */}
      <section className={styles.lead}>
        <div className={styles.leadInner}>
          <ScrollReveal>
            <p className={styles.leadText}>
              LP制作・WordPress構築・コーディングなど、Webサイト制作に関するご相談をお受けしています。
              <br />
              まずはお気軽にお問い合わせください。内容を確認のうえ、折り返しご連絡いたします。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Form */}
      <section className={styles.formSection}>
        <div className={styles.formInner}>
          <ScrollReveal delay={0.1}>
            <ContactForm />
          </ScrollReveal>
        </div>
      </section>

      {/* Info */}
      <section className={styles.info}>
        <div className={styles.infoInner}>
          <ScrollReveal>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>RESPONSE TIME</span>
                <p className={styles.infoValue}>
                  通常1〜2営業日以内にご返信いたします
                </p>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>FREE CONSULTATION</span>
                <p className={styles.infoValue}>
                  ラフ提案まで費用は発生しません
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
