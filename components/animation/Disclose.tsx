"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./Disclose.module.css";

interface DiscloseProps {
  children: ReactNode;
  /** 閉じているときのボタン文言（既定「続きを読む」） */
  label?: string;
  /** 開いているときのボタン文言（既定「閉じる」） */
  closeLabel?: string;
  className?: string;
  /** 初期状態で開いておく */
  defaultOpen?: boolean;
  /** ボタンを本文の上に置く（既定は下） */
  toggleFirst?: boolean;
}

/**
 * 段階開示（P12・2026-09-06 減量）
 *
 * 「3秒で読める要約」の下に、詳しい本文を畳んで置くための器。
 * - 本文は DOM に常にある（SEO・検索・読み上げは全文が対象）。閉じているあいだは
 *   `inert` でフォーカスも当たらない。
 * - 開閉は grid-template-rows 0fr→1fr の遷移＝高さの計算が要らず、
 *   iOS 16+ / Chrome 107+ / Firefox 66+ でなめらか。非対応環境は即時に切り替わる。
 * - prefers-reduced-motion では遷移を切る（globals.css の一括指定が効く）。
 */
export default function Disclose({
  children,
  label = "続きを読む",
  closeLabel = "閉じる",
  className,
  defaultOpen = false,
  toggleFirst = false,
}: DiscloseProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const toggle = (
    <button
      type="button"
      className={styles.toggle}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen((v) => !v)}
    >
      <span className={styles.rule} aria-hidden="true" />
      <span className={styles.label}>{open ? closeLabel : label}</span>
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.markH} />
        <span className={styles.markV} />
      </span>
    </button>
  );

  return (
    <div
      className={[styles.root, open ? styles.open : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      data-disclose={open ? "open" : "closed"}
    >
      {toggleFirst && toggle}
      <div id={panelId} className={styles.panel} inert={!open}>
        <div className={styles.inner}>{children}</div>
      </div>
      {!toggleFirst && toggle}
    </div>
  );
}
