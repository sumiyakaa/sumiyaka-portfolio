import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Atari.module.css";

/**
 * 言い当て — an-a.html .sec-insight の忠実移植。
 * 文言・統計値（60.8% / 48.2%）・出典表記は正本（an-a.html）どおり。
 */
export default function Atari() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <ScrollReveal>
          <h2 className={styles.q}>
            A社のCSVと、B社のExcelと、C社のPDFを、人が手で転記していませんか。
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className={styles.answer}>
            システムが無いのではなく、繋がっていない。だから人が転記している。
          </p>
        </ScrollReveal>
        <div className={styles.stats}>
          <ScrollReveal className={styles.stat}>
            <p className={styles.statNum}>60.8%</p>
            <p className={styles.statLabel}>
              システム化しても負担が減らない理由 第1位「データの二重入力が発生」
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className={styles.stat}>
            <p className={styles.statNum}>48.2%</p>
            <p className={styles.statLabel}>
              負担が大きい業務 第1位「データの入力・集計・照合」
            </p>
          </ScrollReveal>
        </div>
        <ScrollReveal>
          <p className={styles.statSrc}>
            エイトレッド調べ（2023年8月・従業員200人以下の中小企業バックオフィス担当者110名）
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
