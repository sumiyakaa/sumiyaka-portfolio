import type { Metadata } from "next";
import ScrollReveal from "@/components/animation/ScrollReveal";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import FVCircuitPattern from "@/components/animation/FVCircuitPattern";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "SERVICE — AKASHIKI | Web制作サービス・料金",
  description:
    "AKASHIKI（灯敷）のWeb制作サービス。LP制作・WordPress構築・AI検索最適化（AIO）を、構成からデザイン、コーディング、公開まで一括対応。料金・制作の流れをご案内します。",
  openGraph: {
    images: [{ url: "/api/og?title=SERVICE&sub=Web%E5%88%B6%E4%BD%9C%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%83%BB%E6%96%99%E9%87%91", width: 1200, height: 630 }],
  },
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

const FAQ_JSONLD = [
  {
    q: "LP制作の料金はいくらですか？",
    a: "LP制作（静的コーディング）は15万円〜、WordPress構築は20万円〜です。ページ数・機能により変動します。",
  },
  {
    q: "制作の流れを教えてください",
    a: "ヒアリング→ラフ提案→デザイン・コーディング→確認・修正→公開の5ステップで進行します。",
  },
  {
    q: "AI検索最適化（AIO）とは何ですか？",
    a: "ChatGPTやPerplexity等のAIアシスタントがサイト情報を正確に読み取れるよう、構造化データやセマンティックHTMLを実装する最適化手法です。",
  },
];

export default function ServicePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_JSONLD.map((item) => ({
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

      {/* ========== FV — 100vh ========== */}
      <SubPageFVAnim className={styles.fv} targetLetterSpacing="0.25em">
        <div className={styles.fvBg}>
          <div className={styles.fvGrain} aria-hidden="true" />
          <div className={styles.fvScanline} aria-hidden="true" />
        </div>

        <FVCircuitPattern />

        <div className={styles.fvContent}>
          <h1 data-fv-title className={styles.fvTitle}>SERVICE</h1>
          <p data-fv-sub className={styles.fvSub}>提供するサービスと制作の進め方</p>
          <div data-fv-hr className={styles.fvHr} aria-hidden="true" />
        </div>

        <div className={styles.fvEdgeBl}>
          <span data-fv-edge className={styles.fvEdgeText}>SERVICE</span>
        </div>
        <div className={styles.fvEdgeBr}>
          <span data-fv-edge className={styles.fvEdgeText}>SCROLL</span>
        </div>
      </SubPageFVAnim>

      {/* ========== 制作スタイル（黒背景） ========== */}
      <section className={styles.style} aria-label="制作スタイル">
        <div className={styles.styleInner}>
          <div className={styles.styleLeft}>
            <ScrollReveal>
              <h2 className={styles.styleTitle}>HOW<br />I<br />WORK</h2>
            </ScrollReveal>
          </div>
          <div className={styles.styleRight}>
            {HOW_I_WORK.map((item, i) => (
              <div key={item.num}>
                <ScrollReveal delay={i * 0.1}>
                  <article className={styles.styleItem}>
                    <span className={styles.styleNum}>{item.num}</span>
                    <h3 className={styles.styleName}>{item.title}</h3>
                    <p className={styles.styleText}>{item.desc}</p>
                  </article>
                </ScrollReveal>
                {i < HOW_I_WORK.length - 1 && (
                  <div className={styles.styleDivider} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== AIO説明（白背景） ========== */}
      <section className={styles.aio} id="aio" aria-label="AI検索最適化">
        <div className={styles.aioInner}>
          <ScrollReveal>
            <h2 className={styles.aioTitle}>AI SEARCH OPTIMIZATION</h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className={styles.aioLead}>
              <mark className={styles.marker}>検索の7割が、サイトを訪問せずに完結する時代。</mark>
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <p className={styles.aioText}>
              Google検索の約69%がゼロクリックで終了。AI Overviewsが表示されるクエリでは、検索1位のクリック率が34.5%低下しています。
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className={styles.aioStats}>
              <div className={styles.aioStat}>
                <span className={styles.aioStatNum}>4,200<span className={styles.aioStatUnit}>%+</span></span>
                <span className={styles.aioStatLabel}>AI検索セッション増加率<br /><small>2024年4月起点</small></span>
              </div>
              <div className={styles.aioStat}>
                <span className={styles.aioStatNum}>8<span className={styles.aioStatUnit}>億人</span></span>
                <span className={styles.aioStatLabel}>ChatGPT 週間アクティブユーザー<br /><small>2025年4月時点</small></span>
              </div>
              <div className={styles.aioStat}>
                <span className={styles.aioStatNum}>3,175<span className={styles.aioStatUnit}>万人</span></span>
                <span className={styles.aioStatLabel}>国内AI利用者数予測<br /><small>2026年末 / ICT総研</small></span>
              </div>
            </div>
          </ScrollReveal>

          <div className={styles.aioBody}>
            <ScrollReveal delay={0.1}>
              <p className={styles.aioText}>
                <mark className={styles.marker}>SEOだけでは、もう届かない。</mark>
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <p className={styles.aioText}>
                従来のSEO対策で検索1位を取っても、AIが回答を直接生成するため、サイトへの流入が激減する構造に変わりつつあります。これからは「AIに引用される側」に立つ必要があります。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className={styles.aioLead}>
                <mark className={styles.marker}>AI検索に対応した設計を、標準で組み込んでいます。</mark>
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <ul className={styles.aioList}>
                {AIO_SOLUTIONS.map((item) => (
                  <li key={item.label} className={styles.aioListItem}>
                    <strong>{item.label}</strong> — {item.desc}
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className={styles.aioText}>
                <mark className={styles.marker}>まだ対応しているWeb制作者が少ない今こそ、差別化の武器になります。</mark>
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========== 料金詳細 + オプション（黒背景） ========== */}
      <section className={styles.price} aria-label="料金">
        <div className={styles.priceInner}>
          <div className={styles.priceHead}>
            <ScrollReveal>
              <h2 className={styles.priceTitle}>PRICE</h2>
            </ScrollReveal>
            <div className={styles.priceHr} aria-hidden="true" />
          </div>

          <div className={styles.priceList}>
            <ScrollReveal delay={0.1}>
              <div className={styles.priceItem}>
                <div className={styles.priceItemTop}>
                  <span className={styles.priceNum}>01</span>
                  <h3 className={styles.priceName}>LP DESIGN</h3>
                  <span className={styles.priceAmount}>¥150,000〜</span>
                </div>
                <p className={styles.priceDesc}>静的コーディング / レスポンシブ対応 / 5ページまで</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className={styles.priceItem}>
                <div className={styles.priceItemTop}>
                  <span className={styles.priceNum}>02</span>
                  <h3 className={styles.priceName}>WORDPRESS</h3>
                  <span className={styles.priceAmount}>¥200,000〜</span>
                </div>
                <p className={styles.priceDesc}>テーマ構築 / カスタマイズ / 管理画面設計</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className={styles.priceItem}>
                <div className={styles.priceItemTop}>
                  <span className={styles.priceNum}>03</span>
                  <h3 className={styles.priceName}>NEXT.JS / WEB APP</h3>
                  <span className={styles.priceAmount}>ASK</span>
                </div>
                <p className={styles.priceDesc}>静的サイトでは実現できない本格Web機能 / 会員制サイト・予約システム・管理画面 / 高速表示・SEO最適化</p>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.25}>
            <div className={styles.priceOption}>
              <p className={styles.priceOptionLabel}>OPTION</p>
              <div className={styles.priceOptionList}>
                {PRICE_OPTIONS.map((opt) => (
                  <div key={opt.name} className={styles.priceOptionItem}>
                    <span className={styles.priceOptionPrefix}>+</span>
                    <span className={styles.priceOptionName}>{opt.name}</span>
                    <span className={styles.priceOptionAmount}>{opt.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className={styles.priceNote}>
              上記は目安です。ページ数・機能・素材の有無により変動します。お気軽にご相談ください。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== 制作の流れ（白背景） ========== */}
      <section className={styles.process} aria-label="制作の流れ">
        <div className={styles.processInner}>
          <div className={styles.processHead}>
            <ScrollReveal>
              <h2 className={styles.processTitle}>PROCESS</h2>
            </ScrollReveal>
            <div className={styles.processHr} aria-hidden="true" />
          </div>

          <div className={styles.processFlow}>
            <div className={styles.processLine} aria-hidden="true" />
            {PROCESS.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.1}>
                <article className={styles.processStep}>
                  <span className={styles.processStepNum}>{step.num}</span>
                  <h3 className={styles.processStepName}>{step.title}</h3>
                  <p className={styles.processStepText}>{step.desc}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
