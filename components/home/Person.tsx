import Image from "next/image";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Person.module.css";

/**
 * どんな人か — an-a.html .sec-person の忠実移植。
 * 経歴文言は正本（an-a.html＝売り込み資料v1.1準拠）どおり一言一句不変。
 * 2026-08-17：full.html 手本の写真配置を追加（黒のまま＋profile.webp）。
 * 原画 800×766＝ほぼ正方形。原比率のまま表示（object-fit トリミングなし・縦長禁止）。
 * 静的 grayscale＋地色に沈めるフレーム（filter アニメ/blend 不使用＝iOS安定）。
 */
export default function Person() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.grid}>
          <div>
            <ScrollReveal as="p" className={styles.label}>
              どんな人か
            </ScrollReveal>
            <ScrollReveal as="p" className={styles.display}>
              15歳、作る側へ。
            </ScrollReveal>
            {/* 15歳エピソード＝2026-08-17 あおきさん本人提供（WP独学・ブログブーム・オリジナルテーマ公開・中学生） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.15}>
              独学のHTMLとWordPressから始めた。ブログブームのさなか、オリジナルテーマを自作し、ホームページの公開までひとりでやり切った。中学生の頃だ。
            </ScrollReveal>
            <ScrollReveal as="p" className={styles.bio} delay={0.2}>
              高校・大学で情報技術を専攻。22歳から7年、大手美容外科クリニックの社内SEとして、止まれば診療が止まるシステムを支えてきた。29歳で独立。
            </ScrollReveal>
            {/* AIスペシャリストとしての目標＝§7-4承認済み素材＋§2-4中核メッセージ（人生設計②準拠・開示線内） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.25}>
              仕事はこれから、AIにできないことをする側と、AIを使う側に分かれていく。私は、使う側でありたい。AIスペシャリストとして、ただツールを渡すだけでなく、AIを使いこなせる人材の育成までを仕事の軸にしている。
            </ScrollReveal>
          </div>
          <ScrollReveal as="figure" className={styles.portrait} delay={0.2}>
            <div className={styles.portraitFrame}>
              <Image
                src="/about/profile.webp"
                alt="墨家 / SUMIYAKA ポートレート"
                width={800}
                height={766}
                sizes="(max-width: 860px) 86vw, 400px"
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
