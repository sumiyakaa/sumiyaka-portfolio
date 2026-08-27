import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/animation/ScrollReveal";
import SubPageFVAnim from "@/components/animation/SubPageFVAnim";
import FVCircuitPattern from "@/components/animation/FVCircuitPattern";
import ToolMark from "@/components/tools/_marks/ToolMark";
import { getAllTools } from "@/lib/toolCatalog";
import { SITE_ORIGIN } from "@/lib/site";
import styles from "./page.module.css";

// OGカードのサムネイル。@vercel/og は WebP を描画できないため専用の og-2.jpg を渡す
// （T-01 を代表として使う。版付きファイル名＝白ベース化で差し替えた画像）
const OG_URL =
  "/api/og?title=TOOLS&sub=Tools%20that%20run%20in%20your%20browser" +
  `&img=${encodeURIComponent(`${SITE_ORIGIN}/tools/invoice/og-2.jpg`)}`;

export const metadata: Metadata = {
  title: "TOOLS — AKASHIKI | 業務の道具",
  description:
    "毎月くり返している事務作業を引き受ける、実際に動く道具を置いています。すべてブラウザの中だけで動き、読み込んだファイルは端末の外に出ません。Excel台帳からの請求書PDF一括作成ほか。",
  alternates: { canonical: "/tools" },
  openGraph: {
    // @vercel/og は日本語フォント未搭載のため、カードの文字は英字にしている
    images: [{ url: OG_URL, width: 1200, height: 630 }],
  },
};

export default function ToolsPage() {
  const tools = getAllTools();

  return (
    <main className={styles.page}>
      {/* ============ FV ============ */}
      <SubPageFVAnim className={styles.fv} targetLetterSpacing="0.25em">
        <div className={styles.fvBg}>
          <div className={styles.fvGrain} aria-hidden="true" />
          <div className={styles.fvScanline} aria-hidden="true" />
        </div>

        <FVCircuitPattern />

        <div className={styles.fvContent}>
          <h1 data-fv-title className={styles.fvTitle}>TOOLS</h1>
          <p data-fv-sub className={styles.fvSub}>触って確かめられる、業務の道具</p>
          <div data-fv-hr className={styles.fvHr} aria-hidden="true" />
        </div>

        <div className={styles.fvEdgeBl}>
          <span data-fv-edge className={styles.fvEdgeText}>TOOLS</span>
        </div>
        <div className={styles.fvEdgeBr}>
          <span data-fv-edge className={styles.fvEdgeText}>SCROLL</span>
        </div>
      </SubPageFVAnim>

      {/* ============ リード ============ */}
      <section className={styles.lead} aria-label="はじめに">
        <div className={styles.leadInner}>
          <ScrollReveal>
            <p className={styles.leadHead}>
              説明より、動くものを。
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className={styles.leadBody}>
              事務作業を仕組みに変える、という話は言葉だけでは伝わりません。
              ですから、実際に動くものを置いています。お手元のファイルで、その場で確かめてください。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ============ ツール一覧 ============ */}
      <section className={styles.list} aria-label="ツール一覧">
        <div className={styles.listInner}>
          <div className={styles.listHead}>
            <h2 className={styles.listTitle}>開発したツール</h2>
            <span className={styles.listCount}>{tools.length} TOOL{tools.length > 1 ? "S" : ""}</span>
          </div>
          {/* ⚠「クライアントへ納品した実績」と読ませないための一文。
              見出し「開発したツール」＋この説明で、言葉ではなく構造で区別する */}
          <p className={styles.listNote}>
            自社で開発したツールです。実際に動くものだけを置いています。
          </p>

          <ul className={styles.cards}>
            {tools.map((tool, i) => (
              <ScrollReveal as="li" key={tool.slug} className={styles.card} delay={i * 0.1}>
                {/* --card-accent＝1本1色のテーマ色（data/tools.ts）。番号・図像・ホバーの罫にだけ使う */}
                <Link
                  href={`/tools/${tool.slug}`}
                  className={styles.cardLink}
                  style={{ "--card-accent": tool.accent } as CSSProperties}
                >
                  {/* filter はアニメさせない（iOS/WebKit 安全）。
                      静的グレースケールの下地へカラーを opacity で重ねる */}
                  <div className={styles.cardThumb}>
                    <Image
                      src={tool.thumbnail}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="(max-width: 900px) 100vw, 620px"
                      className={`${styles.cardImg} ${styles.cardImgMono}`}
                    />
                    <Image
                      src={tool.thumbnail}
                      alt={`${tool.title} の画面`}
                      fill
                      sizes="(max-width: 900px) 100vw, 620px"
                      className={`${styles.cardImg} ${styles.cardImgColor}`}
                    />
                    <span className={styles.cardVeil} aria-hidden="true" />
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.cardHead}>
                      <ToolMark tool={tool.mark} size={26} className={styles.cardMark} />
                      <span className={styles.cardNo}>{tool.no}</span>
                    </span>
                    <h3 className={styles.cardTitle}>{tool.title}</h3>
                    <p className={styles.cardEn}>{tool.titleEn}</p>
                    <p className={styles.cardText}>{tool.description}</p>
                    <ul className={styles.cardTags}>
                      {tool.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                    <span className={styles.cardMore}>触ってみる →</span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ データを送らない設計 ============ */}
      <section className={styles.why} aria-label="ブラウザの中だけで動く理由">
        <div className={styles.whyInner}>
          <ScrollReveal>
            <h2 className={styles.whyTitle}>データは、御社のパソコンから出ません。</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className={styles.whyBody}>
              ここに置いている道具は、すべてブラウザの中だけで動きます。
              読み込んだ台帳も、作られたPDFも、外部のサーバーへは送られません。
              顧客名簿や売上のように、外に出せないファイルこそ、その場で試していただけます。
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className={styles.whyBody}>
              お渡しする仕組みも同じ考え方で作ります。
              預かって処理する形にしないこと自体が、いちばん確実な情報の守り方だと考えているからです。
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ============ 特注への導線 ============ */}
      <section className={styles.custom} aria-label="特注のツール制作">
        <div className={styles.customInner}>
          <ScrollReveal>
            <p className={styles.customLead}>
              御社の形に合わせた道具を作ります。
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className={styles.customBody}>
              ここに置いている汎用版は、整った台帳を前提にしています。
              実際の業務データは、会社ごとに形が違います。列の並び、表記のゆれ、例外の行。
              そこを読み解いて形を揃えるところからが、私の仕事です。
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <Link href="/contact" className={styles.customLink}>
              相談してみる →
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
