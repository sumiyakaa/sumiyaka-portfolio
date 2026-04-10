import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllWorks, getWorkBySlug } from "@/lib/works";
import {
  getDetailMetaFacts,
  getDetailDesignFacts,
  getDetailChipGroups,
  getDetailBooleanFlags,
  hasDetailSummary,
  hasDetailChallenge,
  hasDetailDesignSection,
} from "@/lib/detail";
import ScrollReveal from "@/components/animation/ScrollReveal";
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

  const ogImg = work.thumbnail
    ? `/api/og?title=${encodeURIComponent(work.title)}&sub=${encodeURIComponent(work.category.join(" / "))}&img=${encodeURIComponent(`https://akashiki.com${work.thumbnail}`)}`
    : `/api/og?title=${encodeURIComponent(work.title)}&sub=${encodeURIComponent(work.category.join(" / "))}`;

  return {
    title: `${work.title} — AKASHIKI Works`,
    description: work.description,
    openGraph: {
      images: [{ url: ogImg, width: 1200, height: 630 }],
    },
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

  const metaFacts = getDetailMetaFacts(work);
  const designFacts = getDetailDesignFacts(work);
  const chipGroups = getDetailChipGroups(work);
  const booleanFlags = getDetailBooleanFlags(work);
  const showDesign = hasDetailDesignSection(work);

  return (
    <main>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Link href="/works" className={styles.backLink}>
            <span className={styles.backArrow}>&#8592;</span>
            <span className={styles.backLabel}>
              <span className={styles.backEn}>BACK TO WORKS</span>
              <span className={styles.backRuby}>一覧へ戻る</span>
            </span>
          </Link>

          <div className={styles.heroBreadcrumb}>
            <Link href="/works" className={styles.breadcrumbLink}>
              WORKS
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{work.title}</span>
          </div>

          <div className={styles.heroPills}>
            {work.isConcept ? (
              <span className={styles.pill}>Concept</span>
            ) : (
              <span className={`${styles.pill} ${styles.pillAccent}`}>
                実案件
              </span>
            )}
            {work.isFeatured && (
              <span className={`${styles.pill} ${styles.pillAccent}`}>
                Featured
              </span>
            )}
            {work.category.map((cat) => (
              <span key={cat} className={styles.categoryTag}>
                {cat}
              </span>
            ))}
          </div>

          <h1 className={styles.heroTitle}>{work.title}</h1>
          <p className={styles.heroKicker}>
            {work.genre} / {work.siteType}
          </p>
          <p className={styles.heroDesc}>{work.description}</p>
        </div>
      </section>

      {/* ── Gallery ── */}
      <WorkDetailClient work={work} />

      {/* ── Overview (Summary + Challenge) ── */}
      {hasDetailSummary(work) && (
        <section className={styles.overviewSection}>
          <div className={styles.overviewInner}>
            <ScrollReveal>
              <span className={styles.sectionLabel}>CONCEPT</span>
              <p className={styles.overviewText}>{work.summary}</p>
            </ScrollReveal>

            {hasDetailChallenge(work) && (
              <ScrollReveal delay={0.1}>
                <div className={styles.challengeBlock}>
                  <span className={styles.challengeLabel}>背景・課題</span>
                  <p className={styles.challengeText}>{work.challenge}</p>
                </div>
              </ScrollReveal>
            )}
          </div>
        </section>
      )}

      {/* ── Meta Facts ── */}
      <section className={styles.metaSection}>
        <div className={styles.metaInner}>
          <ScrollReveal>
            <span className={styles.sectionLabel}>PROJECT INFO</span>
          </ScrollReveal>
          <dl className={styles.metaGrid}>
            {metaFacts.map((fact, i) => (
              <ScrollReveal
                key={fact.label}
                delay={i * 0.05}
                as="div"
                className={styles.metaItem}
              >
                <dt className={styles.metaDt}>{fact.label}</dt>
                <dd className={styles.metaDd}>{fact.value}</dd>
              </ScrollReveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Design Perspective ── */}
      {showDesign && designFacts.length > 0 && (
        <section className={styles.designSection}>
          <div className={styles.designInner}>
            <ScrollReveal>
              <span className={styles.sectionLabel}>DESIGN PERSPECTIVE</span>
            </ScrollReveal>
            <dl className={styles.designGrid}>
              {designFacts.map((fact) => (
                <ScrollReveal
                  key={fact.label}
                  as="div"
                  className={styles.designItem}
                >
                  <dt className={styles.metaDt}>{fact.label}</dt>
                  <dd className={styles.metaDd}>{fact.value}</dd>
                </ScrollReveal>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* ── Tech & Features ── */}
      <section className={styles.techSection}>
        <div className={styles.techInner}>
          <ScrollReveal>
            <span className={styles.sectionLabel}>TECHNOLOGIES & FEATURES</span>
          </ScrollReveal>

          {/* Chip Groups */}
          {chipGroups.map((group, gi) => (
            <ScrollReveal key={group.label} delay={gi * 0.08}>
              <div className={styles.chipGroup}>
                <span className={styles.chipGroupLabel}>{group.label}</span>
                <div className={styles.chipItems}>
                  {group.items.map((item) => (
                    <span key={item} className={styles.techItem}>
                      {item}
                    </span>
                  ))}
                  {group.truncatedCount > 0 && (
                    <span className={styles.chipMore}>
                      他 {group.truncatedCount} 件
                    </span>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}

          {/* Boolean Flags */}
          <ScrollReveal delay={chipGroups.length * 0.08}>
            <div className={styles.flagsRow}>
              {booleanFlags.map((flag) => (
                <div key={flag.label} className={styles.flagItem}>
                  <span className={styles.flagLabel}>{flag.label}</span>
                  <span className={styles.flagValue}>{flag.value}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Prev / Next Navigation ── */}
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
