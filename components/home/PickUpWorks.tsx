"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Work } from "@/types/work";
import { createHoverScroll, type HoverScroll } from "@/lib/hoverScroll";
import styles from "./PickUpWorks.module.css";

gsap.registerPlugin(ScrollTrigger);

/** ホバー時にカードへ掛かる拡大率。下の gsap.to(c, { scale: ... }) と一致させること */
const CARD_HOVER_SCALE = 1.04;

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

  // Heading refs for SELECTED ↔ typed title swap
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingTypedRef = useRef<HTMLDivElement>(null);
  const headingNameRef = useRef<HTMLSpanElement>(null);
  const headingSubRef = useRef<HTMLParagraphElement>(null);

  const activeRef = useRef(-1);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingTypeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* ---- Thumbnail scroll ----
     速度は lib/hoverScroll.ts の CRUISE_SPEED で全作品共通。
     Worksページのカードと同じモジュールを使う（実装を1本化）。
     所要時間はサムネの縦横比で変わるが、速度は変わらない＝それが仕様 */
  const scrollers = useRef<Record<number, HoverScroll>>({});

  const getScroller = useCallback((i: number) => {
    if (!scrollers.current[i]) {
      scrollers.current[i] = createHoverScroll(CARD_HOVER_SCALE);
    }
    return scrollers.current[i];
  }, []);

  const startScroll = useCallback(
    (i: number) => {
      const img = cardRefs.current[i]?.querySelector("img");
      if (img) getScroller(i).start(img);
    },
    [getScroller],
  );

  const stopScroll = useCallback(
    (i: number) => getScroller(i).stop(),
    [getScroller],
  );

  /* ---- Heading typing (SELECTED → work title) ---- */
  const startHeadingTyping = useCallback(
    (i: number) => {
      const el = headingNameRef.current;
      if (!el) return;
      const text = works[i].title;
      el.textContent = "";
      let idx = 0;
      function tick() {
        if (activeRef.current !== i) return;
        if (idx < text.length) {
          el!.textContent += text[idx];
          idx++;
          headingTypeTimerRef.current = setTimeout(tick, TYPE_SPEED);
        } else {
          const sub = headingSubRef.current;
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

  /* ---- Card typing ---- */
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
      if (headingTypeTimerRef.current) {
        clearTimeout(headingTypeTimerRef.current);
        headingTypeTimerRef.current = null;
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

      // Restore heading: show SELECTED, hide typed
      const heading = headingRef.current;
      const headingTyped = headingTypedRef.current;
      const headingName = headingNameRef.current;
      const headingSub = headingSubRef.current;
      if (heading) heading.style.visibility = "";
      if (headingTyped) headingTyped.classList.remove(styles.headingTypedActive);
      if (headingName) headingName.textContent = "";
      if (headingSub) {
        headingSub.textContent = "";
        headingSub.style.opacity = "0";
      }

      // Undim & reset scale
      cardRefs.current.forEach((c) => {
        if (c) {
          gsap.killTweensOf(c);
          c.style.opacity = "1";
          c.style.transform = "";
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

      // Heading swap: hide SELECTED, show typed area
      const heading = headingRef.current;
      const headingTyped = headingTypedRef.current;
      if (heading) heading.style.visibility = "hidden";
      if (headingTyped) headingTyped.classList.add(styles.headingTypedActive);

      // Dim & shrink siblings, scale up active
      cardRefs.current.forEach((c, j) => {
        if (!c) return;
        if (j === i) {
          gsap.to(c, { scale: 1.04, duration: 0.5, ease: EASE });
        } else {
          gsap.to(c, { opacity: 0.25, scale: 0.96, duration: 0.5, ease: EASE });
        }
      });

      // Scroll & type
      startScroll(i);
      setTimeout(() => {
        if (activeRef.current === i) {
          startTyping(i);
          startHeadingTyping(i);
        }
      }, 250);
    },
    [resetCard, startScroll, startTyping, startHeadingTyping],
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
    const activeScrollers = scrollers.current;
    return () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      if (headingTypeTimerRef.current) clearTimeout(headingTypeTimerRef.current);
      Object.values(activeScrollers).forEach((sc) => sc.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.inner}>
        {/* 制作実績 ↔ Typed title swap area（ホバータイピング演出は不変） */}
        <div className={styles.headingWrap} data-pickup-heading>
          <h2 className={styles.heading} ref={headingRef}>制作実績</h2>
          <div className={styles.headingTyped} ref={headingTypedRef}>
            <div className={styles.headingTypedNameWrap}>
              <span className={styles.headingTypedName} ref={headingNameRef} />
              <span className={styles.typedCursor} />
            </div>
            <p className={styles.headingTypedSub} ref={headingSubRef} />
          </div>
        </div>

        {/* リード（件数は配列から自動集計＝ハードコード禁止） */}
        <div className={styles.pickupTitle} data-pickup-heading>
          <span className={styles.pickupJp}>
            {charSpans(`/works より、${works.length}件。`)}
          </span>
        </div>

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
                <Link href={`/works/${work.slug}`} className={styles.cardLink}>
                  <div className={styles.thumbnail}>
                    <Image
                      src={work.images[0]}
                      alt={work.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1279px) 50vw, 33vw"
                      className={styles.thumbnailImage}
                      style={{ objectFit: "cover", objectPosition: "center top" }}
                    />
                  </div>

                  <div className={styles.cardInfo}>
                    <div
                      className={styles.cardBody}
                      ref={(el) => { bodyRefs.current[i] = el; }}
                    >
                      <h3 className={styles.cardTitle}>{work.title}</h3>
                      <p className={styles.cardMeta}>
                        {work.category.join(" ・ ")}
                      </p>
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
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.cta} data-pickup-cta>
          <Link href="/works" className={styles.ctaLink}>
            <span className={styles.ctaLinkText}>実績をすべて見る →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
