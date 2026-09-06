"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./TopProgress.module.css";

gsap.registerPlugin(ScrollTrigger);

type Item = { no: string; label: string; pos: number; paper: boolean };

/**
 * 進捗線（トップ本文の現在地）— P12「1画面1メッセージ」(2026-09-06)。
 *
 * 画面の左端に細い縦線を1本置き、`[data-top-section]` を持つ各セクションの
 * 開始位置に目盛（章番号）を打つ。線は読み進めた分だけ灯り、いまいる章の番号と
 * 英字ラベルだけが浮き上がる。FV のあいだは出さず、本文（#way）に入ると現れ、
 * CTA を過ぎると消える。
 *
 *  - PC（幅 1280px 以上・マウス）だけ。SP・タブレット・狭幅では出さない（CSS でも display:none）
 *  - 動かすのは transform（scaleY / translateY）と opacity だけ（iOS/WebKit 安全）
 *  - prefers-reduced-motion：線の伸びと灯の移動を止め、章番号の切り替えだけ行う
 *  - 装飾なので aria-hidden。SSR では描画しない（目盛の位置は DOM を測ってから決める）
 */
export default function TopProgress() {
  const fillRef = useRef<HTMLSpanElement>(null);
  const lampRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [active, setActive] = useState(0);
  const [on, setOn] = useState(false);

  /* 本文の高さが変わったら（Disclose の開閉・画像の読み込み）ScrollTrigger の位置を測り直す。
     全端末で行う＝SP でも Disclose を開いたあとの出現位置がずれない。650ms のデバウンス */
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastH = document.body.offsetHeight;
    const ro = new ResizeObserver(() => {
      const h = document.body.offsetHeight;
      if (h === lastH) return;
      lastH = h;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 650);
    });
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 1280px) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-top-section]"),
    );
    if (sections.length < 2) return;
    const first = sections[0];
    const last = sections[sections.length - 1];

    let list: Item[] = [];
    const measure = () => {
      const top0 = first.getBoundingClientRect().top + window.scrollY;
      const end = last.getBoundingClientRect().bottom + window.scrollY;
      const span = Math.max(1, end - top0);
      list = sections.map((s) => ({
        no: s.dataset.topSection || "",
        label: s.dataset.topLabel || "",
        pos: Math.min(1, Math.max(0, (s.getBoundingClientRect().top + window.scrollY - top0) / span)),
        /* 紙（白転調）の章＝線と番号を墨に切り替える（data-top-tone="paper"） */
        paper: s.dataset.topTone === "paper",
      }));
      setItems(list);
    };
    measure();

    const paint = (p: number) => {
      let idx = 0;
      for (let i = 0; i < list.length; i++) if (list[i].pos <= p + 0.0005) idx = i;
      setActive(idx);
      if (reduced) return;
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p})`;
      if (lampRef.current && railRef.current) {
        const h = railRef.current.offsetHeight;
        lampRef.current.style.transform = `translate(-50%, ${(p * h).toFixed(1)}px)`;
      }
    };

    const st = ScrollTrigger.create({
      trigger: first,
      start: "top 50%",
      endTrigger: last,
      end: "bottom 50%",
      onUpdate: (self) => paint(self.progress),
      onToggle: (self) => setOn(self.isActive),
      onRefresh: (self) => {
        measure();
        paint(self.progress);
      },
    });

    return () => st.kill();
  }, []);

  if (!items) return null;

  return (
    <div
      ref={railRef}
      className={[
        styles.rail,
        on ? styles.on : "",
        items[active]?.paper ? styles.paper : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span className={styles.track} />
      <span ref={fillRef} className={styles.fill} />
      {items.map((it, i) => (
        <span
          key={it.no}
          className={[
            styles.tick,
            i === active ? styles.active : "",
            i < active ? styles.passed : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ top: `${(it.pos * 100).toFixed(3)}%` }}
        >
          <span className={styles.dash} />
          <span className={styles.no}>{it.no}</span>
          <span className={styles.label}>{it.label}</span>
        </span>
      ))}
      <span ref={lampRef} className={styles.lamp} />
    </div>
  );
}
