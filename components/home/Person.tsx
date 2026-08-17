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
            {/* 経歴＝2026-08-18 あおきさん提供の正本文＋9歳エピソード（語り口調は3段落目のみ許可） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.15}>
              9歳、スマホでもゲームでもなく、初めて触れたのはパソコンでした。インターネットやプログラミングはどうやって動いているのか——その関心を実際に手で動かし始めたのが15歳。ブログブームの中でWordPressとHTML/CSS/JavaScriptを独学し、オリジナルテーマを自作、サーバー契約からサイト公開まで自力でやり切って以来、「見るだけ」ではなく「作る側」で過ごしてきました。
            </ScrollReveal>
            <ScrollReveal as="p" className={styles.bio} delay={0.2}>
              その後、大手美容外科で社内SEとして社内・院内システムの2系統を7年間担当。正確性と守秘義務が求められる医療現場での経験が、業務ヒアリングと堅実な進行の基盤です。
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
