"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Work } from "@/types/work";
import {
  createHoverScroll,
  measureTravel,
  CRUISE_SPEED,
  type HoverScroll,
} from "@/lib/hoverScroll";
import { useLenis } from "@/components/animation/SmoothScroll";
import styles from "./PickUpWorks.module.css";

gsap.registerPlugin(ScrollTrigger);

/** ホバー時にカードへ掛かる拡大率。下の gsap.to(c, { scale: ... }) と一致させること */
const CARD_HOVER_SCALE = 1.04;

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const TYPE_SPEED = 60;

/** 墨明け（常時アニメB）の順送り間隔ms。works3.html プロトの実測値を踏襲 */
const INK_INTERVAL = 2600;

/** FLIP 展開の transitionend 保険タイムアウト（CSS .68s より長く） */
const FLIP_TIMEOUT = 950;

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
      {char === " " ? " " : char}
    </span>
  ));
}

/** W-01 形式の通し番号 */
function workIdx(i: number) {
  return `W-${String(i + 1).padStart(2, "0")}`;
}

/**
 * transitionend＋タイムアウトの二重化。
 * イベント欠落（タブ非表示等）でも状態機械が固まらない（works3.html 踏襲）
 */
function onceTransform(el: HTMLElement, cb: () => void, timeoutMs = FLIP_TIMEOUT) {
  let done = false;
  function fire() {
    if (done) return;
    done = true;
    el.removeEventListener("transitionend", handler);
    cb();
  }
  function handler(e: Event) {
    const te = e as TransitionEvent;
    if (te.propertyName === "transform" && te.target === el) fire();
  }
  el.addEventListener("transitionend", handler);
  window.setTimeout(fire, timeoutMs);
}

export default function PickUpWorks({ works }: PickUpWorksProps) {
  const lenis = useLenis();
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  /* ---- 墨明け（常時アニメB）の状態 ---- */
  const litRef = useRef(-1);
  const inkTimerRef = useRef<number | null>(null);
  const sectionVisibleRef = useRef(false);
  const reducedMotionRef = useRef(false);

  /* ---- クリック展開（FLIP フォーカス）の状態 ---- */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openIndexRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageThumbRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const detailLinkRef = useRef<HTMLAnchorElement>(null);
  const stagePanTweenRef = useRef<gsap.core.Tween | null>(null);

  /* ---- Thumbnail scroll ----
     速度は lib/hoverScroll.ts の CRUISE_SPEED で全作品共通。
     Worksページのカードと同じモジュールを使う（実装を1本化）。
     墨明け化でサムネはモノクロ／カラーの2枚重ねになったため、
     1カードにつき2つのスクローラを同条件で走らせて同期させる
     （同一画像＝同一実寸なのでタイムラインは完全一致する） */
  const scrollers = useRef<Record<string, HoverScroll>>({});

  const getScroller = useCallback((key: string) => {
    if (!scrollers.current[key]) {
      scrollers.current[key] = createHoverScroll(CARD_HOVER_SCALE);
    }
    return scrollers.current[key];
  }, []);

  const startScroll = useCallback(
    (i: number) => {
      const thumb = thumbRefs.current[i];
      if (!thumb) return;
      thumb.querySelectorAll("img").forEach((img, k) => {
        getScroller(`${i}:${k}`).start(img);
      });
    },
    [getScroller],
  );

  const stopScroll = useCallback((i: number) => {
    [0, 1].forEach((k) => scrollers.current[`${i}:${k}`]?.stop());
  }, []);

  /* ---- 墨明け：墨ヴェールが順に晴れてカラーが浮かぶ（works3 モードB踏襲） ---- */
  const inkStep = useCallback(() => {
    const cards = cardRefs.current;
    const n = works.length;
    if (n === 0) return;
    if (litRef.current >= 0) cards[litRef.current]?.classList.remove(styles.lit);
    litRef.current = (litRef.current + 1) % n;
    cards[litRef.current]?.classList.add(styles.lit);
  }, [works.length]);

  const startInk = useCallback(() => {
    if (
      reducedMotionRef.current ||
      inkTimerRef.current !== null ||
      !sectionVisibleRef.current ||
      openIndexRef.current !== null
    ) {
      return;
    }
    inkStep();
    inkTimerRef.current = window.setInterval(inkStep, INK_INTERVAL);
  }, [inkStep]);

  const pauseInk = useCallback(() => {
    if (inkTimerRef.current !== null) {
      window.clearInterval(inkTimerRef.current);
      inkTimerRef.current = null;
    }
  }, []);

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
      if (openIndexRef.current !== null) return;
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

  /* ---- 展開ステージのサムネ自動パン（開いている間だけ緩やかに往復） ---- */
  const startStagePan = useCallback(() => {
    if (reducedMotionRef.current) return;
    const img = stageThumbRef.current?.querySelector("img");
    if (!img) return;
    const run = () => {
      const travel = measureTravel(img.naturalWidth, img.naturalHeight, 1);
      if (travel <= 0.01) return;
      // ホバーパンより遅い巡航（0.6倍）で「眺める」速度にする
      const dur = Math.max(10, travel / (CRUISE_SPEED * 0.6));
      const state = { pct: 0 };
      stagePanTweenRef.current = gsap.to(state, {
        pct: 100,
        duration: dur,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        onUpdate: () => {
          img.style.objectPosition = `50% ${state.pct}%`;
        },
      });
    };
    if (img.naturalWidth) run();
    else img.addEventListener("load", run, { once: true });
  }, []);

  /* ---- クリック展開：open ---- */
  const openWork = useCallback(
    (i: number) => {
      if (busyRef.current || openIndexRef.current !== null) return;
      lastFocusRef.current = document.activeElement as HTMLElement | null;
      if (activeRef.current !== -1) resetCard(activeRef.current);
      pauseInk();
      openIndexRef.current = i;
      setOpenIndex(i);
    },
    [resetCard, pauseInk],
  );

  /* ---- クリック展開：close（逆FLIPでカードへ戻る） ---- */
  const closeWork = useCallback(() => {
    if (busyRef.current || openIndexRef.current === null) return;
    const overlay = overlayRef.current;
    const stageThumb = stageThumbRef.current;
    const cardThumb = thumbRefs.current[openIndexRef.current];

    const finish = () => {
      busyRef.current = false;
      openIndexRef.current = null;
      setOpenIndex(null);
      lastFocusRef.current?.focus();
      lastFocusRef.current = null;
      startInk();
    };

    if (reducedMotionRef.current || !overlay || !stageThumb || !cardThumb) {
      finish();
      return;
    }

    busyRef.current = true;
    stagePanTweenRef.current?.kill();
    stagePanTweenRef.current = null;
    innerRef.current?.classList.remove(styles.receded);

    const first = cardThumb.getBoundingClientRect();
    const last = stageThumb.getBoundingClientRect();
    overlay.classList.remove(styles.overlayOpen);
    overlay.classList.add(styles.overlayClosing);
    stageThumb.style.transform =
      `translate(${first.left - last.left}px, ${first.top - last.top}px) ` +
      `scale(${first.width / last.width}, ${first.height / last.height})`;
    onceTransform(stageThumb, finish);
  }, [startInk]);

  /* ---- カードクリック：直接遷移を止めて展開フォーカスへ。
          修飾キー付き（新規タブ等）は a タグ本来の挙動に委ねる ---- */
  const handleCardClick = useCallback(
    (e: React.MouseEvent, i: number) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openWork(i);
    },
    [openWork],
  );

  /* ---- 展開オーバーレイの開演出（FLIP：実測rect→transform→解除） ---- */
  useLayoutEffect(() => {
    if (openIndex === null) return;
    const overlay = overlayRef.current;
    const stageThumb = stageThumbRef.current;
    const cardThumb = thumbRefs.current[openIndex];
    if (!overlay || !stageThumb) return;

    busyRef.current = true;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    innerRef.current?.classList.add(styles.receded);

    const finishOpen = () => {
      busyRef.current = false;
      startStagePan();
      closeBtnRef.current?.focus();
    };

    if (reducedMotionRef.current || !cardThumb) {
      overlay.classList.add(styles.overlayOpen);
      busyRef.current = false;
      closeBtnRef.current?.focus();
    } else {
      const first = cardThumb.getBoundingClientRect();
      const last = stageThumb.getBoundingClientRect();
      stageThumb.style.transition = "none";
      stageThumb.style.transformOrigin = "top left";
      stageThumb.style.transform =
        `translate(${first.left - last.left}px, ${first.top - last.top}px) ` +
        `scale(${first.width / last.width}, ${first.height / last.height})`;
      void stageThumb.offsetWidth; /* reflow */
      stageThumb.style.transition = "";
      overlay.classList.add(styles.overlayOpen);
      stageThumb.style.transform = "";
      onceTransform(stageThumb, finishOpen);
    }

    /* Esc で閉じる＋簡易フォーカストラップ（詳しく見る ⇄ 閉じる） */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeWork();
        return;
      }
      if (e.key === "Tab") {
        const focusables = [detailLinkRef.current, closeBtnRef.current].filter(
          (el): el is HTMLAnchorElement | HTMLButtonElement => el !== null,
        );
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(
          document.activeElement as HTMLAnchorElement | HTMLButtonElement,
        );
        if (e.shiftKey && idx <= 0) {
          e.preventDefault();
          focusables[focusables.length - 1].focus();
        } else if (!e.shiftKey && idx === focusables.length - 1) {
          e.preventDefault();
          focusables[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      stagePanTweenRef.current?.kill();
      stagePanTweenRef.current = null;
      document.body.style.overflow = "";
      lenis?.start();
      innerRef.current?.classList.remove(styles.receded);
      busyRef.current = false;
    };
  }, [openIndex, lenis, closeWork, startStagePan]);

  /* ---- 墨明けの可視性ゲート（画面外では順送りタイマーを止める） ---- */
  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => {
        sectionVisibleRef.current = entries[0]?.isIntersecting ?? false;
        if (sectionVisibleRef.current) startInk();
        else pauseInk();
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      pauseInk();
    };
  }, [startInk, pauseInk]);

  /* ---- Scroll entrance ---- */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    // reduced-motion：入場アニメは行わず最終状態で静止
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-pickup-heading]", { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 1.2, ease: EASE,
        scrollTrigger: { trigger: section, start: "top 80%", once: true },
      });
      gsap.fromTo("[data-pickup-card]", { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: EASE,
        scrollTrigger: { trigger: section, start: "top 70%", once: true },
      });
      gsap.fromTo("[data-pickup-plate]", { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: EASE,
        scrollTrigger: { trigger: "[data-pickup-pending]", start: "top 82%", once: true },
      });
      gsap.fromTo("[data-pickup-cta]", { opacity: 0 }, {
        opacity: 1, duration: 1.0, ease: "power2.out",
        scrollTrigger: { trigger: "[data-pickup-cta]", start: "top 92%", once: true },
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

  const openWorkData = openIndex !== null ? works[openIndex] : null;

  return (
    <section ref={sectionRef} className={styles.section}>
      {/* 巨大タイポ：地に+3〜5%Lで沈める（読ませない・full.html踏襲の左裁ち落とし） */}
      <div className={styles.ghostType} aria-hidden="true">
        WORKS
      </div>

      <div className={styles.inner} ref={innerRef}>
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

        {/* ============ 01 Web制作 ============ */}
        <div className={styles.blockWeb}>
          <div className={styles.catHead} data-pickup-heading>
            <span className={styles.catIdx}>01</span>
            <h3 className={styles.catName}>Web制作</h3>
            <span className={styles.catEn}>Web</span>
            <span className={styles.catCount}>{works.length} WORKS</span>
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
                  {/* aタグのまま（SEO・新規タブ・キーボード操作を保持）、
                      通常クリックのみ preventDefault して FLIP 展開フォーカスへ */}
                  <Link
                    href={`/works/${work.slug}`}
                    className={styles.cardLink}
                    aria-haspopup="dialog"
                    onClick={(e) => handleCardClick(e, i)}
                  >
                    <div
                      className={styles.thumbnail}
                      ref={(el) => { thumbRefs.current[i] = el; }}
                    >
                      <div className={styles.thumbInner}>
                        {/* 墨明け＝静的 grayscale の下地＋カラーの opacity クロスフェード
                            （filter はアニメしない＝iOS(WebKit)安全） */}
                        <Image
                          src={work.images[0]}
                          alt=""
                          aria-hidden="true"
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1279px) 50vw, 33vw"
                          className={`${styles.thumbImg} ${styles.thumbMono}`}
                        />
                        <Image
                          src={work.images[0]}
                          alt={work.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1279px) 50vw, 33vw"
                          className={`${styles.thumbImg} ${styles.thumbColor}`}
                        />
                      </div>
                      <div className={styles.inkVeil} aria-hidden="true" />
                      <div className={styles.frameLine} aria-hidden="true" />
                    </div>

                    <div className={styles.cardInfo}>
                      <div
                        className={styles.cardBody}
                        ref={(el) => { bodyRefs.current[i] = el; }}
                      >
                        <span className={styles.cardIdx}>{workIdx(i)}</span>
                        <h4 className={styles.cardTitle}>{work.title}</h4>
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
        </div>

        {/* ============ 02 ツール制作 ／ 03 SNS（準備中） ============ */}
        <div className={styles.pending} data-pickup-pending>
          <div className={styles.plate} data-pickup-plate>
            <div className={styles.plateVeil} aria-hidden="true" />
            <div className={styles.plateGhost} aria-hidden="true">TOOLS</div>
            <div className={styles.plateHead}>
              <span className={styles.catIdx}>02</span>
              <h3 className={styles.catName}>ツール制作</h3>
              <span className={styles.catEn}>Tools</span>
            </div>
            <div className={styles.plateBody}>
              <span className={styles.chip}>準備中</span>
              <p className={styles.plateNote}>
                日々の作業を静かに引き受ける小さな道具を、見せられるかたちに整えています。
              </p>
            </div>
          </div>

          <div className={styles.plate} data-pickup-plate>
            <div className={styles.plateVeil} aria-hidden="true" />
            <div className={styles.plateGhost} aria-hidden="true">SNS</div>
            <div className={styles.plateHead}>
              <span className={styles.catIdx}>03</span>
              <h3 className={styles.catName}>SNS</h3>
              <span className={styles.catEn}>Social</span>
            </div>
            <div className={styles.plateBody}>
              <span className={styles.chip}>準備中</span>
              <p className={styles.plateNote}>
                運用と発信の記録を、この場所へ順に並べていきます。
              </p>
            </div>
          </div>
        </div>

        <div className={styles.cta} data-pickup-cta>
          <Link href="/works" className={styles.ctaLink}>
            <span className={styles.ctaLinkText}>実績をすべて見る →</span>
          </Link>
        </div>
      </div>

      {/* ============ クリック展開オーバーレイ（FLIPフォーカス） ============ */}
      {openWorkData !== null && openIndex !== null && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pickup-stage-title"
        >
          <div className={styles.overlayScrim} onClick={closeWork} />
          {/* 小画面ではみ出した場合の内部スクロールを Lenis に奪わせない */}
          <div className={styles.stage} data-lenis-prevent>
            <div className={styles.stageInner}>
              <div ref={stageThumbRef} className={styles.stageThumb}>
                <Image
                  key={openWorkData.slug}
                  src={openWorkData.images[0]}
                  alt={`${openWorkData.title} のサムネイル（拡大）`}
                  fill
                  sizes="(max-width: 1080px) 92vw, 640px"
                  className={styles.stageImg}
                />
              </div>
              <div className={styles.stagePanel}>
                <p className={styles.stageIdx}>{workIdx(openIndex)}</p>
                <h3 className={styles.stageTitle} id="pickup-stage-title">
                  {openWorkData.title}
                </h3>
                <p className={styles.stageMeta}>
                  {[
                    openWorkData.genre,
                    openWorkData.siteType,
                    openWorkData.pageCount
                      ? `${openWorkData.pageCount}ページ`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ・ ")}
                </p>
                <p className={styles.stageDesc}>{openWorkData.description}</p>
                <p className={styles.stagePath}>{`/works/${openWorkData.slug}`}</p>
                <Link
                  ref={detailLinkRef}
                  href={`/works/${openWorkData.slug}`}
                  className={styles.stageLink}
                >
                  詳しく見る →
                </Link>
              </div>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            onClick={closeWork}
          >
            ✕ 閉じる
          </button>
        </div>
      )}
    </section>
  );
}
