"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Work } from "@/types/work";
import type { ViewMode } from "@/types/filter";
import styles from "./WorkCard.module.css";

interface WorkCardProps {
  work: Work;
  index: number;
  viewMode: ViewMode;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

export default function WorkCard({ work, index, viewMode }: WorkCardProps) {
  if (viewMode === "thumbnail") {
    return (
      <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <Link href={`/works/${work.slug}`} className={styles.thumbCard}>
          <Image
            src={work.thumbnail}
            alt={work.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className={styles.thumbImage}
          />
          <div className={styles.thumbOverlay}>
            <span className={styles.thumbTitle}>{work.title}</span>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (viewMode === "list") {
    return (
      <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <Link href={`/works/${work.slug}`} className={styles.listCard}>
          <div className={styles.listThumb}>
            <Image
              src={work.thumbnail}
              alt={work.title}
              fill
              sizes="140px"
              className={styles.listThumbImage}
            />
          </div>
          <div className={styles.listBody}>
            <h3 className={styles.listTitle}>{work.title}</h3>
            <p className={styles.listMeta}>
              {work.genre} / {work.siteType}
            </p>
            <p className={styles.listSummary}>{work.summary}</p>
            <div className={styles.listTags}>
              {work.tags.slice(0, 4).map((tag) => (
                <span key={tag} className={styles.listTag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.listRight}>
            {work.budgetRange && (
              <span className={styles.listBudget}>{work.budgetRange}</span>
            )}
          </div>
        </Link>
      </motion.div>
    );
  }

  // Grid (default)
  return (
    <motion.div
      layout
      layoutId={work.slug}
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      <Link href={`/works/${work.slug}`} className={styles.card}>
        <div className={styles.thumbnail}>
          <Image
            src={work.thumbnail}
            alt={work.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.thumbnailImage}
          />
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.cardTitle}>{work.title}</h3>
          <p className={styles.cardDesc}>{work.description}</p>
          <div className={styles.cardMeta}>
            <div className={styles.cardTags}>
              {work.category.map((cat) => (
                <span key={cat} className={styles.cardTag}>
                  {cat}
                </span>
              ))}
            </div>
            <div className={styles.cardTechs}>
              {work.technologies.slice(0, 3).map((tech) => (
                <span key={tech} className={styles.techTag}>
                  {tech}
                </span>
              ))}
              {work.technologies.length > 3 && (
                <span className={styles.techTag}>
                  +{work.technologies.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
