import type { Metadata } from "next";
import ScrollReveal from "@/components/animation/ScrollReveal";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import WorksGrid from "@/components/works/WorksGrid";
import { getAllWorks, getAllCategories, getAllTechnologies } from "@/lib/works";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "WORKS — AKASHIKI | 制作実績一覧",
  description:
    "LP・コーポレートサイト・WordPress・多言語サイトなど、Web制作の全実績を掲載。カテゴリ・使用技術で絞り込み可能。",
};

export default function WorksPage() {
  const works = getAllWorks();
  const categories = getAllCategories();
  const technologies = getAllTechnologies();

  return (
    <main>
      {/* Hero */}
      <SubPageFVAnim className={styles.hero}>
        <div className={styles.heroContent}>
          <span data-fv-sub className={styles.heroLabel}>All Projects</span>
          <h1 data-fv-title className={styles.heroTitle}>WORKS</h1>
          <p data-fv-sub className={styles.heroSub}>
            LP / CORPORATE / WORDPRESS / MULTI-LANG
            <br />
            <span className={styles.heroCount}>
              {works.length}
              <span className={styles.heroCountLabel}> PROJECTS</span>
            </span>
          </p>
        </div>

        <span data-fv-edge className={styles.heroCornerLeft}>WORKS</span>
        <span data-fv-edge className={styles.heroCornerRight}>SCROLL</span>
      </SubPageFVAnim>

      {/* Works Content */}
      <section className={styles.content}>
        <div className={styles.contentInner}>
          <WorksGrid
            works={works}
            categories={categories}
            technologies={technologies}
          />
        </div>
      </section>
    </main>
  );
}
