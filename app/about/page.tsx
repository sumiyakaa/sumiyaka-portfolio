import type { Metadata } from "next";
import ScrollReveal from "@/components/animation/ScrollReveal";
import DynamicInkFluid from "@/components/webgl/DynamicInkFluid";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "ABOUT — AKASHIKI | Web Designer & Developer",
  description:
    "Webデザイン・フロントエンド開発。構成からデザイン、コーディング、公開まで一括対応。LP制作・WordPress構築を中心に、運用まで見据えた実務に耐えるWebサイトを制作します。",
};

const BELIEFS = [
  {
    num: "01",
    title: "再現ではなく、解釈する",
    desc: "デザインデータの意図を正確に汲み取り、画面上で最も効果的に機能する形に落とし込む。ピクセル単位の再現性と、その先にある「なぜこの配置なのか」への理解を両立させる。",
  },
  {
    num: "02",
    title: "納品して終わりにしない",
    desc: "表示速度、更新のしやすさ、アクセシビリティ。サイトが公開された後に何が起きるかまで考えて作る。丁寧なヒアリングと現実的なスケジュール提案で、納期を守り抜く。",
  },
  {
    num: "03",
    title: "仕組みで速く、手で仕上げる",
    desc: "効率的な制作基盤を持つことと、一つひとつの成果物に手をかけることは両立する。構造から考え、設計で差別化し、最後のピクセルまで人が確認する。量産品は作らない。",
  },
];

const SKILLS = [
  {
    name: "HTML / CSS",
    desc: "セマンティック構造設計、レスポンシブ、CSS Grid/Flexbox、アニメーション",
  },
  {
    name: "JAVASCRIPT",
    desc: "GSAP / ScrollTrigger、DOM操作、検索・絞り込み、スライダー実装",
  },
  {
    name: "WORDPRESS",
    desc: "テーマカスタマイズ、静的サイトのWP化、Swell構築",
  },
  {
    name: "FIGMA / XD",
    desc: "デザインデータからの忠実なコーディング、デザイン制作",
  },
  {
    name: "SEO / AIO",
    desc: "構造化データ、セマンティックHTML、AI検索最適化設計",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero FV */}
      <section className={styles.hero}>
        <DynamicInkFluid />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>ABOUT</h1>
          <p className={styles.heroSub}>Web Designer / Front-end Developer</p>
        </div>

        <span className={styles.heroCornerLeft}>ABOUT</span>
        <span className={styles.heroCornerRight}>SCROLL</span>
      </section>

      {/* Career Story */}
      <section className={styles.career}>
        <div className={styles.careerInner}>
          <ScrollReveal>
            <p className={styles.careerLead}>
              7年間、美容外科クリニックでの成長。
            </p>
          </ScrollReveal>

          <div className={styles.careerBody}>
            <ScrollReveal delay={0.1}>
              <p>
                院内サーバーの構築と管理。医療情報と個人情報を扱う現場で求められたのは、一切の曖昧さを排した正確性と、絶対に止めない安定性。予約導線の設計見直し、業務マニュアルの体系化、症例写真データの管理基盤構築、広告掲載内容の精査——運営の根幹を裏側から支え続ける7年間でした。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <p className={styles.careerHighlight}>
                「仕組みで解決する」という思考回路。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p>
                今の仕事に転じてからも、その回路はそのまま動いています。Figma/XDからの忠実なコーディング、LP制作、WordPress構築、既存サイトの修正・改善。構成からデザイン、コーディング、公開まで一括で対応できる体制で、レスポンシブ対応やJavaScript実装（アニメーション、スライダー、検索・絞り込み機能等）も含め、表層から構造まで一貫して手がけています。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <p>
                見た目を再現するだけでは足りない。表示速度、アクセシビリティ、保守性——運用まで見据えた、実務に耐えるWebサイトを作ること。それが私の仕事です。
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Beliefs / Philosophy — White Background for Contrast */}
      <section className={styles.beliefs}>
        <div className={styles.beliefsInner}>
          <ScrollReveal>
            <span className={styles.beliefsLabel}>BELIEFS</span>
          </ScrollReveal>

          <div className={styles.beliefsGrid}>
            {BELIEFS.map((item, i) => (
              <ScrollReveal key={item.num} delay={i * 0.1}>
                <div className={styles.beliefItem}>
                  <span className={styles.beliefNum}>{item.num}</span>
                  <h3 className={styles.beliefTitle}>{item.title}</h3>
                  <p className={styles.beliefDesc}>{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Skill Set */}
      <section className={styles.skills}>
        <div className={styles.skillsInner}>
          <ScrollReveal>
            <h2 className={styles.skillsHeading}>SKILL SET</h2>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className={styles.skillsGrid}>
              {SKILLS.map((skill) => (
                <div key={skill.name} className={styles.skillItem}>
                  <h3 className={styles.skillName}>{skill.name}</h3>
                  <p className={styles.skillDesc}>{skill.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Social */}
      <section className={styles.social}>
        <ScrollReveal>
          <span className={styles.socialLabel}>SOCIAL</span>
          <div className={styles.socialLinks}>
            <a
              href="https://x.com/sumiyakaaa"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              X (Twitter)
            </a>
            <a
              href="https://github.com/sumiyakaa"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              GitHub
            </a>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
