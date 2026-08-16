import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./CtaSection.module.css";

/**
 * CTA — an-a.html .sec-cta の忠実移植。
 * 「無料相談」→ /contact。注記「通常24時間以内にご返信します」。
 */
export default function CtaSection() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <ScrollReveal>
          <p className={styles.lead}>机の上の手作業を、そのままお聞かせください。</p>
          <Link href="/contact" className={styles.btn}>
            <span className={styles.dot} aria-hidden="true" />
            無料相談
          </Link>
          <p className={styles.note}>通常24時間以内にご返信します</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
