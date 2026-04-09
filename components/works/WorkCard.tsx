"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Work } from "@/types/work";
import styles from "./WorkCard.module.css";

const TIER_GRADIENTS: Record<string, string> = {
  S: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
  A: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
  B: "linear-gradient(135deg, #1a1a1a 0%, #252525 100%)",
};

interface WorkCardProps {
  work: Work;
}

export default function WorkCard({ work }: WorkCardProps) {
  return (
    <motion.div
      layout
      layoutId={work.slug}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link href={`/works/${work.slug}`} className={styles.card}>
        <div className={styles.thumbnail}>
          <div
            className={styles.thumbnailInner}
            style={{
              background: TIER_GRADIENTS[work.tier] || TIER_GRADIENTS.B,
            }}
          >
            <span className={styles.tierBadge}>{work.tier}</span>
            <span className={styles.thumbnailLabel}>{work.title}</span>
          </div>
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
