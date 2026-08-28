import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Person.module.css";

/**
 * どんな人か — an-a.html .sec-person の忠実移植。
 * 経歴文言は正本（an-a.html＝売り込み資料v1.1準拠）どおり一言一句不変。
 * 2026-08-18：写真を新portrait.webpへ差し替え（§14-1 G2「不自然なら別途用意」の実行）
 * →同日、あおきさん指示「画像を大きく」＝4:5縦位置クロップ portrait-tall.webp へ再差し替え（案Aベース）。
 * 原画 869×1086＝4:5（設計書の許容「正方形〜4:5」の範囲内・これ以上の縦長は禁止）。
 * 額(オフセット罫線)・縁の沈み込み・SUMIYAKAキャプション(左下)は現行意匠を維持。
 * 彩度−15%はアセットに焼き込み済み＝CSSフィルタ不使用（全デバイス同一表示・iOS安定）。
 * /about は旧 profile.webp のまま（別アセット＝キャッシュ罠も回避）。旧 portrait.webp は未参照で残置。
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
            {/* 経歴＝2026-08-18 あおきさん提供の正本文（語り口調は末尾段落のみ許可）
                独立文＝2026-08-19追加（正本「29歳〜独立」準拠。年齢感が30代と伝わるように＝あおきさん指示）
                2026-08-19改稿＝「人体の情報という最上級のプライバシー」＋「だからこそ保守はセキュリティ最重視」（あおきさん指示・文量は抑える）
                2026-08-27 P6-4＝トップの情報量を落として導線を確保（あおきさん一任）。
                  9歳〜15歳〜学歴の段落は /about の年表へ移し、ここは「7年の現場」と「AIを使う側」の2段落＋/about への導線だけにする。
                  文言は一言一句そのまま（段落の削除と導線の追加のみ） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.15}>
              15歳で作る側に回り、大学卒業後、大手美容外科で社内・院内SEとして2系統のシステムを7年間担当。人体の情報という最上級のプライバシーを扱う医療現場での経験が、業務ヒアリングと堅実な進行の基盤です。だからこそ、システムの保守ではセキュリティを何より重視しています。29歳で独立し、現在に至ります。
            </ScrollReveal>
            {/* AIスペシャリストとしての目標＝§7-4承認済み素材＋§2-4中核メッセージ（人生設計②準拠・開示線内） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.2}>
              仕事はこれから、AIにできないことをする側と、AIを使う側に分かれていく。私は、使う側でありたい。AIスペシャリストとして、ただツールを渡すだけでなく、AIを使いこなせる人材の育成までを仕事の軸にしている。
            </ScrollReveal>
            {/* P9（2026-08-27）＝3段落目「人と人のつながり」（正本 T-6・安心材料） */}
            <ScrollReveal as="p" className={styles.bio} delay={0.25}>
              それでも、仕事は人と人との間に生まれる。効率だけでは推し量れないもの——顔を合わせて分かること、言葉にならない気遣い、長く付き合うから生まれる信頼。AIで速くなった分は、そこに使いたい。
            </ScrollReveal>
            {/* 導線（P6-4）＝経歴の物語・年表・信条・引き受けないことは /about に置く */}
            <ScrollReveal as="p" className={styles.more} delay={0.3}>
              <Link href="/about" className={styles.moreLink}>
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
