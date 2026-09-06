import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import Highlight from "@/components/animation/Highlight";
import tb from "@/components/fv/top-body/top-body.module.css";
import styles from "./Person.module.css";

/**
 * どんな人か — an-a.html .sec-person の移植 → **P12「1画面1メッセージ」で減量（2026-09-06）**。
 * 文言は正本 `P12_原稿_減量差分.md` トップ Person の【可視】どおり：
 *   ラベル・見出し・導線は不変／本文は3行（各1文）／Highlight は「使う側」
 *   （学歴・独立年齢・「セキュリティを何より重視」・育成の軸・「顔を合わせて分かること〜」は削除指示）。
 * 写真は portrait-tall.webp（869×1086＝4:5・原比率のまま・CSSフィルタ不使用）。
 * 額（オフセット罫線）・縁の沈み込み・SUMIYAKA キャプション（左下）は現行意匠を維持。
 */
export default function Person() {
  return (
    <section
      className={styles.section}
      data-top-section="08"
      data-top-label="PERSON"
    >
      <div className={styles.wrap}>
        <div className={styles.grid}>
          <div>
            <ScrollReveal as="p" className={styles.label}>
              <span className={styles.labelNo} aria-hidden="true">
                08
              </span>
              どんな人か
            </ScrollReveal>
            <ScrollReveal as="p" className={styles.display}>
              15歳、作る側へ。
            </ScrollReveal>

            {/* 3行（各1文）。マーカーは「使う側」＝2文目の主張の側に引く */}
            <ul className={styles.lines}>
              <ScrollReveal as="li" className={styles.line} delay={0.12}>
                大手美容外科の社内・院内SEを7年。止まれば診療が止まるシステムを守ってきました。
              </ScrollReveal>
              <ScrollReveal as="li" className={styles.line} delay={0.2}>
                仕事はこれから、AIにできないことをする側と、AIを使う側に分かれる。私は、
                <Highlight delay={0.35}>使う側</Highlight>
                でありたい。
              </ScrollReveal>
              <ScrollReveal as="li" className={styles.line} delay={0.28}>
                それでも、仕事は人と人との間に生まれる。AIで速くなった分は、そこに使いたい。
              </ScrollReveal>
            </ul>

            {/* 導線（P6-4）＝経歴の物語・年表・信条・引き受けないことは /about に置く */}
            <ScrollReveal as="p" className={`${tb.more} ${styles.more}`} delay={0.34}>
              <Link href="/about" className={tb.moreLink}>
                経歴と考え方を読む → /about
              </Link>
            </ScrollReveal>
          </div>
          <ScrollReveal as="figure" className={styles.portrait} delay={0.2}>
            <div className={styles.portraitFrame}>
              <Image
                src="/home/portrait-tall.webp"
                alt="墨家 / SUMIYAKA ポートレート"
                width={869}
                height={1086}
                sizes="(max-width: 860px) 86vw, 440px"
                className={styles.portraitImg}
              />
            </div>
            <figcaption className={styles.portraitCaption}>SUMIYAKA</figcaption>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
