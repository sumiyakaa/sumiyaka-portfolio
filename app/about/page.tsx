import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import DynamicInkFluid from "@/components/webgl/DynamicInkFluid";
import CtaSection from "@/components/home/CtaSection";
import styles from "./page.module.css";

/**
 * /about — AIスペシャリスト 墨家 / SUMIYAKA の人物ページ（P6・2026-08-27）
 * 文言の正本＝`P9_原稿_top_service_about.md` B節（差分）＋`P6_原稿_service_about.md` B節（B-0〜B-10）。一言一句変えない（改行のみ自由）。
 * 構成：FV（DynamicInkFluid 維持）→ PROFILE → STANCE → TIMELINE → BELIEF →
 *       SCOPE OF WORK → WHAT I DON'T → SKILL SET → CTA（トップ CtaSection をそのまま再利用）
 * モーションは ScrollReveal（＋既存 SubPageFVAnim）のみ。旧 BeliefFigures は不使用。
 */

// /api/og は日本語フォント搭載済み（Geist + Noto Sans JP）。sub は日本語のまま渡す
const OG_SUB = "AI導入の設計と教育 — 墨家 / SUMIYAKA";

export const metadata: Metadata = {
  title: "ABOUT — AKASHIKI | 墨家 / SUMIYAKA",
  description:
    "墨家 / SUMIYAKA — AIスペシャリスト。大手美容外科クリニックで社内・院内SEを7年。止まれば診療が止まるシステムを守ってきた現場の当事者が、御社の仕事をAIに教え、社員の方が回せる状態まで伴走する。経歴・考え方・担当範囲・できないこと。",
  openGraph: {
    images: [
      {
        url: `/api/og?title=ABOUT&sub=${encodeURIComponent(OG_SUB)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

/* ---- B-4 年表 ---- */
const TIMELINE = [
  {
    when: "9歳",
    text: "初めて触れたのは、スマホでもゲームでもなく、パソコンでした。インターネットやプログラミングはどう動いているのか——関心の始まり。",
  },
  {
    when: "15歳",
    text: "ブログブームの中で、WordPressとHTML/CSS/JavaScriptを独学。オリジナルテーマを自作し、サーバー契約からサイト公開まで自力でやり切って以来、「見るだけ」ではなく「作る側」に。手を動かして、約15年になります。",
  },
  {
    when: "専攻",
    text: "高校（情報技術科）から理系大学まで、情報技術を専攻。我流ではなく、体系立てて学んだ土台。22歳で大学卒業。",
  },
  {
    when: "22〜29歳",
    text: "大手美容外科クリニックで社内・院内SEを7年。止まれば診療が止まるシステムの導入・運用・障害対応。",
  },
  {
    when: "2022年12月",
    text: "ChatGPT公開初日に登録。趣味ではなく仕事で。メールの返信案から、スケジュール管理とリマインド、プログラミングの補助へ。",
  },
  {
    when: "29歳〜",
    text: "独立。AI導入の設計・教育、業務効率化の設計と実装、Web制作を、一人で。",
  },
];

/* ---- B-5 信条 ---- */
const BELIEFS = [
  {
    num: "01",
    heading: "主張は、証拠で裏取りする",
    text: "「効果があります」とは言いません。削減できる時間を一緒に試算し、数字で示せることだけを約束します。盛らない。裏取りする。誤りは、自分で訂正する。",
  },
  {
    num: "02",
    heading: "納品して終わりにしない",
    text: "仕組みを渡した日が、始まりです。社員の方が自分で回せるようになるまで教え、手順書を残し、定着してから手を離します。ゴールは、私が要らなくなることです。",
  },
  {
    num: "03",
    heading: "仕組みで速く、手で仕上げる",
    text: "まず動くものを作り、実際のファイルで確かめながらブラッシュアップする。構造から考え、設計で差をつけ、最後は人の目で一つひとつ確認します。AIが作ったものも、例外ではありません。",
  },
];

/* ---- B-7 引き受けないこと ---- */
const DONTS = [
  { name: "手書き書類のスキャン画像の読み取り", desc: "読み取り精度を保証できないため。" },
  { name: "人の判断そのものの置き換え", desc: "例外対応や承認は、人に残すべき仕事です。" },
  { name: "全業務の一括自動化", desc: "効果の大きい作業から、一つずつ確実に。" },
];

/* ---- B-8 スキル ---- */
const SKILLS = [
  {
    num: "01",
    name: "AI導入の設計・教育",
    desc: "御社の仕事をAIに教え込む実装。AIに任せる作業と人に残す判断の切り分け、手順書化、社内で回せるようになるまでの伴走",
  },
  {
    num: "02",
    name: "業務設計・ヒアリング",
    desc: "実際の現場で業務の流れとファイルを見て、転記が生まれる「あいだ」と、AIに任せられる作業を見つけ、順番を決める",
  },
  {
    num: "03",
    name: "業務ツール開発",
    desc: "Excel・CSV・PDFの統合・突合・帳票生成・データ整備。ブラウザの中だけで完結する設計",
  },
  {
    num: "04",
    name: "Web制作",
    desc: "HTML/CSS/JavaScript、React/Next.js、WordPress、STUDIO、Figma。企画から公開まで",
  },
  {
    num: "05",
    name: "AIO・構造化データ",
    desc: "AI検索・AIアシスタントに正確に読まれるための、セマンティックHTMLと構造化データ",
  },
  {
    num: "06",
    name: "システム運用・セキュリティ",
    desc: "院内システムの導入・運用・障害対応を7年。AIに何を渡し、何を渡さないか——止めない運用と、情報を守る設計",
  },
];

export default function AboutPage() {
  return (
    <main className={styles.page}>
      {/* ========== B-1 FV（DynamicInkFluid・読み込み方とフォールバックは現行維持） ========== */}
      <SubPageFVAnim className={styles.fv} targetLetterSpacing="0.08em">
        <DynamicInkFluid />
        <div className={styles.fvBg}>
          <div className={styles.fvGrain} aria-hidden="true" />
        </div>
        <div className={styles.fvContent}>
          {/* 英字は小さな装飾（入場は SubPageFVAnim のエッジ群と同じ後追いフェード） */}
          <span data-fv-edge className={styles.fvLabel} aria-hidden="true">ABOUT</span>
          <h1 data-fv-title className={styles.fvTitle}>
            机上ではなく、<br className={styles.brSp} />現場から。
          </h1>
          <p data-fv-sub className={styles.fvSub}>AI導入の設計と教育 — 墨家 / SUMIYAKA</p>
          <div data-fv-hr className={styles.fvHr} aria-hidden="true" />
        </div>
        <div className={styles.fvEdgeBl}>
          <span data-fv-edge className={styles.fvEdgeText}>ABOUT</span>
        </div>
        <div className={styles.fvEdgeBr}>
          <span data-fv-edge className={styles.fvEdgeText}>SCROLL</span>
        </div>
      </SubPageFVAnim>

      {/* ========== B-2 PROFILE — 写真（トップ Person の額）＋本文の2カラム ========== */}
      <section className={styles.sec} aria-labelledby="about-profile-title">
        <div className={`${styles.inner} ${styles.innerFirst}`}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>PROFILE</span>
          </ScrollReveal>

          <div className={styles.profileGrid}>
            <ScrollReveal as="figure" className={`${styles.reveal} ${styles.portrait}`} delay={0.1}>
              {/* 額＝オフセット罫線＋縁の沈み込み（Person.module.css と同じ作法・CSS filter 不使用） */}
              <div className={styles.portraitFrame}>
                <Image
                  src="/about/profile.webp"
                  alt="SUMIYAKA"
                  width={800}
                  height={766}
                  sizes="(max-width: 767px) 92vw, (max-width: 1279px) 34vw, 420px"
                  className={styles.portraitImg}
                  priority
                />
              </div>
              <figcaption className={styles.portraitCaption}>SUMIYAKA — 墨家</figcaption>
            </ScrollReveal>

            <div className={styles.profileText}>
              <ScrollReveal className={styles.reveal}>
                <h2 id="about-profile-title" className={styles.title}>
                  事故が許されない現場で、システムを7年守ってきました。
                </h2>
                <p className={styles.profileLead}>
                  机上のコンサルティングではなく、「現場の当事者」としての経験がもとになっています。
                </p>
              </ScrollReveal>

              <ScrollReveal className={styles.reveal} delay={0.1}>
                <p className={styles.body}>
                  大手美容外科クリニックで、社内・院内システムの2系統を7年間担当しました。予約・電子カルテ・会計——止まれば診療が止まるシステムの導入・運用・障害対応。人体の情報という最上級のプライバシーを扱う現場で求められたのは、一切の曖昧さを排した正確性と、絶対に止めない安定性でした。
                </p>
              </ScrollReveal>

              <ScrollReveal className={styles.reveal} delay={0.15}>
                <p className={styles.body}>
                  そこで見てきたのは、システムが「無い」現場ではなく、システム同士が「繋がっていない」現場です。だから人が転記し、照合し、月末に半日を失う。技術が好きだから、ではなく、業務が止まる現場を見てきたから——それが、いま私がこの仕事をしている理由です。
                </p>
              </ScrollReveal>

              <ScrollReveal className={styles.reveal} delay={0.2}>
                <p className={styles.body}>
                  会社員として現場の業務を回していた2022年12月、ChatGPTの公開初日に登録しました。趣味ではなく、最初から仕事のためです。医療機関の中で使う以上、何を渡さないかから決めました。メールの返信案を考えてもらうことから始め、スケジュールの管理とリマインド、プログラミングの補助へと、任せる範囲を一つずつ広げていく。仕事の仕組みが根本から変わっていくのを当事者として目の当たりにし、その後29歳で独立。以来、AI導入の設計・教育と、業務効率化の設計と実装を仕事にしています。AIを実務で使い続けて、4年目になります。
                </p>
              </ScrollReveal>

              <ScrollReveal className={styles.reveal} delay={0.25}>
                <div className={styles.profileSns}>
                  <a
                    href="https://github.com/sumiyakastudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.snsLink}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    sumiyakastudio
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ========== B-3 STANCE — このページ最大級の見出し ========== */}
      <section className={styles.sec} aria-labelledby="about-stance-title">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>STANCE</span>
            <h2 id="about-stance-title" className={styles.stanceTitle}>AIを使う側に、立つ。</h2>
          </ScrollReveal>
          <ScrollReveal className={styles.reveal} delay={0.1}>
            <p className={styles.stanceBody}>
              AIにできることはAIに、という流れは、これから加速していきます。その中で仕事は二つに分かれる。AIにできないことをする側か、AIを使う側に立ち、AIと融合して仕事をする側か。私は、後者でありたい。
            </p>
          </ScrollReveal>
          <ScrollReveal className={styles.reveal} delay={0.15}>
            <p className={styles.stanceBody}>
              単なる開発者ではなく、会社の業務がどう回るかを分かった上で技術を当てられること。それが私の価値だと考えています。ツールを渡すだけでは業務は変わらない。だから、AIを使いこなせる人材の育成までを仕事の軸に置いています。
            </p>
          </ScrollReveal>
          {/* P9 B-3 段落3・4（FDE の注釈はここだけ。欧文も和文段落と同じフォント指定のまま） */}
          <ScrollReveal className={styles.reveal} delay={0.2}>
            <p className={styles.stanceBody}>
              海外では、こうした働き方を Forward Deployed Engineer（FDE）と呼び始めています。AIの技術と、お客様ごとの業務の両方を知っていて、現場に入って一緒に作る人。私はそれを、中小企業の規模で、一人でやっています。
            </p>
          </ScrollReveal>
          <ScrollReveal className={styles.reveal} delay={0.25}>
            <p className={styles.stanceBody}>
              それでも、仕事は人と人との間に生まれるものだと思っています。効率だけでは推し量れないもの——顔を合わせて分かること、言葉にならない気遣い、長く付き合うから生まれる信頼。AIで速くなった分は、そこに使いたい。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== B-4 TIMELINE — 縦の年表 ========== */}
      <section className={styles.sec} aria-label="年表">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>TIMELINE</span>
          </ScrollReveal>
          <ScrollReveal className={styles.reveal} delay={0.1}>
            <ol className={styles.tl}>
              {TIMELINE.map((row) => (
                <li key={row.when} className={styles.tlItem}>
                  <span className={styles.tlWhen}>{row.when}</span>
                  <span className={styles.tlMark} aria-hidden="true" />
                  <p className={styles.tlText}>{row.text}</p>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== B-5 BELIEF — 3枚グリッド（現行の骨格を再利用） ========== */}
      <section className={styles.sec} aria-label="信条">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>BELIEF</span>
          </ScrollReveal>
          <div className={styles.beliefGrid}>
            {BELIEFS.map((item, i) => (
              <ScrollReveal key={item.num} className={`${styles.reveal} ${styles.beliefCell}`} delay={i * 0.1}>
                <article className={styles.beliefCard}>
                  <span className={styles.beliefNum}>{item.num}</span>
                  <h3 className={styles.beliefHeading}>{item.heading}</h3>
                  <p className={styles.beliefText}>{item.text}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== B-6 SCOPE OF WORK — 担当範囲 ========== */}
      <section className={styles.sec} aria-labelledby="about-scope-title">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>SCOPE OF WORK</span>
            <h2 id="about-scope-title" className={styles.title}>企画から公開まで、すべて私一人で。</h2>
          </ScrollReveal>
          <ScrollReveal className={styles.reveal} delay={0.1}>
            <p className={styles.body}>
              Web制作も、業務ツールも、企画・設計・デザイン・コーディング・実装・公開まで、すべて私一人で一貫して対応します。分業も外注もありません。Works に掲載しているものは、すべてこの体制で手がけたものです。作品によって担当した範囲が違う、ということはありません。
            </p>
            {/* P9 B-6 追記（body の直後・同じ段落スタイル） */}
            <p className={styles.body}>
              AI導入も同じです。業務の棚卸しから、実装、教育、定着まで、途中で担当が変わることはありません。
            </p>
          </ScrollReveal>

          <div className={styles.scopeSub}>
            <ScrollReveal className={`${styles.reveal} ${styles.scopeCell}`} delay={0.15}>
              <div className={styles.scopeItem}>
                <h3 className={styles.scopeItemHeading}>対応できる媒体</h3>
                <p className={styles.scopeItemText}>
                  静的サイト、WordPress、STUDIO、Figma。制作物はすべて静的データで持っているため、いずれの媒体へも丸ごと移せます。
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal className={`${styles.reveal} ${styles.scopeCell}`} delay={0.2}>
              <div className={styles.scopeItem}>
                <h3 className={styles.scopeItemHeading}>支給データからの実装</h3>
                <p className={styles.scopeItemText}>
                  デザインが既にある場合は、Figma／XD からの実装だけを承ることもできます。これは対応できる範囲の話で、上に書いた実績の担当範囲とは別のものです。
                </p>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal className={styles.reveal} delay={0.25}>
            <Link href="/works" className={styles.moreLink}>
              Web制作の実績を見る <span aria-hidden="true">→</span>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== B-7 WHAT I DON'T — 引き受けないこと（題字に静的な墨の一線） ========== */}
      <section className={styles.sec} aria-labelledby="about-dont-title">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>WHAT I DON&apos;T</span>
            <h2 id="about-dont-title" className={styles.title}>引き受けないこと。</h2>
          </ScrollReveal>
          <ScrollReveal className={styles.reveal} delay={0.1}>
            <ul className={styles.dontList}>
              {DONTS.map((item) => (
                <li key={item.name} className={styles.dontItem}>
                  <span className={styles.dontName}>
                    <span className={styles.dontStrike}>{item.name}</span>
                  </span>
                  <span className={styles.dontDesc}>{item.desc}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
          <ScrollReveal className={styles.reveal} delay={0.15}>
            <div className={styles.principles}>
              <p className={styles.principle}>作っていないものは、載せません。</p>
              <p className={styles.principle}>お客様の仕組みの中身は、公開しません。</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== B-8 SKILL SET — 行グリッド（現行の骨格を再利用） ========== */}
      <section className={styles.sec} aria-label="スキル">
        <div className={styles.inner}>
          <ScrollReveal className={styles.reveal}>
            <span className={styles.label}>SKILL SET</span>
          </ScrollReveal>
          <div className={styles.skillList}>
            {SKILLS.map((item, i) => (
              <ScrollReveal key={item.num} className={styles.reveal} delay={i * 0.06}>
                <div className={styles.skillRow}>
                  <span className={styles.skillNum}>{item.num}</span>
                  <span className={styles.skillName}>{item.name}</span>
                  <span className={styles.skillDesc}>{item.desc}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== B-9 CTA — トップの CtaSection をそのまま再利用（改変なし） ========== */}
      <CtaSection />
    </main>
  );
}
