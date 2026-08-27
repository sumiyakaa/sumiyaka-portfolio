import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import CtaSection from "@/components/home/CtaSection";
import styles from "./page.module.css";

/**
 * /service — AIスペシャリストとしてのサービス（P6・2026-08-27）
 * 文言は契約ファイル `P6_原稿_service_about.md` A節が正本（一言一句不変）。
 * 構成：FV → できること → できないこと → データの扱い → 進め方 → 料金の考え方 → FAQ → CTA
 * 地色はサブページ既定の暗色（--color-primary 系）。白転調は使わない。
 * 演出は SubPageFVAnim / ScrollReveal のみ（filter・blend・3D・vwフォント不使用）。
 */

// /api/og は日本語フォント搭載済み。sub は日本語のまま渡す（URL用に符号化するだけ）
const OG_URL = `/api/og?title=SERVICE&sub=${encodeURIComponent("業務の自動化・AI導入支援")}`;

export const metadata: Metadata = {
  title: "SERVICE — AKASHIKI | 業務の自動化・AI導入支援",
  description:
    "墨家 / SUMIYAKA のサービス。Excel・CSV・PDFのあいだで生まれる転記をなくす業務の自動化・ツール開発と、AIを使いこなせる人材の育成までを含むAI導入の設計・教育。できること・できないこと、進め方、料金の考え方をご案内します。",
  openGraph: {
    images: [{ url: OG_URL, width: 1200, height: 630 }],
  },
};

/* ---------- A-2 できること ---------- */
const WHAT_I_DO = [
  {
    num: "01",
    title: "統合・突合",
    desc: "形式がバラバラな複数のExcel・CSVを1つの管理表にまとめ、金額や件数の食い違いも自動で照合します。",
  },
  {
    num: "02",
    title: "帳票の一括作成",
    desc: "Excelの台帳から、請求書・見積書などのPDFを一括で作成します。",
  },
  {
    num: "03",
    title: "データの下ごしらえ",
    desc: "会社名の表記ゆれ、重複、住所の分割など、人手で直しているデータの掃除を自動化します。",
  },
];

const EDUCATION_POINTS = [
  "業務の棚卸しと、AIの使いどころの設計",
  "社員の方と一緒に実装",
  "手順書に落とす",
  "定着するまで伴走",
];

/* ---------- A-3 できないこと ---------- */
const WHAT_I_DONT = [
  {
    title: "手書き書類のスキャン画像の読み取り",
    desc: "読み取り精度を保証できないため、お請けしていません。",
  },
  {
    title: "人の判断そのものの置き換え",
    desc: "例外対応や承認の判断は、人に残すべき仕事です。",
  },
  {
    title: "全業務の一括自動化",
    desc: "一度にすべては失敗のもとです。効果の大きい作業から、一つずつ確実に進めます。",
  },
];

/* ---------- A-5 進め方 ---------- */
const PROCESS = [
  { num: "01", title: "ヒアリング", desc: "実際の業務の流れと、お使いのファイルを拝見します" },
  { num: "02", title: "可否の切り分け", desc: "できること・できないことを、理由とともに明示します" },
  { num: "03", title: "お見積り", desc: "削減できる時間を一緒に試算し、金額の根拠をお示しします" },
  { num: "04", title: "構築", desc: "御社のファイルに合わせて仕組みを作ります" },
  { num: "05", title: "検収", desc: "実際のデータで動作をご確認いただきます" },
  { num: "06", title: "運用・定着", desc: "社内の方が使いこなせるようになるまで伴走します" },
];

/* ---------- A-6 料金の目安 ---------- */
const PRICE_ROWS = [
  { label: "月20時間の削減", amount: "年 約50万円" },
  { label: "事務作業の30%を自動化", amount: "年 約120万円" },
  { label: "1人分の業務を丸ごと", amount: "年 約400万円" },
];

/* ---------- A-7 FAQ（可視・JSON-LD 共通の正本） ----------
   link を持つ項目は、可視側で回答文中の phrase を Link 化する。
   JSON-LD 側は a のテキストのみ（リンク無し）。 */
type FaqItem = {
  q: string;
  a: string;
  link?: { phrase: string; href: string };
};

const FAQ: FaqItem[] = [
  {
    q: "何から相談すればいいですか？",
    a: "いま手作業でやっていることを、そのままお聞かせください。「毎月この表を作るのに半日かかる」で十分です。お使いのファイルを拝見しながら、できる・できないを切り分けます。",
  },
  {
    q: "小さな会社でも頼めますか？",
    a: "はい。システム同士が繋がっておらず、人が転記している規模の会社ほど、効果が出やすい仕事です。",
  },
  {
    q: "いま使っているExcelのままで大丈夫ですか？",
    a: "はい。汎用ソフトに業務を合わせるのではなく、御社のファイルに合わせて仕組みを作ります。新しいシステムの導入を前提にはしません。",
  },
  {
    q: "データは外部に送られますか？",
    a: "お渡しする仕組みは、ブラウザの中だけで完結する設計です。データは御社のパソコンから外に出ません。",
  },
  {
    q: "AIに詳しい社員がいなくても使えますか？",
    a: "使えるようになるまで教えるところまでが、私の仕事です。手順書を作り、社員の方が自分で回せる状態にしてから手を離します。",
  },
  {
    q: "料金はどのように決まりますか？",
    a: "削減できる時間と人件費を一緒に試算し、削減額に見合う範囲でお見積りします。初回のお取引に限り、導入事例としてご紹介いただけることを条件に、優待価格をご用意しています。",
  },
  {
    q: "Web制作も頼めますか？",
    a: "はい。LP・コーポレートサイト・WordPressの制作は、企画から公開まで一人で対応します。実績と料金はWeb制作ページをご覧ください。",
    link: { phrase: "Web制作ページ", href: "/works" },
  },
];

/** 回答文中の phrase を Link 化して返す（文言は不変・リンクを被せるだけ） */
function renderAnswer(item: FaqItem) {
  if (!item.link) return item.a;
  const idx = item.a.indexOf(item.link.phrase);
  if (idx < 0) return item.a;
  const before = item.a.slice(0, idx);
  const after = item.a.slice(idx + item.link.phrase.length);
  return (
    <>
      {before}
      <Link href={item.link.href} className={styles.inlineLink}>
        {item.link.phrase}
      </Link>
      {after}
    </>
  );
}

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
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ========== A-1 FV — 100vh（/tools と同じ作法・回路モチーフは使わない） ========== */}
      <SubPageFVAnim className={styles.fv} targetLetterSpacing="0.1em">
        <div className={styles.fvBg}>
          <div className={styles.fvGrain} aria-hidden="true" />
          <div className={styles.fvScanline} aria-hidden="true" />
        </div>

        <div className={styles.fvContent}>
          <span data-fv-edge className={styles.fvLabel} aria-hidden="true">SERVICE</span>
          <h1 data-fv-title className={styles.fvTitle}>
            業務を、
            <br className={styles.brSp} />
            仕組みに変える。
          </h1>
          <p data-fv-sub className={styles.fvSub}>
            業務の自動化・ツール開発／AI導入の設計と教育
          </p>
          <div data-fv-hr className={styles.fvHr} aria-hidden="true" />
        </div>

        <div className={styles.fvEdgeBl}>
          <span data-fv-edge className={styles.fvEdgeText}>SERVICE</span>
        </div>
        <div className={styles.fvEdgeBr}>
          <span data-fv-edge className={styles.fvEdgeText}>SCROLL</span>
        </div>
      </SubPageFVAnim>

      {/* ========== A-2 できること（WHAT I DO） ========== */}
      <section
        id="what-i-do"
        className={`${styles.section} ${styles.sectionFirst}`}
        aria-labelledby="service-do-title"
      >
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>WHAT I DO</span>
            <h2 id="service-do-title" className={styles.title}>
              A社のCSVと、B社のExcelと、C社のPDF請求書を、
              <br className={styles.brPc} />
              御社の管理表の形に揃えます。
            </h2>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <p className={styles.lead}>
              汎用ソフトに業務を合わせるのではなく、御社がいま実際に使っているファイルに合わせて仕組みを作ります。
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.15}>
            <ol className={styles.doList}>
              {WHAT_I_DO.map((item) => (
                <li key={item.num} className={styles.doItem}>
                  <span className={styles.doNum}>{item.num}</span>
                  <h3 className={styles.doName}>{item.title}</h3>
                  <p className={styles.doDesc}>{item.desc}</p>
                </li>
              ))}
            </ol>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.2}>
            <Link href="/tools" className={styles.arrowLink}>
              実際に動くツールを触る
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
          </ScrollReveal>

          {/* 第2の柱：AI導入の設計・教育 */}
          <ScrollReveal className={styles.reveal}>
            <div className={styles.pillar}>
              <span className={styles.label}>AI導入の設計・教育</span>
              <h3 className={styles.pillarTitle}>仕組みを、回せる状態で残す。</h3>
              <p className={styles.pillarBody}>
                ツールをお渡しするだけでは、業務は変わりません。どの作業をAIに任せ、どこに人の判断を残すかを一緒に決め、社員の方と並んで手を動かし、手順書に落とし、使いこなせるようになるまで伴走します。ただツールを渡すだけでなく、AIを使いこなせる人材の育成までを主とした活動です。
              </p>
              <ul className={styles.pillarList} aria-label="AI導入の設計・教育で行うこと">
                {EDUCATION_POINTS.map((point) => (
                  <li key={point} className={styles.pillarItem}>{point}</li>
                ))}
              </ul>
              <p className={styles.note}>
                Web制作（LP・コーポレートサイト・WordPress）は、
                <Link href="/works" className={styles.inlineLink}>Web制作ページ</Link>
                でご案内しています。
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== A-3 できないこと（WHAT I DON'T） ========== */}
      <section id="what-i-dont" className={styles.section} aria-labelledby="service-dont-title">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>WHAT I DON&apos;T</span>
            <h2 id="service-dont-title" className={styles.title}>
              先に、できないことをお伝えします。
            </h2>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <p className={styles.lead}>「何でも自動化できます」とは、言いません。</p>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.15}>
            <ul className={styles.dontList}>
              {WHAT_I_DONT.map((item) => (
                <li key={item.title} className={styles.dontItem}>
                  {/* 題字にトップFVと同じ「墨の一線」を静的に添える（::after・水平） */}
                  <h3 className={styles.dontName}>
                    <span className={styles.dontStrike}>{item.title}</span>
                  </h3>
                  <p className={styles.dontDesc}>{item.desc}</p>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.2}>
            <p className={styles.dontClose}>
              できる・できないは、最初のヒアリングで正直に切り分けて、理由とともにお伝えします。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== A-4 データの扱い（DATA） ========== */}
      <section id="data" className={styles.section} aria-labelledby="service-data-title">
        <div className={`${styles.inner} ${styles.dataGrid}`}>
          <div className={styles.dataText}>
            <ScrollReveal className={styles.reveal}>
              <span className={styles.label}>DATA</span>
              <h2 id="service-data-title" className={styles.title}>
                データはお預かりしません。
              </h2>
            </ScrollReveal>
            <ScrollReveal className={styles.reveal} delay={0.1}>
              <p className={styles.lead}>
                お渡しする仕組みは、ブラウザの中だけで完結する設計。データは御社のパソコンから外に出ません。
              </p>
              <p className={styles.text}>
                外部のサーバーにデータを送らないため、顧客名簿や売上データもそのまま安心してお使いいただけます。導入前のお試しも、実際のファイルでその場でご確認いただけます。
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal className={styles.reveal} delay={0.15}>
            <div className={styles.stat}>
              <p className={styles.statNum}>30.0%</p>
              <p className={styles.statLabel}>
                クラウドを導入しない理由 第2位「セキュリティ面の不安」（第1位はコスト）
              </p>
              <p className={styles.statNote}>
                この不安には、説明ではなく「データが外に出ない設計」そのもので答えます。
              </p>
              <p className={styles.statSrc}>
                マネーフォワード調べ（2024年3月・法人事業者608名対象）
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== A-5 進め方（PROCESS） ========== */}
      <section id="process" className={styles.section} aria-labelledby="service-process-title">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>PROCESS</span>
            <h2 id="service-process-title" className={styles.title}>進め方</h2>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <ol className={styles.stepList}>
              {PROCESS.map((step) => (
                <li key={step.num} className={styles.step}>
                  <span className={styles.stepNum}>{step.num}</span>
                  <h3 className={styles.stepName}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </li>
              ))}
            </ol>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.15}>
            <p className={styles.band}>
              ツールをお渡しするだけでなく、AIを使いこなせる人材の育成までを主とした活動をしています。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== A-6 料金の考え方（PRICING） ========== */}
      <section id="pricing" className={styles.section} aria-labelledby="service-pricing-title">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>PRICING</span>
            <h2 id="service-pricing-title" className={styles.title}>
              「いくらかかるか」より先に、
              <br className={styles.brPc} />
              「いくら浮くか」。
            </h2>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <p className={styles.lead}>
              いま作業にかかっている時間と人件費を一緒に試算し、削減額に見合う範囲でお見積りします。
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.15}>
            <h3 className={styles.subTitle}>目指すのは、「新しく採用しなくても回る」状態。</h3>
            <p className={styles.text}>
              浮いた時間で、いまいらっしゃる方が、より価値のある仕事に移れるようにします。
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.2}>
            <ul className={styles.priceTable} aria-label="削減額の目安">
              {PRICE_ROWS.map((row) => (
                <li key={row.label} className={styles.priceRow}>
                  <span className={styles.priceLabel}>{row.label}</span>
                  <span className={styles.priceLeader} aria-hidden="true" />
                  <span className={styles.priceArrow} aria-hidden="true">→</span>
                  <span className={styles.priceAmount}>{row.amount}</span>
                </li>
              ))}
            </ul>
            <p className={styles.priceTableNote}>削減額の目安（人件費換算）</p>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.25}>
            <h3 className={styles.subTitle}>初回のお取引に限り、優待価格をご用意しています。</h3>
            <p className={styles.text}>
              導入事例としてご紹介いただけることを条件に、初回のみの優待です。
            </p>
            <p className={styles.note}>
              Web制作の料金は、
              <Link href="/works#price" className={styles.inlineLink}>Web制作ページ</Link>
              の料金表をご覧ください。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== A-7 よくある質問（FAQ）— ネイティブ details/summary ========== */}
      <section id="faq" className={styles.section} aria-labelledby="service-faq-label">
        <div className={styles.inner}>
          {/* 契約ファイル A-7 に h2 文言は無い（ラベル FAQ のみ）＝文言を足さない */}
          <ScrollReveal className={styles.reveal}>
            <span id="service-faq-label" className={`${styles.label} ${styles.labelSolo}`}>FAQ</span>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <div className={styles.faqList}>
              {FAQ.map((item, i) => (
                <details key={item.q} className={styles.faqItem}>
                  <summary className={styles.faqQ}>
                    <span className={styles.faqNum}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.faqQText}>{item.q}</span>
                  </summary>
                  <div className={styles.faqA}>
                    <p className={styles.faqAText}>{renderAnswer(item)}</p>
                  </div>
                </details>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== A-8 CTA — トップと同一コンポーネントをそのまま再利用 ========== */}
      <CtaSection />
    </main>
  );
}
