import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllWorks, getWorkBySlug } from "@/lib/works";
import WorkDetailClient from "./WorkDetailClient";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  const works = getAllWorks();
  return works.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = getWorkBySlug(slug);
  if (!work) return { title: "Work Not Found — AKASHIKI" };

  return {
    title: `${work.title} — AKASHIKI Works`,
    description: work.description,
  };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const work = getWorkBySlug(slug);
  if (!work) notFound();

  const allWorks = getAllWorks();
  const currentIndex = allWorks.findIndex((w) => w.slug === slug);
  const prevWork = currentIndex > 0 ? allWorks[currentIndex - 1] : null;
  const nextWork =
    currentIndex < allWorks.length - 1 ? allWorks[currentIndex + 1] : null;

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBreadcrumb}>
            <Link href="/works" className={styles.breadcrumbLink}>
              WORKS
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{work.title}</span>
          </div>

          <div className={styles.heroMeta}>
            <span className={styles.tierBadge}>{work.tier}</span>
            {work.category.map((cat) => (
              <span key={cat} className={styles.categoryTag}>
                {cat}
              </span>
            ))}
          </div>

          <h1 className={styles.heroTitle}>{work.title}</h1>
          <p className={styles.heroDesc}>{work.description}</p>
        </div>
      </section>

      {/* Gallery */}
      <WorkDetailClient work={work} />

      {/* Tech Stack */}
      <section className={styles.techSection}>
        <div className={styles.techInner}>
          <span className={styles.sectionLabel}>TECHNOLOGIES</span>
          <div className={styles.techGrid}>
            {work.technologies.map((tech) => (
              <span key={tech} className={styles.techItem}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Description */}
      <section className={styles.descSection}>
        <div className={styles.descInner}>
          <span className={styles.sectionLabel}>ABOUT THIS WORK</span>
          <p className={styles.descText}>{work.description}</p>

          {work.liveUrl && (
            <a
              href={work.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.liveLink}
            >
              VIEW LIVE SITE
              <span className={styles.liveLinkArrow}>&#8599;</span>
            </a>
          )}
        </div>
      </section>

      {/* Prev / Next Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {prevWork ? (
            <Link
              href={`/works/${prevWork.slug}`}
              className={styles.navLink}
            >
              <span className={styles.navDir}>&#8592; PREV</span>
              <span className={styles.navTitle}>{prevWork.title}</span>
            </Link>
          ) : (
            <div />
          )}

          <Link href="/works" className={styles.navAll}>
            ALL WORKS
          </Link>

          {nextWork ? (
            <Link
              href={`/works/${nextWork.slug}`}
              className={`${styles.navLink} ${styles.navLinkRight}`}
            >
              <span className={styles.navDir}>NEXT &#8594;</span>
              <span className={styles.navTitle}>{nextWork.title}</span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </nav>
    </main>
  );
}
