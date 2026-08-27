import Link from "next/link";
import Image from "next/image";
import HomeIntro from "@/components/home/HomeIntro";
import Atari from "@/components/home/Atari";
import Deguchi from "@/components/home/Deguchi";
import PickUpWorks from "@/components/home/PickUpWorks";
import PriceAnim from "@/components/home/PriceAnim";
import PriceRunner from "@/components/home/PriceRunner";
import BoundaryFigure from "@/components/home/BoundaryFigure";
import Person from "@/components/home/Person";
import CtaSection from "@/components/home/CtaSection";
import { getPickUpWorks } from "@/lib/works";
import { getPickUpTools } from "@/lib/toolCatalog";
import styles from "./page.module.css";

export default function Home() {
  // 件数はハードコードせず、作品データから毎回集計する（作品追加で自動追従）
  const pickupWorks = getPickUpWorks();
  // 02 ツール制作の枠。0件なら PickUpWorks 側が「準備中」プレートに戻る
  const pickupTools = getPickUpTools();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "墨家 / SUMIYAKA — 灯敷（AKASHIKI）",
    url: "https://akashiki.com",
    description:
      "バラバラな事務作業を、ひとりでに回る仕組みに変えます。業務の自動化・ツール開発、Web制作、AI導入の設計・教育。設計から実装・公開まで、すべて一人で対応。",
    publisher: {
      "@type": "Organization",
      name: "灯敷（AKASHIKI）",
      alternateName: "墨家 / SUMIYAKA",
    },
    inLanguage: "ja",
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* 1. Hero（OP→Hero の配線は HomeIntro＝子CC-E提供） */}
      <HomeIntro />

      {/* 2. マーキー帯A＝削除（2026-08-16 あおきさん指示「FV下のスクロール文字はAI臭の典型のため削除」。帯Bの扱いは確認中） */}

      {/* 3. 言い当て */}
      <Atari />

      {/* 4. できること（3つの出口） */}
      <Deguchi />

      {/* 5. 制作実績（Pickup） */}
      <PickUpWorks works={pickupWorks} tools={pickupTools} />

      {/* 6. いくら浮くか（掘り下げ構成・2026-08-18 REVIEW2）
          - id="value"（FV「その意味を、見る」の飛び先）は PriceAnim が section を
            描画する都合上、ラッパー div に付与（PriceAnim は変更禁止）
          - PriceRunner の動き・発火・[data-price-amount] 契約は不変 */}
      <div id="value" className={styles.valueAnchor}>
        <PriceAnim className={styles.priceSection}>
          <PriceRunner />
          <div className={styles.priceInner}>
            {/* 1. 大見出し（ページ内最大級の宣言） */}
            <h2 className={styles.valueLead}>コンサルティングでは、ありません。</h2>

            {/* 2. 社長の悩み2つ（声の形の引用） */}
            <div className={styles.valueVoices}>
              <p className={styles.valueVoice}>
                「AIが話題になっている。でも、実際にどうしたらいいのか分からない。」
              </p>
              <p className={styles.valueVoice}>
                「社員にAIを渡した。でも、使い方までは教えられない。」
              </p>
            </div>

            {/* 3. 答え＋現場写真「対の額」（2026-08-18 あおきさん選定＝案1・墨デュオトーン焼き込み）
                - 「どんな人か」黒地のオフセット額を白紙に反転＝罫は紙上の罫線色
                - 写真は実写（クライアント先での導入指導）。原比率1264×948・トリミングなし・CSSフィルタ不使用 */}
            <div className={styles.valueProof}>
              <p className={styles.valueAnswer}>
                助言や資料だけを納めることは、しません。御社の業務を仕組みに変え、社員と一緒に手を動かし、使いこなせるようになるまで教える——そこまでが、私の仕事です。
              </p>
              <figure className={styles.proofFig}>
                <div className={styles.proofFrame}>
                  <Image
                    src="/home/teaching.webp"
                    alt="クライアント先での導入指導の様子"
                    width={1264}
                    height={948}
                    sizes="(max-width: 860px) 86vw, 420px"
                    className={styles.proofImg}
                  />
                </div>
                <figcaption className={styles.proofCaption}>クライアント先での導入指導</figcaption>
              </figure>
            </div>

            {/* 4. 中見出し（既存・[data-price-header] 契約維持） */}
            <div data-price-header className={styles.priceHead}>
              <h3 className={styles.priceTitle}>
                いくらかかるかより先に、いくら浮くか。
              </h3>
            </div>

            {/* 5. 逆算3行（既存・[data-price-card]/[data-price-amount] 契約維持） */}
            <div className={styles.priceRows}>
              <div data-price-card className={styles.priceRow}>
                <span className={styles.priceLabel}>月20時間の削減</span>
                <span className={styles.priceLeader} aria-hidden="true" />
                <span className={styles.priceArrow}>→</span>
                <span data-price-amount className={styles.priceAmount}>年 約50万円</span>
              </div>
              <div data-price-card className={styles.priceRow}>
                <span className={styles.priceLabel}>事務作業の30%を自動化</span>
                <span className={styles.priceLeader} aria-hidden="true" />
                <span className={styles.priceArrow}>→</span>
                <span data-price-amount className={styles.priceAmount}>年 約120万円</span>
              </div>
              <div data-price-card className={styles.priceRow}>
                <span className={styles.priceLabel}>1人分の業務を丸ごと</span>
                <span className={styles.priceLeader} aria-hidden="true" />
                <span className={styles.priceArrow}>→</span>
                <span data-price-amount className={styles.priceAmount}>年 約400万円</span>
              </div>
            </div>

            {/* 6. 注記（既存）— Web制作の料金表は /works#price（C4 実施済み・P6-1）
                P6-4＝できないこと・進め方・料金の考え方の本体は /service に置いたので導線を足す */}
            <p className={styles.priceNote}>
              価格は、削減額から逆算してご提案します。できないこと・進め方・料金の考え方は
              <Link href="/service" className={styles.priceNoteLink}>サービスページ</Link>
              へ、Web制作の料金は
              <Link href="/works#price" className={styles.priceNoteLink}>Web制作ページ</Link>
              へ。
            </p>
          </div>
        </PriceAnim>
      </div>

      {/* 7. Boundary Easter Egg（位置・動き不変） */}
      <BoundaryFigure />

      {/* 8. マーキー帯B＝削除（2026-08-17 あおきさん決定「帯は全廃」） */}

      {/* 9. どんな人か */}
      <Person />

      {/* 10. CTA */}
      <CtaSection />
    </main>
  );
}
