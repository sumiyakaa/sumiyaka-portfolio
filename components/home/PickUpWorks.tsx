"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Work } from "@/types/work";
import styles from "./PickUpWorks.module.css";

gsap.registerPlugin(ScrollTrigger);

interface PickUpWorksProps {
  works: Work[];
}

export default function PickUpWorks({ works }: PickUpWorksProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-pickup-card]", {
        y: 60,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 65%",
          once: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.header}>
        <span className={styles.label}>Pickup — 注目の作品</span>
        <h2 className={styles.heading}>
          SELECTED
          <br />
          WORKS
        </h2>
      </div>

      <div className={styles.grid}>
        {works.map((work) => (
          <Link
            key={work.slug}
            href={`/works/${work.slug}`}
            className={styles.card}
            data-pickup-card
          >
            <div className={styles.thumbnail}>
              <Image
                src={work.thumbnail}
                alt={work.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={styles.thumbnailImage}
                style={{ objectFit: 'cover' }}
              />
              <span className={styles.tierBadge}>{work.tier}</span>
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>{work.title}</h3>
              <div className={styles.cardMeta}>
                {work.category.map((cat) => (
                  <span key={cat} className={styles.cardTag}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.cta}>
        <Link href="/works" className={styles.ctaLink}>
          VIEW ALL WORKS
          <span className={styles.ctaArrow}>→</span>
        </Link>
      </div>
    </section>
  );
}
