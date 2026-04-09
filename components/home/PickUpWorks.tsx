"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Work } from "@/types/work";
import styles from "./PickUpWorks.module.css";

gsap.registerPlugin(ScrollTrigger);

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const TYPE_SPEED = 60;

interface PickUpWorksProps {
  works: Work[];
}

function charSpans(text: string, baseDelay = 0) {
  return text.split("").map((char, i) => (
    <span
      key={`${char}-${i}`}
      className={styles.pickupChar}
      style={{ transitionDelay: `${baseDelay + i * 0.03}s` }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

export default function PickUpWorks({ works }: PickUpWorksProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nameRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const activeRef = useRef(-1);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollProxies = useRef<Record<number, { pct: number }>>({});
  const scrollTweens = useRef<Record<number, gsap.core.Tween | null>>({});

  /* ---- Thumbnail scroll (object-position 0%→100%) ---- */
  const startScroll = useCallback((i: number) => {
    const card = cardRefs.current[i];
    if (!card) return;
    const img = card.querySelector("img") as HTMLImageElement | null;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const ratio = img.naturalHeight / img.naturalWidth;
    if (ratio <= 0.8) return;

    const duration = Math.min(12, Math.max(6, ratio * 2.0));
    if (!scrollProxies.current[i]) scrollProxies.current[i] = { pct: 0 };
    const proxy = scrollProxies.current[i];
    proxy.pct = 0;

    if (scrollTweens.current[i]) scrollTweens.current[i]!.kill();
    scrollTweens.current[i] = gsap.to(proxy, {
      pct: 100,
      duration,
      ease: "none",
      onUpdate() {
        img.style.objectPosition = `center ${proxy.pct}%`;
      },
    });
  }, []);

  const stopScroll = useCallback((i: number) => {
    if (scrollTweens.current[i]) {
      scrollTweens.current[i]!.kill();
      scrollTweens.current[i] = null;
    }
    const card = cardRefs.current[i];
    if (!card) return;
    const img = card.querySelector("img") as HTMLImageElement | null;
    const proxy = scrollProxies.current[i];
    if (!img || !proxy) return;
    gsap.to(proxy, {
      pct: 0,
      duration: 0.5,
      ease: "power2.out",
      onUpdate() {
        img.style.objectPosition = `center ${proxy.pct}%`;
      },
    });
  }, []);

  /* ---- Typing ---- */
  const startTyping = useCallback(
    (i: number) => {
      const el = nameRefs.current[i];
      if (!el) return;
      const text = works[i].title;
      el.textContent = "";
      let idx = 0;
      function tick() {
        if (activeRef.current !== i) return;
        if (idx < text.length) {
          el!.textContent += text[idx];
          idx++;
          typeTimerRef.current = setTimeout(tick, TYPE_SPEED);
        } else {
          const sub = subRefs.current[i];
          if (sub) {
            sub.textContent = works[i].category.join(" / ");
            gsap.fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
          }
        }
      }
      tick();
    },
    [works],
  );

  /* ---- Reset ---- */
  const resetCard = useCallback(
    (i: number) => {
      if (typeTimerRef.current) {
        clearTimeout(typeTimerRef.current);
        typeTimerRef.current = null;
      }
      stopScroll(i);

      const body = bodyRefs.current[i];
      const panel = panelRefs.current[i];
      const slot = slotRefs.current[i];
      const name = nameRefs.current[i];
      const sub = subRefs.current[i];

      if (body) {
        gsap.killTweensOf(body);
        body.style.opacity = "";
      }
      if (panel) {
        gsap.killTweensOf(panel);
        panel.style.opacity = "0";
        panel.style.pointerEvents = "";
      }
      if (slot) slot.classList.remove(styles.slotActive);
      if (name) name.textContent = "";
      if (sub) {
        sub.textContent = "";
        sub.style.opacity = "0";
      }

      // Undim all
      cardRefs.current.forEach((c) => {
        if (c) {
          gsap.killTweensOf(c);
          c.style.opacity = "1";
        }
      });

      activeRef.current = -1;
    },
    [stopScroll],
  );

  /* ---- Hover enter ---- */
  const handleEnter = useCallback(
    (i: number) => {
      if (typeof window !== "undefined" && window.innerWidth <= 768) return;
      if (activeRef.current === i) return;
      if (activeRef.current !== -1) resetCard(activeRef.current);
      activeRef.current = i;

      const slot = slotRefs.current[i];
      const body = bodyRefs.current[i];
      const panel = panelRefs.current[i];
      if (!slot || !body || !panel) return;

      // z-index up
      slot.classList.add(styles.slotActive);

      // Cross-fade: body out → typed panel in
      gsap.to(body, { opacity: 0, duration: 0.3, ease: "power2.out" });
      gsap.to(panel, { opacity: 1, duration: 0.4, delay: 0.1, ease: "power2.out" });
      panel.style.pointerEvents = "auto";

      // Dim siblings
      cardRefs.current.forEach((c, j) => {
        if (j !== i && c) gsap.to(c, { opacity: 0.25, duration: 0.4 });
      });

      // Scroll & type
      startScroll(i);
      setTimeout(() => {
        if (activeRef.current === i) startTyping(i);
      }, 250);
    },
    [resetCard, startScroll, startTyping],
  );

  /* ---- Hover leave ---- */
  const handleLeave = useCallback(
    (i: number) => {
      if (typeof window !== "undefined" && window.innerWidth <= 768) return;
      if (activeRef.current !== i) return;
      resetCard(i);
    },
    [resetCard],
  );

  /* ---- Scroll entrance ---- */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-pickup-heading]", { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 1.2, ease: EASE,
        scrollTrigger: { trigger: section, start: "top 80%", once: true },
      });
      gsap.fromTo("[data-pickup-card]", { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: EASE,
        scrollTrigger: { trigger: section, start: "top 70%", once: true },
      });
      gsap.fromTo("[data-pickup-cta]", { opacity: 0 }, {
        opacity: 1, duration: 1.0, ease: "power2.out",
        scrollTrigger: { trigger: section, start: "top 50%", once: true },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    return () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      Object.values(scrollTweens.current).forEach((t) => t?.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.pickupTitle} data-pickup-heading>
          <span className={styles.pickupEn}>
            {charSpans("Pickup ")}
            {charSpans("—", 0.21)}
          </span>
          <span className={styles.pickupJp}>
            {charSpans("注目の作品", 0.24)}
          </span>
        </div>

        <h2 className={styles.heading} data-pickup-heading>SELECTED</h2>

        <div className={styles.grid}>
          {works.map((work, i) => (
            <div
              key={work.slug}
              className={styles.cardSlot}
              ref={(el) => { slotRefs.current[i] = el; }}
            >
              <div
                className={styles.card}
                ref={(el) => { cardRefs.current[i] = el; }}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={() => handleLeave(i)}
                data-pickup-card
              >
                <a href={work.liveUrl} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
                  {/* Thumbnail — full-page screenshot, scrolls on hover */}
                  <div className={styles.thumbnail}>
                    <Image
                      src={work.images[0]}
                      alt={work.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1279px) 50vw, 33vw"
                      className={styles.thumbnailImage}
                      style={{ objectFit: "cover", objectPosition: "center top" }}
                    />
                    <span className={styles.tierBadge}>{work.tier}</span>
                  </div>

                  {/* Info area — body cross-fades to typed panel */}
                  <div className={styles.cardInfo}>
                    <div
                      className={styles.cardBody}
                      ref={(el) => { bodyRefs.current[i] = el; }}
                    >
                      <h3 className={styles.cardTitle}>{work.title}</h3>
                      <div className={styles.cardMeta}>
                        {work.category.map((cat) => (
                          <span key={cat} className={styles.cardTag}>{cat}</span>
                        ))}
                      </div>
                    </div>

                    <div
                      className={styles.typedPanel}
                      ref={(el) => { panelRefs.current[i] = el; }}
                    >
                      <div className={styles.typedNameWrap}>
                        <span
                          className={styles.typedName}
                          ref={(el) => { nameRefs.current[i] = el; }}
                        />
                        <span className={styles.typedCursor} />
                      </div>
                      <p
                        className={styles.typedSub}
                        ref={(el) => { subRefs.current[i] = el; }}
                      />
                    </div>
                  </div>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.cta} data-pickup-cta>
          <Link href="/works" className={styles.ctaLink}>
            <span className={styles.ctaLinkText}>VIEW ALL WORKS →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
