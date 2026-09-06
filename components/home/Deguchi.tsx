import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import MagneticType from "@/components/home/MagneticType";
import SectionMark from "@/components/fv/top-body/SectionMark";
import styles from "./Deguchi.module.css";

/**
 * できること（3つの出口） — an-a.html .sec-exits の忠実移植。
 * リード行「ひとつの軸から、三つの出口へ。」は既存 MagneticType を
 * 装飾行として流用（動きのパラメータは不変）。
 * 出口③（Web制作）に AIO 1行＋「実績を見る → /works」リンク。
 * P9（2026-08-27）＝3枝の順序と文言を正本 T-4 どおりに置換（構造・クラス・枠ボタンは既存のまま）。
 */
export default function Deguchi() {
  return (
    <section
      className={styles.section}
      data-top-section="05"
      data-top-label="EXITS"
    >
      <div className={styles.wrap}>
        {/* P12（2026-09-06）＝章番号（進捗線と同じ連番）。文言は不変 */}
        <ScrollReveal>
          <SectionMark no="05" label="EXITS" />
          <h2 className={styles.heading}>できること</h2>
          <MagneticType
            label="ひとつの軸から、三つの出口へ。"
            labelClassName={styles.lead}
            lines={[]}
          />
        </ScrollReveal>
        <div className={styles.branches}>
          <ScrollReveal>
            <p className={styles.axisHead}>業務を、仕組みに変える</p>
          </ScrollReveal>
          <ul className={styles.branchList}>
            <ScrollReveal as="li" className={styles.branch}>
              <h3 className={styles.branchTitle}>
                <span className={styles.no}>①</span>AI導入の設計・教育
              </h3>
              <p className={styles.branchCopy}>
                御社の仕事をAIに教え、社員の方が回せる状態で手を離す
              </p>
              {/* 導線（P6-4）＝できること・できないこと・進め方・料金の考え方は /service に置く */}
              <Link href="/service" className={styles.branchLink}>
                サービスの詳細 → /service
              </Link>
            </ScrollReveal>
            <ScrollReveal as="li" className={styles.branch} delay={0.1}>
              <h3 className={styles.branchTitle}>
                <span className={styles.no}>②</span>業務の自動化・ツール開発
              </h3>
              <p className={styles.branchCopy}>手作業を、そのまま仕組みに変える</p>
              <Link href="/tools" className={styles.branchLink}>
                ツールを触る → /tools
              </Link>
            </ScrollReveal>
            <ScrollReveal as="li" className={styles.branch} delay={0.2}>
              <h3 className={styles.branchTitle}>
                <span className={styles.no}>③</span>Web制作
              </h3>
              <p className={styles.branchCopy}>
                集客・問い合わせ・予約という業務を、仕組みに変える
              </p>
              <p className={styles.branchAio}>AIO — AI検索最適化を、全案件に標準搭載。</p>
              <Link href="/works" className={styles.branchLink}>
                実績を見る → /works
              </Link>
            </ScrollReveal>
          </ul>
        </div>
      </div>
    </section>
  );
}
