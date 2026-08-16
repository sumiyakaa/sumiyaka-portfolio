import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Person.module.css";

/**
 * どんな人か — an-a.html .sec-person の忠実移植。
 * 経歴文言は正本（an-a.html＝売り込み資料v1.1準拠）どおり一言一句不変。
 */
export default function Person() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <ScrollReveal as="p" className={styles.label}>
          どんな人か
        </ScrollReveal>
        <ScrollReveal as="p" className={styles.display}>
          15歳、作る側へ。
        </ScrollReveal>
        <ScrollReveal as="p" className={styles.bio} delay={0.15}>
          高校・大学で情報技術を専攻。22歳から7年、大手美容外科クリニックの社内SEとして、止まれば診療が止まるシステムを支えてきた。29歳で独立。
        </ScrollReveal>
      </div>
    </section>
  );
}
