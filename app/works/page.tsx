import type { Metadata } from "next";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import WorksExplorer from "@/components/works/WorksExplorer";
import { getAllWorks } from "@/lib/works";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "WORKS — AKASHIKI | 制作実績一覧",
  description:
    "LP・コーポレートサイト・WordPress・多言語サイトなど、Web制作の全実績を掲載。カテゴリ・使用技術で絞り込み可能。",
  openGraph: {
    images: [{ url: "/api/og?title=WORKS&sub=%E5%88%B6%E4%BD%9C%E5%AE%9F%E7%B8%BE%E4%B8%80%E8%A6%A7", width: 1200, height: 630 }],
  },
};

export default function WorksPage() {
  const works = getAllWorks();

  return (
    <main>
      {/* Hero — FV維持 */}
      <SubPageFVAnim className={styles.fv}>
        <div className={styles.fvContent}>
          <h1 data-fv-title className={styles.fvTitle}>WORKS</h1>
          <p data-fv-sub className={styles.fvSub}>
            LP / CORPORATE / WORDPRESS / MULTI-LANG —{" "}
            {works.length} Projects
          </p>
          <div data-fv-hr className={styles.fvHr} aria-hidden="true" />
        </div>

        <div className={styles.fvEdgeBl}>
          <span data-fv-edge className={styles.fvEdgeText}>WORKS</span>
        </div>
        <div className={styles.fvEdgeBr}>
          <span data-fv-edge className={styles.fvEdgeText}>SCROLL</span>
        </div>
      </SubPageFVAnim>

      {/* Works Explorer */}
      <section className={styles.content}>
        <WorksExplorer works={works} />
      </section>
    </main>
  );
}
