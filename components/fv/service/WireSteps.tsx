"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./WireSteps.module.css";

gsap.registerPlugin(ScrollTrigger);

export type WireStep = {
  num: string;
  title: string;
  desc: string;
};

type Props = {
  steps: WireStep[];
};

/** 1行に並ぶ段の数（PC）。CSS の 3 列と一致させる */
const COLS = 3;

/**
 * PROCESS ＝ 配線図。段（ノード）同士を線で結び、表示時に順に「電気が通る」。
 *
 *  PC(≥1024)：3 列。01→02→03 は横の配線、03 の下から溝（行間）を左へ戻り 04 へ上がる。
 *  それ未満：1 列。端子から次の端子へ縦の配線。
 *  どの配線が見えているかは CSS が決め（display）、JS は見えている線だけを順に引く。
 *
 *  - 動かすのは transform（scaleX/scaleY）と opacity のみ（iOS/WebKit 安全）。
 *  - 読み込み時点で視界にある場合は動かさない（引き終わった状態）。
 *  - prefers-reduced-motion：何もしない（CSS は最初から終端値）。
 */
export default function WireSteps({ steps }: Props) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ol = ref.current;
    if (!ol) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (ol.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const visible = (el: HTMLElement) => getComputedStyle(el).display !== "none";
    const nodes = Array.from(ol.querySelectorAll<HTMLElement>("[data-node]"));

    type Item = { el: HTMLElement; kind: "wire" | "node"; axis: "x" | "y" };
    const seq: Item[] = [];
    nodes.forEach((node) => {
      const wires = Array.from(node.querySelectorAll<HTMLElement>("[data-w]")).filter(visible);
      const pick = (w: string) => wires.filter((el) => el.getAttribute("data-w") === w);
      const axisOf = (el: HTMLElement): "x" | "y" => (el.getAttribute("data-axis") === "y" ? "y" : "x");
      pick("run").forEach((el) => seq.push({ el, kind: "wire", axis: axisOf(el) }));
      pick("in").forEach((el) => seq.push({ el, kind: "wire", axis: axisOf(el) }));
      seq.push({ el: node, kind: "node", axis: "x" });
      pick("out").forEach((el) => seq.push({ el, kind: "wire", axis: axisOf(el) }));
    });

    // 初期状態：配線は 0、ノードは薄く
    seq.forEach((it) => {
      if (it.kind === "wire") gsap.set(it.el, it.axis === "x" ? { scaleX: 0 } : { scaleY: 0 });
      else gsap.set(it.el, { opacity: 0.38 });
    });

    const trigger = ScrollTrigger.create({
      trigger: ol,
      start: "top 82%",
      once: true,
      onEnter: () => {
        const tl = gsap.timeline();
        seq.forEach((it) => {
          if (it.kind === "wire") {
            // プロッタの一定速度（約 2000px/s）。総尺は 6 段で 2 秒強
            const len = it.axis === "x" ? it.el.offsetWidth : it.el.offsetHeight;
            const d = Math.min(0.3, Math.max(0.06, len / 2000));
            tl.to(it.el, it.axis === "x" ? { scaleX: 1, duration: d, ease: "none" } : { scaleY: 1, duration: d, ease: "none" });
          } else {
            tl.to(it.el, { opacity: 1, duration: 0.18, ease: "power2.out" });
          }
        });
      },
    });

    return () => {
      trigger.kill();
      seq.forEach((it) => gsap.set(it.el, { clearProps: "transform,opacity" }));
    };
  }, [steps]);

  const last = steps.length - 1;

  return (
    <ol ref={ref} className={styles.list}>
      {steps.map((s, i) => {
        const rowHead = i > 0 && i % COLS === 0;
        return (
          <li key={s.num} className={styles.node} data-node>
            {/* 行頭ノード：前の行末から溝を戻ってくる配線（PC のみ表示） */}
            {rowHead && <span className={styles.run} data-w="run" data-axis="x" aria-hidden="true" />}
            {/* 入る配線：横（PC・行内）／縦（PC 行頭・1列） */}
            {i > 0 && <span className={`${styles.wire} ${styles.inH}`} data-w="in" data-axis="x" aria-hidden="true" />}
            {i > 0 && <span className={`${styles.wire} ${styles.inV}`} data-w="in" data-axis="y" aria-hidden="true" />}

            <span className={styles.terminal} aria-hidden="true" />
            <span className={styles.num}>{s.num}</span>
            <h3 className={styles.name}>{s.title}</h3>
            <p className={styles.desc}>{s.desc}</p>

            {/* 出る配線：横（PC・行内）／縦（PC 行末の落ち・1列） */}
            {i < last && <span className={`${styles.wire} ${styles.outH}`} data-w="out" data-axis="x" aria-hidden="true" />}
            {i < last && <span className={`${styles.wire} ${styles.outV}`} data-w="out" data-axis="y" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
