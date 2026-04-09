"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Work } from "@/types/work";
import styles from "./page.module.css";

interface WorkDetailClientProps {
  work: Work;
}

export default function WorkDetailClient({ work }: WorkDetailClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    document.body.classList.add("is-locked");
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    document.body.classList.remove("is-locked");
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % work.images.length : null
    );
  }, [work.images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + work.images.length) % work.images.length
        : null
    );
  }, [work.images.length]);

  return (
    <>
      {/* Screenshot Gallery */}
      <section className={styles.gallery}>
        <div className={styles.galleryInner}>
          {work.images.map((img, i) => (
            <button
              key={img}
              className={styles.galleryItem}
              onClick={() => openLightbox(i)}
              type="button"
            >
              <Image
                src={img}
                alt={`${work.title} — ${String(i + 1).padStart(2, "0")}`}
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                className={styles.galleryImage}
                style={{ objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className={styles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeLightbox}
          >
            <button
              className={styles.lightboxClose}
              onClick={closeLightbox}
              type="button"
            >
              &#10005;
            </button>

            <button
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              type="button"
            >
              &#8592;
            </button>

            <motion.div
              key={lightboxIndex}
              className={styles.lightboxContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={work.images[lightboxIndex]}
                alt={`${work.title} — ${String(lightboxIndex + 1).padStart(2, "0")}`}
                fill
                sizes="90vw"
                className={styles.lightboxImage}
                style={{ objectFit: 'contain' }}
              />
            </motion.div>

            <button
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              type="button"
            >
              &#8594;
            </button>

            <div className={styles.lightboxCounter}>
              {lightboxIndex + 1} / {work.images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
