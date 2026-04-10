"use client";

import { useState, useRef, useEffect } from "react";
import type { Work } from "@/types/work";
import styles from "./page.module.css";

interface WorkDetailClientProps {
  work: Work;
}

export default function WorkDetailClient({ work }: WorkDetailClientProps) {
  const [device, setDevice] = useState<"pc" | "sp">("pc");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pcScale, setPcScale] = useState(1);
  const siteUrl = work.liveUrl ?? work.siteUrl;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || device !== "pc") return;
    const observer = new ResizeObserver(([entry]) => {
      setPcScale(entry.contentRect.width / 1920);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [device]);

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
                    width: 1920,
                    height: 1080,
                    transform: `scale(${pcScale})`,
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
