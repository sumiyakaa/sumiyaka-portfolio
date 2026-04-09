import type { Metadata } from "next";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "SERVICE — AKASHIKI | Web制作サービス・料金",
  description:
    "AKASHIKI（灯敷）のWeb制作サービス。LP制作・WordPress構築・AI検索最適化（AIO）を、構成からデザイン、コーディング、公開まで一括対応。料金・制作の流れをご案内します。",
};

const HOW_I_WORK = [
  {
    num: "01",
    title: "STRATEGY",
    desc: "制作に入る前に、まず訊く。誰に届けるのか、何を伝えたいのか、競合はどこか。ヒアリングで得た情報を構造化し、訴求軸を定め、ワイヤーフレームに落とし込む。見た目の前に、設計がある。",
  },
  {
    num: "02",
    title: "FRONT-END",
    desc: "HTML/CSS/JavaScriptを手書きで組む。Figma/XDのデザインデータを受け取り、ピクセル単位の再現性を担保しながら、表示速度・アクセシビリティ・保守性を同時に達成する。GSAP、CSS 3D Transform、ScrollTriggerを用いたインタラクティブな演出も対応。",
  },
  {
    num: "03",
    title: "WORDPRESS",
    desc: "静的サイトのWordPress化、既存テーマのカスタマイズ、Swellを使ったサイト構築。更新しやすさを第一に設計し、クライアントが自分で運用できる状態で納品する。",
  },
  {
    num: "04",
    title: "QUALITY ASSURANCE",
    desc: "納品前にLighthouseスコア、レスポンシブ表示、ブラウザ互換性、リンク切れ、画像最適化を全チェック。公開してから「あれ？」がない状態を作る。納期厳守、進捗は随時共有。",
  },
];

const AIO_STATS = [
  { value: "4,200%+", label: "AI検索セッション増加率\n(2024年4月起点)" },
  { value: "8億人", label: "ChatGPT 週間アクティブユーザー\n(2025年4月時点)" },
  {
    value: "3,175万人",
    label: "国内AI利用者数予測\n(2026年末 / ICT総研)",
  },
];

const AIO_SOLUTIONS = [
  {
    label: "構造化データ（JSON-LD）",
    desc: "AIが「何者で、何ができるか」を正確に読み取れる形で定義",
  },
  {
    label: "セマンティックHTML",
    desc: "文脈ごとにAIへ伝わるマークアップ設計",
  },
  {
    label: "FAQ Schema",
    desc: "検索者の意図に直接答えるQ&A構造を各ページに設計",
  },
  {
    label: "llms.txt",
    desc: "AIクローラーがサイト情報を効率的に読み取るための新標準に対応",
  },
];

const PRICE_OPTIONS = [
  { name: "JS高度演出（GSAP / パララックス / 3D）", amount: "¥30,000〜" },
  { name: "セクション追加（1セクションあたり）", amount: "¥20,000〜" },
  { name: "保守・運用サポート（月額）", amount: "¥15,000〜" },
];

const PROCESS = [
  {
    num: "STEP 01",
    title: "ヒアリング",
    desc: "ご要望・ターゲット層・競合・ご予算・納期をお伺いします。ヒアリングシートをご用意しておりますので、回答いただくだけで方向性が整理されます。",
  },
  {
    num: "STEP 02",
    title: "ラフ提案",
    desc: "ヒアリング内容をもとに、デザインラフを複数パターンご提案します。この段階では費用は発生しません。方向性の合意が取れたら、1案に絞って詳細を詰めていきます。",
  },
  {
    num: "STEP 03",
    title: "デザイン・コーディング",
    desc: "確定した方向性に基づき、デザインとコーディングを進行します。途中経過は随時共有し、修正対応も含めて丁寧にお作りします。",
  },
  {
    num: "STEP 04",
    title: "確認・修正",
    desc: "テスト環境でPC/タブレット/スマートフォン全デバイスの表示を確認いただきます。修正は2回まで標準対応。細部まで納得いただける状態を目指します。",
  },
  {
    num: "STEP 05",
    title: "公開・納品",
    desc: "最終確認後、本番環境に公開します。WordPress案件の場合は管理画面の操作方法もご案内します。公開後の軽微な修正は1週間以内であれば無償対応いたします。",
  },
];

const FAQ = [
  {
    q: "制作期間はどのくらいですか？",
    a: "LP制作で約2〜3週間、コーポレートサイトで4〜6週間が目安です。ページ数や機能の複雑さによって前後しますので、ヒアリング時に正確なスケジュールをご提示します。",
  },
  {
    q: "デザインの修正は何回まで可能ですか？",
    a: "確認・修正フェーズで2回まで標準対応しています。大幅な方向転換が必要な場合は別途ご相談となりますが、ラフ提案の段階で方向性を固めるため、通常は2回以内で完了します。",
  },
  {
    q: "素材（写真・テキスト）の用意が必要ですか？",
    a: "基本的にはご用意いただきますが、素材選定のサポートやストックフォトの提案も可能です。テキストについても、ヒアリング内容をもとにたたき台を作成することができます。",
  },
  {
    q: "納品後のサポートはありますか？",
    a: "公開後1週間以内の軽微な修正は無償対応いたします。継続的なサポートが必要な場合は、月額の保守・運用プラン（¥15,000〜）をご用意しています。",
  },
  {
    q: "WordPress以外のCMSにも対応していますか？",
    a: "現在はWordPressを中心に対応しています。Swell等の国産テーマを使った構築に強みがあります。その他のCMSについてはご相談ください。",
  },
];

export default function ServicePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero FV */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>SERVICE</h1>
          <p className={styles.heroSub}>
            提供するサービスと制作の進め方
          </p>
        </div>
        <span className={styles.heroCornerLeft}>SERVICE</span>
        <span className={styles.heroCornerRight}>SCROLL</span>
      </section>

      {/* How I Work */}
      <section className={styles.howIWork}>
        <div className={styles.howInner}>
          <ScrollReveal>
            <span className={styles.howLabel}>HOW I WORK</span>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className={styles.howGrid}>
              {HOW_I_WORK.map((item) => (
                <div key={item.num} className={styles.howItem}>
                  <span className={styles.howItemNum}>{item.num}</span>
                  <h3 className={styles.howItemTitle}>{item.title}</h3>
                  <p className={styles.howItemDesc}>{item.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* AIO Section */}
      <section className={styles.aio} id="aio">
        <div className={styles.aioInner}>
          <ScrollReveal>
            <div className={styles.aioOpening}>
              <p className={styles.aioLeadLarge}>
                検索の7割が、サイトを訪問せずに完結する時代。
              </p>
              <p className={styles.aioLeadBody}>
                Google検索の約69%がゼロクリックで終了。AI
                Overviewsが表示されるクエリでは、検索1位のクリック率が34.5%低下しています。
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className={styles.aioStats}>
              {AIO_STATS.map((stat) => (
                <div key={stat.value} className={styles.aioStat}>
                  <span className={styles.aioStatValue}>{stat.value}</span>
                  <span className={styles.aioStatLabel}>
                    {stat.label.split("\n").map((line, i) => (
                      <span key={i}>
                        {line}
                        {i === 0 && <br />}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className={styles.aioInsight}>
              <h3 className={styles.aioInsightTitle}>
                SEOだけでは、もう届かない。
              </h3>
              <p className={styles.aioInsightBody}>
                従来のSEO対策で検索1位を取っても、AIが回答を直接生成するため、サイトへの流入が激減する構造に変わりつつあります。これからは「AIに引用される側」に立つ必要があります。
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className={styles.aioSolution}>
              <h3 className={styles.aioSolutionTitle}>
                AI検索に対応した設計を、標準で組み込んでいます。
              </h3>
              <div className={styles.aioList}>
                {AIO_SOLUTIONS.map((item) => (
                  <div key={item.label} className={styles.aioListItem}>
                    <span className={styles.aioListLabel}>{item.label}</span>
                    <span className={styles.aioListDesc}>{item.desc}</span>
                  </div>
                ))}
              </div>
              <p className={styles.aioClosing}>
                まだ対応しているWeb制作者が少ない今こそ、差別化の武器になります。
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Price */}
      <section className={styles.price}>
        <div className={styles.priceInner}>
          <ScrollReveal>
            <h2 className={styles.priceHeading}>PRICE</h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className={styles.pricePackages}>
              <div className={styles.priceCard}>
                <span className={styles.priceCardName}>LP DESIGN</span>
                <p className={styles.priceCardDesc}>
                  静的コーディング / レスポンシブ対応 / 5ページまで
                </p>
                <span className={styles.priceCardAmount}>¥150,000〜</span>
              </div>
              <div className={styles.priceCard}>
                <span className={styles.priceCardName}>WORDPRESS</span>
                <p className={styles.priceCardDesc}>
                  テーマ構築 / カスタマイズ / 管理画面設計
                </p>
                <span className={styles.priceCardAmount}>¥200,000〜</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className={styles.priceOptions}>
              <span className={styles.priceOptionsLabel}>OPTIONS</span>
              <div className={styles.priceOptionsList}>
                {PRICE_OPTIONS.map((option) => (
                  <div key={option.name} className={styles.priceOptionItem}>
                    <span className={styles.priceOptionName}>
                      {option.name}
                    </span>
                    <span className={styles.priceOptionAmount}>
                      {option.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className={styles.priceNote}>
              上記は目安です。ページ数・機能・素材の有無により変動します。お気軽にご相談ください。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Process */}
      <section className={styles.process}>
        <div className={styles.processInner}>
          <ScrollReveal>
            <h2 className={styles.processHeading}>PROCESS</h2>
          </ScrollReveal>

          <div className={styles.processSteps}>
            {PROCESS.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.08}>
                <div className={styles.processStep}>
                  <div className={styles.processStepLeft}>
                    <span className={styles.processStepNum}>{step.num}</span>
                    <h3 className={styles.processStepTitle}>{step.title}</h3>
                  </div>
                  <p className={styles.processStepDesc}>{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faq}>
        <div className={styles.faqInner}>
          <ScrollReveal>
            <h2 className={styles.faqHeading}>FAQ</h2>
          </ScrollReveal>

          <div className={styles.faqList}>
            {FAQ.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <details className={styles.faqItem}>
                  <summary>{item.q}</summary>
                  <p className={styles.faqAnswer}>{item.a}</p>
                </details>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
