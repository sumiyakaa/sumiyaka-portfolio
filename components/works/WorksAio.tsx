import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./WorksAio.module.css";

/**
 * WorksAio — AI検索最適化（AIO）セクション
 *
 * `/service` のAIOセクションを、Web制作ページ（`/works`）へ載せるための
 * 自己完結コンポーネント。propsは取らず、内容は固定。
 * ページ内の一セクションとして置かれるため、最上位の見出しは h2。
 */

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

const AIO_STATS = [
  {
    num: "4,200",
    unit: "%+",
    label: "AI検索セッション増加率",
    note: "2024年4月起点",
  },
  {
    num: "8",
    unit: "億人",
    label: "ChatGPT 週間アクティブユーザー",
    note: "2025年4月時点",
  },
  {
    num: "3,175",
    unit: "万人",
    label: "国内AI利用者数予測",
    note: "2026年末 / ICT総研",
  },
];

export default function WorksAio() {
  return (
    <section
      className={styles.worksAio}
      id="works-aio"
      aria-label="AI検索最適化"
    >
      <div className={styles.worksAioInner}>
        <ScrollReveal className={styles.worksAioReveal}>
          <h2 className={styles.worksAioTitle}>AI SEARCH OPTIMIZATION</h2>
        </ScrollReveal>

        <ScrollReveal className={styles.worksAioReveal} delay={0.1}>
          <p className={styles.worksAioLead}>
            <mark className={styles.worksAioMarker}>
              検索の7割が、サイトを訪問せずに完結する時代。
            </mark>
          </p>
        </ScrollReveal>

        <ScrollReveal className={styles.worksAioReveal} delay={0.15}>
          <p className={styles.worksAioText}>
            Google検索の約69%がゼロクリックで終了。AI Overviewsが表示されるクエリでは、検索1位のクリック率が34.5%低下しています。
          </p>
        </ScrollReveal>

        <ScrollReveal className={styles.worksAioReveal} delay={0.2}>
          <div className={styles.worksAioStats}>
            {AIO_STATS.map((stat) => (
              <div key={stat.label} className={styles.worksAioStat}>
                <span className={styles.worksAioStatNum}>
                  {stat.num}
                  <span className={styles.worksAioStatUnit}>{stat.unit}</span>
                </span>
                <span className={styles.worksAioStatLabel}>
                  {stat.label}
                  <br />
                  <small>{stat.note}</small>
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <div className={styles.worksAioBody}>
          <ScrollReveal className={styles.worksAioReveal} delay={0.1}>
            <p className={styles.worksAioText}>
              <mark className={styles.worksAioMarker}>
                SEOだけでは、もう届かない。
              </mark>
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.worksAioReveal} delay={0.15}>
            <p className={styles.worksAioText}>
              従来のSEO対策で検索1位を取っても、AIが回答を直接生成するため、サイトへの流入が激減する構造に変わりつつあります。これからは「AIに引用される側」に立つ必要があります。
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.worksAioReveal} delay={0.2}>
            <p className={styles.worksAioLead}>
              <mark className={styles.worksAioMarker}>
                AI検索に対応した設計を、標準で組み込んでいます。
              </mark>
            </p>
          </ScrollReveal>

          <ScrollReveal className={styles.worksAioReveal} delay={0.25}>
            <ul className={styles.worksAioList}>
              {AIO_SOLUTIONS.map((item) => (
                <li key={item.label} className={styles.worksAioListItem}>
                  <strong>{item.label}</strong> — {item.desc}
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal className={styles.worksAioReveal} delay={0.3}>
            <p className={styles.worksAioText}>
              <mark className={styles.worksAioMarker}>
                まだ対応しているWeb制作者が少ない今こそ、差別化の武器になります。
              </mark>
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
