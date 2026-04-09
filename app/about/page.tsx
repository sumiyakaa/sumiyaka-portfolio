import type { Metadata } from "next";
import ScrollReveal from "@/components/animation/ScrollReveal";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import DynamicInkFluid from "@/components/webgl/DynamicInkFluid";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "ABOUT — AKASHIKI | Web Designer SUMIYAKA",
  description:
    "SUMIYAKA（墨家）— 7年間の医療IT運営経験を経て、Webデザイン・フロントエンド開発に転身。構成からデザイン、コーディング、公開まで一括対応。",
};

const SKILLS = [
  {
    num: "01",
    name: "HTML / CSS",
    desc: "セマンティック構造設計、レスポンシブ、CSS Grid/Flexbox、アニメーション",
  },
  {
    num: "02",
    name: "JAVASCRIPT",
    desc: "GSAP / ScrollTrigger、DOM操作、検索・絞り込み、スライダー実装",
  },
  {
    num: "03",
    name: "WORDPRESS",
    desc: "テーマカスタマイズ、静的サイトのWP化、Swell構築",
  },
  {
    num: "04",
    name: "FIGMA / XD",
    desc: "デザインデータからの忠実なコーディング、デザイン制作",
  },
  {
    num: "05",
    name: "SEO / AIO",
    desc: "構造化データ、セマンティックHTML、AI検索最適化設計",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* ========== FV — 100vh ========== */}
      <SubPageFVAnim className={styles.fv}>
        <DynamicInkFluid />

        <div className={styles.fvBg}>
          <div className={styles.fvGrain} aria-hidden="true" />
          <div className={styles.fvScanline} aria-hidden="true" />
        </div>

        <div className={styles.fvContent}>
          <h1 data-fv-title className={styles.fvTitle}>SUMIYAKA — 墨家</h1>
          <p data-fv-sub className={styles.fvSub}>Web Designer / Front-end Developer</p>
          <div data-fv-hr className={styles.fvHr} aria-hidden="true" />
        </div>

        <div className={styles.fvEdgeBl}>
          <span data-fv-edge className={styles.fvEdgeText}>ABOUT</span>
        </div>
        <div className={styles.fvEdgeBr}>
          <span data-fv-edge className={styles.fvEdgeText}>SCROLL</span>
        </div>
      </SubPageFVAnim>

      {/* ========== 経歴ストーリー（黒背景） ========== */}
      <section className={styles.story} aria-label="経歴">
        <div className={styles.storyInner}>
          <ScrollReveal>
            <p className={styles.storyLead}>7年間、美容外科クリニックでの成長。</p>
          </ScrollReveal>

          <div className={styles.storyBody}>
            <ScrollReveal delay={0.1}>
              <p className={styles.storyParagraph}>
                院内サーバーの構築と管理。医療情報と個人情報を扱う現場で求められたのは、一切の曖昧さを排した正確性と、絶対に止めない安定性。予約導線の設計見直し、業務マニュアルの体系化、症例写真データの管理基盤構築、広告掲載内容の精査——運営の根幹を裏側から支え続ける7年間でした。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <p className={styles.storyHighlight}>
                「仕組みで解決する」という思考回路。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className={styles.storyParagraph}>
                今の仕事に転じてからも、その回路はそのまま動いています。Figma/XDからの忠実なコーディング、LP制作、WordPress構築、既存サイトの修正・改善。構成からデザイン、コーディング、公開まで一括で対応できる体制で、レスポンシブ対応やJavaScript実装（アニメーション、スライダー、検索・絞り込み機能等）も含め、表層から構造まで一貫して手がけています。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <p className={styles.storyParagraph}>
                見た目を再現するだけでは足りない。表示速度、アクセシビリティ、保守性——運用まで見据えた、実務に耐えるWebサイトを作ること。それが私の仕事です。
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========== 信条・こだわり（白背景） ========== */}
      <section className={styles.belief} aria-label="信条・こだわり">
        <div className={styles.beliefInner}>
          <ScrollReveal>
            <article className={styles.beliefItem}>
              <h2 className={styles.beliefHeading}>再現ではなく、解釈する</h2>
              <p className={styles.beliefText}>デザインデータの意図を正確に汲み取り、画面上で最も効果的に機能する形に落とし込む。ピクセル単位の再現性と、その先にある「なぜこの配置なのか」への理解を両立させる。</p>
            </article>
          </ScrollReveal>

          <div className={styles.beliefDivider} aria-hidden="true" />

          <ScrollReveal delay={0.1}>
            <article className={styles.beliefItem}>
              <h2 className={styles.beliefHeading}>納品して終わりにしない</h2>
              <p className={styles.beliefText}>表示速度、更新のしやすさ、アクセシビリティ。サイトが公開された後に何が起きるかまで考えて作る。丁寧なヒアリングと現実的なスケジュール提案で、納期を守り抜く。</p>
            </article>
          </ScrollReveal>

          <div className={styles.beliefDivider} aria-hidden="true" />

          <ScrollReveal delay={0.2}>
            <article className={styles.beliefItem}>
              <h2 className={styles.beliefHeading}>仕組みで速く、手で仕上げる</h2>
              <p className={styles.beliefText}>効率的な制作基盤を持つことと、一つひとつの成果物に手をかけることは両立する。構造から考え、設計で差別化し、最後のピクセルまで人が確認する。量産品は作らない。</p>
            </article>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== スキルセット Terminal Index（黒背景） ========== */}
      <section className={styles.skill} aria-label="スキルセット">
        <div className={styles.skillInner}>
          <div className={styles.skillHead}>
            <ScrollReveal>
              <h2 className={styles.skillTitle}>SKILL SET</h2>
            </ScrollReveal>
            <div className={styles.skillHr} aria-hidden="true" />
          </div>

          <div className={styles.skillList}>
            {SKILLS.map((item, i) => (
              <ScrollReveal key={item.num} delay={i * 0.08}>
                <div className={styles.skillRow}>
                  <span className={styles.skillNum}>{item.num}</span>
                  <span className={styles.skillName}>{item.name}</span>
                  <span className={styles.skillDesc}>{item.desc}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* ========== SNS（スキルセットと連続） ========== */}
        <div className={styles.sns} aria-label="SNS">
          <div className={styles.snsInner}>
            <div className={styles.snsDivider} aria-hidden="true" />
            <ScrollReveal>
              <p className={styles.snsLabel}>SOCIAL</p>
              <div className={styles.snsLinks}>
                <a href="https://x.com/sumiyakaaa" target="_blank" rel="noopener noreferrer" className={styles.snsLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @sumiyakaaa
                </a>
                <a href="https://github.com/sumiyakaa" target="_blank" rel="noopener noreferrer" className={styles.snsLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                  sumiyakaa
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
