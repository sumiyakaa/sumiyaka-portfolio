"use client";

import { useState, useRef, useEffect } from "react";
import type { Work } from "@/types/work";
import styles from "./page.module.css";

interface WorkDetailClientProps {
  work: Work;
}

const PC_W = 1920;
const PC_H = 5400;
const PC_VIEWPORT_H = 1080;

export default function WorkDetailClient({ work }: WorkDetailClientProps) {
  const [device, setDevice] = useState<"pc" | "sp">("pc");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pcScale, setPcScale] = useState(1);
  const [pcScrollY, setPcScrollY] = useState(0);
  const touchYRef = useRef(0);
  const siteUrl = work.liveUrl ?? work.siteUrl;

  /* ── PC scale tracking ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || device !== "pc") return;
    const observer = new ResizeObserver(([entry]) => {
      setPcScale(entry.contentRect.width / PC_W);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [device]);

  /* ── Reset scroll on device switch ── */
  useEffect(() => {
    setPcScrollY(0);
  }, [device]);

  /* ── PC mode: touch & wheel scroll via translateY ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || device !== "pc") return;

    const maxScroll = PC_H - PC_VIEWPORT_H;

    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const y = e.touches[0].clientY;
      const delta = touchYRef.current - y;
      touchYRef.current = y;
      setPcScrollY((prev) =>
        Math.max(0, Math.min(maxScroll, prev + delta / pcScale)),
      );
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPcScrollY((prev) =>
        Math.max(0, Math.min(maxScroll, prev + e.deltaY / pcScale)),
      );
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("wheel", onWheel);
    };
  }, [device, pcScale]);

  if (!siteUrl) return null;

  return (
    <section className={styles.preview}>
      <div className={styles.previewInner}>
        <p className={styles.previewNotice}>
          このプレビューは実サイトを埋め込み表示しています。レイアウトは実際の閲覧環境と異なる場合があります。
        </p>

        <div className={styles.previewToolbar}>
          <div className={styles.deviceToggle}>
            <button
              type="button"
              className={`${styles.deviceBtn} ${device === "pc" ? styles.deviceBtnActive : ""}`}
              onClick={() => setDevice("pc")}
            >
              PC
            </button>
            <button
              type="button"
              className={`${styles.deviceBtn} ${device === "sp" ? styles.deviceBtnActive : ""}`}
              onClick={() => setDevice("sp")}
            >
              SP
            </button>
          </div>

          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.liveBtn}
          >
            VIEW LIVE SITE &#8599;
          </a>
        </div>

        <div
          ref={wrapRef}
          className={`${styles.iframeWrap} ${
            device === "sp" ? styles.iframeWrapSp : styles.iframeWrapPc
          }`}
          data-lenis-prevent
        >
          <iframe
            src={siteUrl}
            title={`${work.title} プレビュー`}
            className={styles.iframe}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            style={
              device === "pc"
                ? {
                    width: PC_W,
                    height: PC_H,
                    transform: `scale(${pcScale}) translateY(${-pcScrollY}px)`,
                    transformOrigin: "0 0",
                  }
                : undefined
            }
          />
        </div>
      </div>
    </section>
  );
}
