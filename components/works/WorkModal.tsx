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

    // Touch scroll: Lenisがタッチイベントを横取りするため手動処理 + 慣性
    let touchStartY = 0;
    let velocity = 0;
    let lastTouchY = 0;
    let lastTouchTime = 0;
    let inertiaRaf = 0;

    const stopInertia = () => {
      if (inertiaRaf) {
        cancelAnimationFrame(inertiaRaf);
        inertiaRaf = 0;
      }
      velocity = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      stopInertia();
      touchStartY = e.touches[0].clientY;
      lastTouchY = touchStartY;
      lastTouchTime = Date.now();
      velocity = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const modal = modalRef.current;
      if (!modal) return;
      const touchY = e.touches[0].clientY;
      const now = Date.now();
      const dt = now - lastTouchTime || 16;
      const deltaY = lastTouchY - touchY;
      velocity = deltaY / dt * 16; // px per frame (≈16ms)
      lastTouchY = touchY;
      lastTouchTime = now;
      modal.scrollTop += deltaY;
    };

    const onTouchEnd = () => {
      const modal = modalRef.current;
      if (!modal || Math.abs(velocity) < 0.5) return;

      const friction = 0.95;
      const tick = () => {
        velocity *= friction;
        if (Math.abs(velocity) < 0.5) { inertiaRaf = 0; return; }
        modal.scrollTop += velocity;
        inertiaRaf = requestAnimationFrame(tick);
      };
      inertiaRaf = requestAnimationFrame(tick);
    };

    overlay?.addEventListener("wheel", onWheel, { passive: false, capture: true });
    overlay?.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    overlay?.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    overlay?.addEventListener("touchend", onTouchEnd, { capture: true });

    return () => {
      stopInertia();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lenis?.start();
      overlay?.removeEventListener("wheel", onWheel, { capture: true });
      overlay?.removeEventListener("touchstart", onTouchStart, { capture: true });
      overlay?.removeEventListener("touchmove", onTouchMove, { capture: true });
      overlay?.removeEventListener("touchend", onTouchEnd, { capture: true });
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
