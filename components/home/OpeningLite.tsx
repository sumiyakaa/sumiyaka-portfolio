"use client";

import { useEffect, useRef, useState } from "react";
import { prefersLightVisuals } from "@/lib/device";
import styles from "./OpeningLite.module.css";

interface OpeningLiteProps {
  onDone: () => void;
}

/**
 * 新OP「一筆と灯」— OPコンセプト3コマの実装（黒地×白のモノトーン）。
 *
 * ① 黒地に白の一筆が走る（0–0.55s）
 * ② 筆致が「灯敷」の白抜き二文字に結ばれる（0.55–1.0s）
 * ③ 灯の白が一点ともり、ヒーローが現れる（1.0–1.4s）
 *
 * 設計上の約束（P3_SPEC）：
 * - 総尺1.4秒・CSSアニメーションのみ（three.js不使用・GSAP不要）
 * - スクロールはロックしない（オーバーレイは pointer-events:none）
 * - prefersLightVisuals()（reduced-motion 含む）時はOP自体をスキップし即 onDone
 * - ハードタイムアウト2.0秒で必ず onDone（Heroが隠れたまま残る事故の防止）
 * - sessionStorage 不使用＝毎ページロード再生
 */
export default function OpeningLite({ onDone }: OpeningLiteProps) {
  // pending: マウント直後（無地の紙のみ表示） / play: 再生中 / done: 撤去済み
  const [phase, setPhase] = useState<"pending" | "play" | "done">("pending");
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const fire = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current();
    };

    // SP・タブレット・reduced-motion は再生せず即時完了（軽量経路の思想を維持）
    if (prefersLightVisuals()) {
      fire();
      setPhase("done");
      return;
    }

    setPhase("play");
    // 1.0s: 明転開始と同時に Hero 入場を解放（コマ③「灯がともり、ヒーローが現れる」）
    const tReveal = setTimeout(fire, 1000);
    // 1.45s: 総尺1.4sのフェード完了後、オーバーレイをDOMごと撤去
    const tUnmount = setTimeout(() => setPhase("done"), 1450);
    // 2.0s: ハードタイムアウト — 何があっても必ず onDone
    const tHard = setTimeout(() => {
      fire();
      setPhase("done");
    }, 2000);

    return () => {
      clearTimeout(tReveal);
      clearTimeout(tUnmount);
      clearTimeout(tHard);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`${styles.overlay} ${phase === "play" ? styles.play : ""}`}
      aria-hidden="true"
    >
      <svg className={styles.stage} viewBox="0 0 160 100" role="presentation">
        {/* コマ①: 墨の一筆（an-a.html の筆致パスをそのまま使用） */}
        <path
          className={styles.brush}
          d="M10,62 C48,72 88,34 150,42"
          pathLength={1}
        />
        <path
          className={styles.flick}
          d="M138,44 C146,41 151,37 156,31"
          pathLength={1}
        />
        {/* コマ②: 「灯敷」 */}
        <text
          className={styles.kanji}
          x="80"
          y="64"
          textAnchor="middle"
          fontSize="30"
          letterSpacing="8"
        >
          灯敷
        </text>
        {/* コマ③: 灯の金 */}
        <circle className={styles.emberHalo} cx="61" cy="29" r="9" />
        <circle className={styles.ember} cx="61" cy="29" r="3.2" />
      </svg>
    </div>
  );
}
