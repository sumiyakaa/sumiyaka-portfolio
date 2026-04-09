"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Work } from "@/types/work";
import styles from "./WorkCard.module.css";

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
          <Image
            src={work.thumbnail}
            alt={work.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.thumbnailImage}
            style={{ objectFit: 'cover' }}
          />
          <span className={styles.tierBadge}>{work.tier}</span>
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
