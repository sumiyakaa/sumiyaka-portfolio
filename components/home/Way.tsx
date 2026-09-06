import Image from "next/image";
import ScrollReveal from "@/components/animation/ScrollReveal";
import DrawRule from "@/components/animation/DrawRule";
import Highlight from "@/components/animation/Highlight";
import SectionMark from "@/components/fv/top-body/SectionMark";
import tb from "@/components/fv/top-body/top-body.module.css";
import WaySteps from "./WaySteps";
import styles from "./Way.module.css";

/**
 * 働き方（THE WAY・#way）— P9（2026-08-27）→ **P12「1画面1メッセージ」で作り直し（2026-09-06）**。
 * FV「その意味を、見る」の飛び先。文言は正本 `P12_原稿_減量差分.md` トップ THE WAY の
 * 【可視】どおり（削除指示の文は載せない・詳細は WaySteps の Disclose へ）。
 *
 * 型：章番号 → h2（一句ずつ着地）→ 社長の2声 → 要約の板（大きく・落ち影）＋現場写真
 *     → 対比「コンサルティングでは、ありません。」（墨のマーカー）→ 3工程（縦のレール）。
 * 地：暖黒 × 灯（左上の暈）。白転調はここでは使わない（紙は「いくら浮くか」だけ）。
 * P11 の「3枚が上下に揺れる」は廃止（レールの灯に置き換え）。
 * 「安心して、任せられますか。」は独立ブロック（components/home/Trust・#trust-top）へ移設。
 */
export default function Way() {
  return (
    <section
      id="way"
      data-top-section="01"
      data-top-label="THE WAY"
      className={`${tb.section} ${tb.washTop} ${styles.section}`}
    >
      <div className={tb.inner}>
        <ScrollReveal>
          <SectionMark no="01" label="THE WAY" />
        </ScrollReveal>

        {/* h2＝句ごとに着地（Atari の作法） */}
        <h2 className={tb.h2}>
          <ScrollReveal as="span" className={tb.phrase}>
            新人を育てるように、
          </ScrollReveal>
          <ScrollReveal as="span" className={tb.phrase} delay={0.18}>
            御社のAIを育てます。
          </ScrollReveal>
        </h2>

        {/* 社長の2声（読者の心の声＝残す・小さく引用体で） */}
        <ScrollReveal className={styles.voices} delay={0.1}>
          <p className={styles.voice}>
            「AIが話題になっている。でも、実際にどうしたらいいのか分からない。」
          </p>
          <p className={styles.voice}>
            「社員にAIを渡した。でも、使い方までは教えられない。」
          </p>
        </ScrollReveal>

        {/* 要約の板＋現場写真（PC＝2カラム／SP＝縦積み） */}
        <div className={styles.proof}>
          <ScrollReveal className={`${tb.plate} ${styles.plate}`} delay={0.05}>
            <p className={tb.summary}>
              AIを「入れる」のではなく、御社の仕事のやり方を教え込む。社員の方が自分で回せるようになったら、私は手を離します。
            </p>
            <p className={styles.kicker}>
              <Highlight delay={0.2}>コンサルティングでは、ありません。</Highlight>
            </p>
            <p className={`${tb.body} ${styles.sub}`}>
              助言や資料を納めて終わりにせず、社員の方と一緒に手を動かします。
            </p>
          </ScrollReveal>

          {/* 写真は実写（原比率1264×948・トリミングなし・CSSフィルタ不使用） */}
          <ScrollReveal as="figure" className={styles.fig} delay={0.15}>
            <div className={styles.frame}>
              <Image
                src="/home/teaching.webp"
                alt="クライアント先での導入指導の様子"
                width={1264}
                height={948}
                sizes="(max-width: 860px) 86vw, 420px"
                className={styles.img}
              />
            </div>
            <figcaption className={styles.caption}>クライアント先での導入指導</figcaption>
          </ScrollReveal>
        </div>

        {/* 3工程 */}
        <ScrollReveal className={styles.head}>
          <DrawRule className={styles.headRule} duration={0.6} delay={0.1} />
          <h3 className={styles.headTitle}>やることは、三つです。</h3>
        </ScrollReveal>
        <WaySteps />
      </div>
    </section>
  );
}
