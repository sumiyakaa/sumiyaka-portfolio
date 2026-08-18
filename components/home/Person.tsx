import Image from "next/image";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Person.module.css";

/**
 * どんな人か — an-a.html .sec-person の忠実移植。
 * 経歴文言は正本（an-a.html＝売り込み資料v1.1準拠）どおり一言一句不変。
 * 2026-08-18：写真を新portrait.webpへ差し替え（§14-1 G2「不自然なら別途用意」の実行）。
 * 原画 1200×900＝4:3横長。原比率のまま表示（object-fit トリミングなし・縦長禁止）。
 * 彩度−15%はアセットに焼き込み済み＝CSSフィルタ不使用（全デバイス同一表示・iOS安定）。
 * /about は旧 profile.webp のまま（別アセット＝キャッシュ罠も回避）。
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
            {/* 経歴＝2026-08-18 あおきさん提供の正本文＋9歳エピソード（語り口調は3段落目のみ許可）
                学歴文＝2026-08-18追加（正本「学歴」行準拠＝高校(情報技術科)→理系大学まで情報技術専攻。独学のままの誤認を防ぐ） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.15}>
              9歳、スマホでもゲームでもなく、初めて触れたのはパソコンでした。インターネットやプログラミングはどうやって動いているのか——その関心を実際に手で動かし始めたのが15歳。ブログブームの中でWordPressとHTML/CSS/JavaScriptを独学し、オリジナルテーマを自作、サーバー契約からサイト公開まで自力でやり切って以来、「見るだけ」ではなく「作る側」で過ごしてきました。高校は情報技術科、大学も理系で情報技術を専攻し、プログラミングの基礎を体系立てて学びました。
            </ScrollReveal>
            <ScrollReveal as="p" className={styles.bio} delay={0.2}>
              卒業後は、大手美容外科で社内SEとして社内・院内システムの2系統を7年間担当。正確性と守秘義務が求められる医療現場での経験が、業務ヒアリングと堅実な進行の基盤です。
            </ScrollReveal>
            {/* AIスペシャリストとしての目標＝§7-4承認済み素材＋§2-4中核メッセージ（人生設計②準拠・開示線内） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.25}>
              仕事はこれから、AIにできないことをする側と、AIを使う側に分かれていく。私は、使う側でありたい。AIスペシャリストとして、ただツールを渡すだけでなく、AIを使いこなせる人材の育成までを仕事の軸にしている。
            </ScrollReveal>
          </div>
          <ScrollReveal as="figure" className={styles.portrait} delay={0.2}>
            <div className={styles.portraitFrame}>
              <Image
                src="/home/portrait.webp"
                alt="墨家 / SUMIYAKA ポートレート"
                width={1200}
                height={900}
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
