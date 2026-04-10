"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "@/components/animation/SmoothScroll";
import styles from "./WorkModal.module.css";

interface WorkModalProps {
  children: React.ReactNode;
  slug?: string;
}

export default function WorkModal({ children, slug }: WorkModalProps) {
  const router = useRouter();
  const lenis = useLenis();
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    lenis?.stop();

    const overlay = overlayRef.current;
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      const modal = modalRef.current;
      if (modal) {
        modal.scrollTop += e.deltaY;
      }
    };

    overlay?.addEventListener("wheel", onWheel, { passive: false, capture: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lenis?.start();
      overlay?.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [close, lenis]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) close();
    },
    [close],
  );

  return (
    <div ref={overlayRef} className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modalWrap}>
        <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true">
          <button className={styles.closeBtn} onClick={close} aria-label="閉じる">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" />
              <line x1="18" y1="2" x2="2" y2="18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <div className={styles.content}>
            {children}
          </div>
        </div>

        {/* Sticky CTA — overlapping right edge */}
        {slug && (
          <button
            className={styles.stickyCta}
            onClick={() => { window.location.href = `/works/${slug}`; }}
          >
            <span className={styles.stickyCtaArrow}>→</span>
            詳しく見る
          </button>
        )}
      </div>
    </div>
  );
}
