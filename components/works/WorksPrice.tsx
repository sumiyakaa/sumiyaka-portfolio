import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./WorksPrice.module.css";

/**
 * WorksPrice — Web制作の料金表（PRICE）
 *
 * `/service` の料金セクション（PRICE）を、Web制作ページ（`/works`）へ移設した
 * 自己完結コンポーネント（設計計画書 §14 C4・F2）。propsは取らず、内容は固定。
 * 文言・金額は `/service` から一言一句そのまま移している。
 * トップの価格注記から `/works#price` で飛んでくるため、section に id="price" を持つ。
 * ページ内の一セクションとして置かれるため、最上位の見出しは h2。
 */

const PRICE_PLANS = [
  {
    num: "01",
    name: "LP DESIGN",
    amount: "¥150,000〜",
    desc: "静的コーディング / レスポンシブ対応 / 5ページまで",
  },
  {
    num: "02",
    name: "WORDPRESS",
    amount: "¥200,000〜",
    desc: "テーマ構築 / カスタマイズ / 管理画面設計",
  },
  {
    num: "03",
    name: "NEXT.JS / WEB APP",
    amount: "ASK",
    desc: "静的サイトでは実現できない本格Web機能 / 会員制サイト・予約システム・管理画面 / 高速表示・SEO最適化",
  },
];

const PRICE_OPTIONS = [
  { name: "JS高度演出（GSAP / パララックス / 3D）", amount: "¥30,000〜" },
  { name: "セクション追加（1セクションあたり）", amount: "¥20,000〜" },
  { name: "保守・運用サポート（月額）", amount: "¥15,000〜" },
];

export default function WorksPrice() {
  return (
    <section
      className={styles.worksPrice}
      id="price"
      aria-labelledby="works-price-title"
    >
      <div className={styles.worksPriceInner}>
        <ScrollReveal className={styles.worksPriceReveal}>
          <span className={styles.worksPriceLabel}>PRICE</span>
          <h2 id="works-price-title" className={styles.worksPriceTitle}>
            Web制作の料金
          </h2>
        </ScrollReveal>

        <div className={styles.planList}>
          {PRICE_PLANS.map((plan, i) => (
            <ScrollReveal
              key={plan.num}
              className={styles.worksPriceReveal}
              delay={0.1 + i * 0.05}
            >
              <div className={styles.planItem}>
                <span className={styles.planNum}>{plan.num}</span>
                <h3 className={styles.planName}>{plan.name}</h3>
                <span className={styles.planAmount}>{plan.amount}</span>
                <p className={styles.planDesc}>{plan.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className={styles.worksPriceReveal} delay={0.25}>
          <div className={styles.option}>
            <p className={styles.optionLabel}>OPTION</p>
            <div className={styles.optionList}>
              {PRICE_OPTIONS.map((opt) => (
                <div key={opt.name} className={styles.optionItem}>
                  <span className={styles.optionPrefix} aria-hidden="true">+</span>
                  <span className={styles.optionName}>{opt.name}</span>
                  <span className={styles.optionAmount}>{opt.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal className={styles.worksPriceReveal} delay={0.3}>
          <p className={styles.note}>
            上記は目安です。ページ数・機能・素材の有無により変動します。お気軽にご相談ください。
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
