"use client";

import { useRef, useCallback } from "react";
import { gsap } from "gsap";
import styles from "./BoundaryFigure.module.css";

export default function BoundaryFigure() {
  const figureRef = useRef<SVGSVGElement>(null);
  const commentRef = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  const play = useCallback(() => {
    if (played.current) return;
    played.current = true;

    const fig = figureRef.current;
    const cmt = commentRef.current;
    if (!fig || !cmt) return;

    const armR = fig.querySelector('[data-part="armR"]');
    if (!armR) return;

    const tl = gsap.timeline();

    // 1. Appear
    tl.to(fig, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0);

    // 2. Raise right arm to hold comment
    tl.to(
      armR,
      { attr: { x2: 42, y2: 8 }, duration: 0.3, ease: "power2.out" },
      0.3,
    );

    // 3. Comment fades in
    tl.to(
      cmt,
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      0.5,
    );

    // 4. Hold … then hide comment
    tl.to(cmt, { opacity: 0, duration: 0.3, ease: "power2.in" }, 2.3);

    // 5. Lower arm
    tl.to(
      armR,
      { attr: { x2: 36, y2: 38 }, duration: 0.3, ease: "power2.inOut" },
      2.3,
    );

    // 6. Bow
    tl.to(
      fig,
      {
        rotation: 20,
        transformOrigin: "50% 95%",
        duration: 0.4,
        ease: "power2.out",
      },
      2.8,
    );

    // 7. Straighten
    tl.to(
      fig,
      { rotation: 0, duration: 0.25, ease: "power2.inOut" },
      3.2,
    );

    // 8. Fall into darkness
    tl.to(
      fig,
      { y: 100, opacity: 0, duration: 0.6, ease: "power2.in" },
      3.6,
    );
  }, []);

  return (
    <div className={styles.boundary}>
      <div
        className={styles.figureWrap}
        onMouseEnter={play}
        onClick={play}
      >
        <span ref={commentRef} className={styles.comment}>
          {"<!-- see you below -->"}
        </span>
        <svg
          ref={figureRef}
          className={styles.figure}
          width={48}
          height={72}
          viewBox="0 0 48 72"
          fill="none"
          aria-hidden="true"
        >
          <circle
            data-part="head"
            cx="24"
            cy="10"
            r="7"
            stroke="#111"
            strokeWidth="2.5"
          />
          <line
            data-part="body"
            x1="24"
            y1="17"
            x2="24"
            y2="42"
            stroke="#111"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            data-part="armL"
            x1="24"
            y1="26"
            x2="12"
            y2="38"
            stroke="#111"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            data-part="armR"
            x1="24"
            y1="26"
            x2="36"
            y2="38"
            stroke="#111"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            data-part="legL"
            x1="24"
            y1="42"
            x2="14"
            y2="62"
            stroke="#111"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            data-part="legR"
            x1="24"
            y1="42"
            x2="34"
            y2="62"
            stroke="#111"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            data-part="footL"
            x1="14"
            y1="62"
            x2="10"
            y2="68"
            stroke="#111"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            data-part="footR"
            x1="34"
            y1="62"
            x2="38"
            y2="68"
            stroke="#111"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
