import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import CtaSection from "@/components/home/CtaSection";
import styles from "./page.module.css";

/**
 * /service — AIスペシャリストとしてのサービス（P6・2026-08-27 → P9・2026-08-27 → P10・2026-09-02）
 * 文言は `P10_原稿_三段.md` S10節 → `P9_原稿_top_service_about.md` A節 → `P6_原稿_service_about.md` A節の順が正本（一言一句不変）。
 * P10＝3段階ブロックに「私がすること」を追加（相手の現在地①②③と、トップ #steps の提供の三段を接続）／
 *      第1の柱の段落3を削除（lead・4小項目・PROCESS 06 と三重だったため）／TRUST 03 から AI歴の重複を外した。
 * 構成：FV → できること（第1の柱＝AI導入の設計・教育／第2の柱＝業務の自動化・ツール開発）
 *       → できないこと → AIへの不安（TRUST） → データの扱い → 進め方 → 料金の考え方 → FAQ → CTA
 * 地色はサブページ既定の暗色（--color-primary 系）。白転調は使わない。
 * 演出は SubPageFVAnim / ScrollReveal のみ（filter・blend・3D・vwフォント不使用）。
 */

// /api/og は日本語フォント搭載済み。sub は日本語のまま渡す（URL用に符号化するだけ）
const OG_URL = `/api/og?title=SERVICE&sub=${encodeURIComponent("AI導入支援・業務の自動化")}`;

export const metadata: Metadata = {
  title: "SERVICE — AKASHIKI | AI導入支援・業務の自動化",
  description:
    "墨家 / SUMIYAKA のサービス。御社の仕事のやり方をAIに教え込み、社員の方が自分で回せる状態まで伴走するAI導入の設計・教育と、Excel・CSV・PDFのあいだの転記をなくす業務の自動化・ツール開発。できること・できないこと、AIへの不安に対する答え、進め方、料金の考え方をご案内します。",
  openGraph: {
    images: [{ url: OG_URL, width: 1200, height: 630 }],
  },
};

/* ---------- A-2 できること：第1の柱（AI導入の設計・教育） ---------- */
const EDUCATION_BODY = [
  "最初にやるのは、実際に作業している場所で業務を見ることです。ヒアリングで出てくるのは業務の半分で、残りは机の横で見て初めて分かります。誰が、どのファイルを、どの順で触っているか。そこから、AIに任せる作業と、人に残す判断を切り分けます。",
  "AIには、御社の仕事のやり方を一つずつ教え込みます。一つの作業だけを速くするのではなく、情報を集めてから、揃えて、出すまでの一連の流れをまるごと任せられる形に組みます。一つの作業にだけ入れたAIは、普段はきちんと動いても、想定外のことが起きたときに止まってしまう。止まったときにどう対処するかを自分で考えられる社員の方を育てるところまでが、設計と教育です。",
];

const EDUCATION_POINTS = [
  "実際の現場で、業務の棚卸し",
  "AIに任せる作業と、人に残す判断の切り分け",
  "社員の方と一緒に実装し、手順書に落とす",
  "自分たちで回せるようになるまで伴走",
];

/* 3段階（左に丸数字・右に題字＋補足・①にだけタグ） */
const STAGES = [
  {
    mark: "①",
    title: "社員が、生成AIを個人で使っている",
    sub: "文章の下書き、調べもの、壁打ち",
    tag: "ほとんどの会社",
    mine: "御社専用の道具をお渡しします。AIはまだ入れなくて構いません。パソコンの中だけで動き、データは外に出ません。",
  },
  {
    mark: "②",
    title: "社内のデータや既存システムと繋がった、業務専用のAIがある",
    sub: "見積・請求・台帳の照合などが、御社のファイルで動く",
    mine: "その道具をAIに使わせ、御社の仕事のやり方を教え込みます。「〇〇の作業をお願いします」で終わる状態にします。",
  },
  {
    mark: "③",
    title: "AIがあることを前提に、仕事の進め方そのものを組み直している",
    sub: "人は判断に集中し、集める・揃える・出すはAIが担う",
    mine: "社員の方が自分で作れるところまで教えます。ゴールは、私が要らなくなることです。",
  },
];

/* ---------- A-2 できること：第2の柱（業務の自動化・ツール開発） ---------- */
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

/* ---------- A-3b AIへの不安（TRUST） ---------- */
const TRUST = [
  {
    num: "01",
    title: "AIに丸投げしません",
    desc: "AIが作ったものは、最後に必ず私の目で確認します。数字・宛名・金額のような、間違えてはいけない箇所ほど、人が見ます。",
  },
  {
    num: "02",
    title: "暴走とデータ流出は、専門知識で防ぎます",
    desc: "AIに何を渡し、何を渡さないか。どこまで自動で動かし、どこで止めるか。これは気合ではなく設計の問題で、専門の知識が要ります。セキュリティの知識がないままAIでプログラムを組むと、動いてはいても穴が残ります。私は大手美容外科クリニックで正社員として7年、人体の情報という最上級のプライバシーを扱うシステムとサーバーのデータ保守とセキュリティを担ってきました。高校・大学で体系立てて学んだ情報技術とその経験に、最新のAIを掛け合わせて仕事をしています。",
  },
  {
    num: "03",
    title: "私自身が、そう使っています",
    desc: "自分の仕事でAIを使うときも、同じ基準で線を引いています。医療機関の中で使い始めた頃から、何を渡さないかを先に決めてきました。御社にお渡しするのは、私が自分で守ってきた使い方です。",
  },
  {
    num: "04",
    title: "効率だけでは、測れないものがある",
    desc: "仕事は、人と人との間に生まれます。AIで速くなった分は、お客様と向き合う時間に返す。AIは、そのための道具だと考えています。",
  },
];

/* ---------- A-5 進め方 ---------- */
const PROCESS = [
  { num: "01", title: "ヒアリング", desc: "実際に作業している場所で、業務の流れとお使いのファイルを拝見します" },
  { num: "02", title: "可否の切り分け", desc: "できること・できないことを、理由とともに明示します" },
  { num: "03", title: "お見積り", desc: "削減できる時間を一緒に試算し、金額の根拠をお示しします" },
  { num: "04", title: "構築", desc: "御社のファイルと判断の基準に合わせて、仕組みを作り、AIに教え込みます" },
  { num: "05", title: "検収", desc: "実際のデータで動作をご確認いただきます" },
  { num: "06", title: "運用・定着", desc: "社員の方が使いこなせるようになるまで伴走します" },
];

/* ---------- A-6 料金の目安 ---------- */
const PRICE_ROWS = [
  { label: "月20時間の削減", amount: "年 約50万円" },
  { label: "事務作業の30%を自動化", amount: "年 約120万円" },
  { label: "1人分の業務を丸ごと", amount: "年 約400万円" },
];

/* ---------- A-7 FAQ（可視・JSON-LD 共通の正本・計9問） ----------
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
    q: "AIを入れたいのですが、何から手をつければいいですか？",
    a: "まず、御社がいまどの段階にいるかを一緒に確認します。①社員が個人で使っている ②業務専用のAIがある ③AI前提で仕事を組み直している。ほとんどの会社は①で、それは自然なことです。①から②へ進む最初の一つを、一緒に決めます。",
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
    a: "お渡しする仕組みは、ブラウザの中だけで完結する設計です。データは御社のパソコンから外に出ません。AI導入で外に出す必要があるデータは、何をどこまで出すかを、出す前に必ず一緒に決めます。",
  },
  {
    q: "AIに詳しい社員がいなくても使えますか？",
    a: "使えるようになるまで教えるところまでが、私の仕事です。手順書を作り、社員の方が自分で回せる状態にしてから手を離します。",
  },
  {
    q: "AIが間違えたら、どうなりますか？",
    a: "AIが作ったものは、最後に必ず人の目で確認する工程を組み込みます。数字や金額のように間違えてはいけない箇所ほど、人が見る設計にします。どこまで自動で動かし、どこで止めるかは、最初に一緒に決めます。",
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
            AI導入の設計と教育／業務の自動化・ツール開発
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
              御社の仕事を、AIに教える。
            </h2>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <p className={styles.lead}>
              汎用のAIをそのまま渡しても、御社の業務は動きません。実際のファイルと判断の基準を一つずつ教え込み、社員の方と並んで手を動かし、私がいなくても回る状態まで持っていく。それが、私の仕事の中心です。
            </p>
          </ScrollReveal>

          {/* 第1の柱：AI導入の設計・教育 */}
          <ScrollReveal className={styles.reveal} delay={0.15}>
            <div className={`${styles.pillar} ${styles.pillarFirst}`}>
              <span className={styles.label}>AI導入の設計・教育</span>
              {EDUCATION_BODY.map((para) => (
                <p key={para} className={styles.pillarBody}>{para}</p>
              ))}
              <ul className={styles.pillarList} aria-label="AI導入の設計・教育で行うこと">
                {EDUCATION_POINTS.map((point) => (
                  <li key={point} className={styles.pillarItem}>{point}</li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* 3段階ブロック（第1の柱の中） */}
          <ScrollReveal className={styles.reveal}>
            <div className={styles.stage}>
              <h3 className={styles.stageTitle}>御社は、いまどの段階ですか。</h3>
              <ol className={styles.stageList}>
                {STAGES.map((s) => (
                  <li key={s.mark} className={styles.stageRow}>
                    <span className={styles.stageMark}>{s.mark}</span>
                    <div className={styles.stageBody}>
                      <p className={styles.stageHead}>
                        <span className={styles.stageName}>{s.title}</span>
                        {s.tag && <span className={styles.stageTag}>{s.tag}</span>}
                      </p>
                      <p className={styles.stageSub}>{s.sub}</p>
                      <p className={styles.stageMine}>
                        <span className={styles.stageMineLabel}>私がすること</span>
                        {s.mine}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className={styles.stageClose}>
                ほとんどの会社が①で、それは自然なことです。①のままでも手作業は減らせます。①から②へ進む最初の一つを、一緒に決めるところから始めます。
              </p>
            </div>
          </ScrollReveal>

          {/* 第2の柱：業務の自動化・ツール開発 */}
          <ScrollReveal className={styles.reveal}>
            <div className={styles.pillar}>
              <span className={styles.label}>業務の自動化・ツール開発</span>
              <h3 className={styles.pillarTitle}>
                A社のCSVと、B社のExcelと、C社のPDF請求書を、
                <br className={styles.brPc} />
                御社の管理表の形に揃えます。
              </h3>
              <p className={styles.pillarBody}>
                汎用ソフトに業務を合わせるのではなく、御社がいま実際に使っているファイルに合わせて仕組みを作ります。AIを入れる前でも始められる、一段目の仕事です。
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <ol className={styles.doList}>
              {WHAT_I_DO.map((item) => (
                <li key={item.num} className={styles.doItem}>
                  <span className={styles.doNum}>{item.num}</span>
                  <h4 className={styles.doName}>{item.title}</h4>
                  <p className={styles.doDesc}>{item.desc}</p>
                </li>
              ))}
            </ol>
          </ScrollReveal>

          {/* 見本＝主張のすぐ後ろに現物を置く（2026-09-05 追加）。囲みは .pillarItem と同じ作法 */}
          <ScrollReveal className={styles.reveal} delay={0.15}>
            <div className={styles.sample}>
              <div className={styles.sampleBody}>
                <span className={styles.label}>SAMPLE</span>
                <h4 className={styles.sampleTitle}>お渡しする形のまま、見本を公開しています。</h4>
                <p className={styles.sampleDesc}>
                  首都圏の中堅製造業100社を架空データで調べた、リサーチ・リスト作成の見本です。取得条件の決め方、重複の判定、証跡の残し方、品質チェックの数値まで、実際の納品物と同じ形でご覧いただけます。
                </p>
                <a
                  href="https://sumiyakastudio.github.io/research-list-sample/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.arrowLink} ${styles.sampleLink}`}
                >
                  リサーチ・リスト作成の見本を見る
                  <span className={styles.arrow} aria-hidden="true">→</span>
                </a>
              </div>

              {/* 見本の現物。画像自体もリンクにする（本文のリンクと同じ行き先） */}
              <a
                href="https://sumiyakastudio.github.io/research-list-sample/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sampleShot}
                tabIndex={-1}
                aria-hidden="true"
              >
                <Image
                  src="/service/research-list-sample.webp"
                  alt=""
                  width={1546}
                  height={818}
                  sizes="(max-width: 900px) 100vw, 600px"
                  className={styles.sampleShotImg}
                />
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.2}>
            <Link href="/tools" className={styles.arrowLink}>
              実際に動くツールを触る
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
            <p className={styles.note}>
              Web制作（LP・コーポレートサイト・WordPress）は、
              <Link href="/works" className={styles.inlineLink}>Web制作ページ</Link>
              でご案内しています。
            </p>
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

      {/* ========== A-3b AIへの不安（TRUST）— A-3 と同じ番号付き項目の作法 ========== */}
      <section id="trust" className={styles.section} aria-labelledby="service-trust-title">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>TRUST</span>
            <h2 id="service-trust-title" className={styles.title}>
              AIへの不安に、先にお答えします。
            </h2>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.1}>
            <p className={styles.lead}>
              「AIに任せて大丈夫か」という不安は、正しい不安です。私がどう線を引いているかを、ここに書いておきます。
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.15}>
            <ol className={styles.trustList}>
              {TRUST.map((item) => (
                <li key={item.num} className={styles.trustItem}>
                  <span className={styles.trustNum}>{item.num}</span>
                  <h3 className={styles.trustName}>{item.title}</h3>
                  <p className={styles.trustDesc}>{item.desc}</p>
                </li>
              ))}
            </ol>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.2}>
            <p className={styles.trustClose}>
              ほかに不安に思うことがあれば、最初のご相談でそのままお聞かせください。
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
              <p className={styles.text}>
                AI導入でも、考え方は同じです。御社の環境の中で動く形を優先し、外に出す必要があるデータは、何をどこまで出すかを、出す前に必ず一緒に決めます。
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
              導入事例としてご紹介いただけることが、条件です。
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.reveal} delay={0.3}>
            <h3 className={styles.subTitle}>導入後は、月額の伴走も。</h3>
            <p className={styles.text}>
              仕組みが定着したあとも、月額でお付き合いを続けることができます。新しい業務への広げ方、社員の方からの質問、AIの更新への追従を、引き続き私が見ます。
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
