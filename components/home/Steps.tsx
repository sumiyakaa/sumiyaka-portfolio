import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import DrawRule from "@/components/animation/DrawRule";
import Highlight from "@/components/animation/Highlight";
import SectionMark from "@/components/fv/top-body/SectionMark";
import tb from "@/components/fv/top-body/top-body.module.css";
import StepsLadder from "./StepsLadder";
import styles from "./Steps.module.css";

/**
 * 三段（THREE STEPS・#steps）— P10（2026-09-02）→ P11 減量 → **P12「1画面1メッセージ」(2026-09-06)**。
 * 文言は正本 `P12_原稿_減量差分.md` トップ THREE STEPS の【可視】どおり
 * （「いきなり全部を変えようとすると〜」「まずは、いま御社が〜」は削除指示）。
 * 各段の本文（現行そのまま）は StepsLadder の Disclose に畳む。
 *
 * 型：章番号 → h2（一句ずつ着地）→ 要約 → 梯子（3段・数字は1段目だけ）
 *     → 締め（墨のマーカー）→ 導線 /service。
 * 地：暖黒。白転調はしない（紙は #value だけ）。
 */
export default function Steps() {
  return (
    <section
      id="steps"
      data-top-section="03"
      data-top-label="THREE STEPS"
      className={`${tb.section} ${tb.washDown} ${styles.section}`}
    >
      <div className={tb.inner}>
        <ScrollReveal>
          <SectionMark no="03" label="THREE STEPS" />
        </ScrollReveal>

        <h2 className={tb.h2}>
          <ScrollReveal as="span" className={tb.phrase}>
            1段目は、
          </ScrollReveal>
          <ScrollReveal as="span" className={tb.phrase} delay={0.18}>
            AIを入れません。
          </ScrollReveal>
        </h2>

        <ScrollReveal delay={0.1}>
          <p className={`${tb.summary} ${styles.summary}`}>
            AI導入には、段階があります。どの段から始めても、どの段で止めても構いません。
          </p>
        </ScrollReveal>

        <StepsLadder />

        {/* 締め＝太い罫の下に一言。導線は /service */}
        <ScrollReveal className={styles.closeBlock}>
          <DrawRule className={styles.closeRule} duration={1.1} delay={0.05} />
          <p className={styles.close}>
            いきなり3段目に立てる会社は、ありません。
            <Highlight delay={0.3}>1段目だけでも、手作業は確かに減ります。</Highlight>
          </p>
          <p className={tb.more}>
            <Link href="/service" className={tb.moreLink}>
              進め方と、できないこと → /service
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
