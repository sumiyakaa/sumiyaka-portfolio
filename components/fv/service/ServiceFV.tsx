"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import InViewGate from "@/components/animation/InViewGate";
import { onFVPhase } from "@/components/fv/contract";
import { useFVPhase } from "@/components/fv/useFVPhase";
import { prefersLightVisuals } from "@/lib/device";
import { buildFloor, segLength } from "./floor";
import styles from "./ServiceFV.module.css";

const SVG_NS = "http://www.w3.org/2000/svg";

type Props = {
  /** h1 の中身（文言は page.tsx が持つ。SP 改行の <br> もそのまま渡す） */
  title: ReactNode;
  /** 表題欄の TITLE 行に入るサブコピー（文言不変） */
  sub: string;
  /** 図名（表題欄 DWG 行）。装飾の英字 */
  sheetName: string;
  /** 図番の一覧（"01".."0N"）＝ページのセクション数から作る。数はハードコードしない */
  figures: string[];
};

type Lines = {
  horizon: SVGLineElement[];
  rays: SVGLineElement[];
  rows: SVGLineElement[];
};

/**
 * /service の FV「重＝線・図面」（customEntrance）
 *
 * 入場（総尺 ≈1.1s・主役は 0.7s で読める）：
 *   0.00 床面グリッドが引かれる（消失点から放射／奥から手前へ横罫）
 *   0.18 構築線（基準線・垂線）が走る
 *   0.28 題字がガイドに沿って左から滑り込み、0.70 でカチッと収まる（+4px→0）
 *   0.62 題字上の寸法線、0.74 四隅の十字・図番ティック、0.72 表題欄が灯る
 * 収縮（1.0→1.5s・SubPageFVAnim）：床面（data-fv-depth=1）だけが奥へ沈む。
 * settled で床面の幾何を収縮後の寸法で組み直す（SVG の伸縮で潰れた線を 1px に戻す）。
 * reduced-motion：床面を引き終えた状態で組み、入場は走らせない（CSS 側で終端値）。
 * タッチ端末・狭幅（prefersLightVisuals）：常時ループ（プロッタの走査線）を置かない。
 */
export default function ServiceFV({ title, sub, sheetName, figures }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const phase = useFVPhase(rootRef);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    // InViewGate の div（transform の影響を受けない layout 寸法をここから取る）
    const host = svg.parentElement;
    if (!host) return;

    if (prefersLightVisuals()) root.setAttribute("data-fv-light", "1");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** 床面を実測寸法で組み直す。hidden=true なら「まだ引かれていない」状態で置く */
    const build = (hidden: boolean): Lines => {
      const W = host.offsetWidth;
      const H = host.offsetHeight;
      const floor = buildFloor(W, H);
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const out: Lines = { horizon: [], rays: [], rows: [] };
      const sorted = floor.segs.slice().sort((a, b) => a.order - b.order);
      for (const s of sorted) {
        const el = document.createElementNS(SVG_NS, "line");
        el.setAttribute("x1", s.x1.toFixed(1));
        el.setAttribute("y1", s.y1.toFixed(1));
        el.setAttribute("x2", s.x2.toFixed(1));
        el.setAttribute("y2", s.y2.toFixed(1));
        el.setAttribute(
          "class",
          s.kind === "horizon" ? styles.horizon : s.kind === "ray" ? styles.ray : styles.row
        );
        const len = segLength(s);
        el.style.strokeDasharray = `${len}px`;
        el.style.strokeDashoffset = hidden ? `${len}px` : "0px";
        svg.appendChild(el);
        if (s.kind === "horizon") out.horizon.push(el);
        else if (s.kind === "ray") out.rays.push(el);
        else out.rows.push(el);
      }
      return out;
    };

    // 収縮が終わったら（settled）、収縮後の寸法で組み直して線を 1px に戻す
    const fvHost = root.closest<HTMLElement>("[data-fv]");
    const offPhase = fvHost
      ? onFVPhase(fvHost, (p) => {
          if (p === "settled") build(false);
        })
      : undefined;

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => build(false));
    };
    window.addEventListener("resize", onResize);

    if (reduce) {
      build(false);
      return () => {
        offPhase?.();
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(raf);
      };
    }

    const lines = build(true);
    const q = <T extends Element = HTMLElement>(sel: string) =>
      Array.from(root.querySelectorAll<T>(sel));
    const titleEl = root.querySelector<HTMLElement>("[data-svc='title']");
    const guideH = root.querySelector<HTMLElement>("[data-svc='guideH']");
    const guideV = root.querySelector<HTMLElement>("[data-svc='guideV']");
    const dimTop = root.querySelector<HTMLElement>("[data-svc='dimTop']");
    const marks = q("[data-svc='mark']");
    const ticks = q("[data-svc='tick']");
    const block = root.querySelector<HTMLElement>("[data-svc='block']");

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // 床面：放射線は消失点に近い順、横罫は奥から手前へ
      tl.to(lines.rays, { strokeDashoffset: 0, duration: 0.45, ease: "power2.out", stagger: 0.012 }, 0);
      tl.to(lines.horizon, { strokeDashoffset: 0, duration: 0.5, ease: "power3.out" }, 0.04);
      tl.to(lines.rows, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out", stagger: 0.03 }, 0.08);

      // 構築線
      if (guideH) tl.fromTo(guideH, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "expo.out" }, 0.18);
      if (guideV) tl.fromTo(guideV, { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: "expo.out" }, 0.22);

      // 題字：部材がガイドに沿って滑り込み、カチッと収まる
      if (titleEl) {
        tl.fromTo(
          titleEl,
          { opacity: 0, x: -40 },
          { opacity: 1, x: 4, duration: 0.42, ease: "expo.out" },
          0.28
        );
        tl.to(titleEl, { x: 0, duration: 0.1, ease: "power2.in" }, 0.7);
      }

      // 寸法線・十字・ガイドの一瞬の点灯（収まった合図）
      if (dimTop) tl.fromTo(dimTop, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "expo.out" }, 0.62);
      if (marks.length) {
        tl.fromTo(
          marks,
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.18, ease: "back.out(2)", stagger: 0.02 },
          0.74
        );
      }
      const guides = [guideH, guideV].filter((el): el is HTMLElement => !!el);
      if (guides.length) {
        tl.to(guides, { opacity: 1, duration: 0.08, ease: "power1.out" }, 0.76);
        tl.to(guides, { opacity: 0.6, duration: 0.3, ease: "power1.out" }, 0.84);
      }

      // 図番ティック・表題欄
      if (ticks.length) {
        tl.fromTo(
          ticks,
          { opacity: 0, y: 4 },
          { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", stagger: 0.035 },
          0.74
        );
      }
      if (block) {
        tl.fromTo(block, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, 0.72);
      }
    }, root);

    return () => {
      ctx.revert();
      offPhase?.();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const first = figures[0] ?? "";
  const last = figures[figures.length - 1] ?? "";

  return (
    <SubPageFVAnim className={styles.fv} customEntrance>
      <div ref={rootRef} className={styles.root} data-fv-stage={phase}>
        {/* 床面（背景層）。収縮で奥へ沈む */}
        <div className={styles.floor} data-fv-depth="1" aria-hidden="true">
          <InViewGate className={styles.floorGate} activeClassName={styles.live}>
            <svg ref={svgRef} className={styles.floorSvg} preserveAspectRatio="none" focusable="false" />
            <span className={styles.sweep} />
          </InViewGate>
        </div>

        {/* 図面の面（手前層） */}
        <div className={styles.sheet}>
          <div className={styles.titleWrap}>
            <span className={styles.guideH} data-svc="guideH" aria-hidden="true" />
            <span className={styles.guideV} data-svc="guideV" aria-hidden="true" />
            <span className={styles.dimTop} data-svc="dimTop" aria-hidden="true" />
            <span className={`${styles.mark} ${styles.markTl}`} data-svc="mark" aria-hidden="true" />
            <span className={`${styles.mark} ${styles.markTr}`} data-svc="mark" aria-hidden="true" />
            <span className={`${styles.mark} ${styles.markBl}`} data-svc="mark" aria-hidden="true" />
            <span className={`${styles.mark} ${styles.markBr}`} data-svc="mark" aria-hidden="true" />
            <h1 className={styles.title} data-svc="title">
              {title}
            </h1>
          </div>

          {/* 図番ティック（装飾・数はセクション数） */}
          <div className={styles.ticks} aria-hidden="true">
            {figures.map((f) => (
              <span key={f} className={styles.tick} data-svc="tick">
                <span className={styles.tickMark} />
                {f}
              </span>
            ))}
          </div>

          {/* 表題欄。サブコピーは可視の <p> のまま */}
          <div className={styles.titleBlock} data-svc="block">
            <span className={styles.tbKey} aria-hidden="true">DWG</span>
            <span className={styles.tbVal} aria-hidden="true">{sheetName}</span>
            <span className={styles.tbKey} aria-hidden="true">FIG</span>
            <span className={styles.tbVal} aria-hidden="true">{`${first}–${last}`}</span>
            <span className={`${styles.tbKey} ${styles.tbKeyLast}`} aria-hidden="true">TITLE</span>
            <p className={styles.sub}>{sub}</p>
          </div>
        </div>
      </div>
    </SubPageFVAnim>
  );
}
