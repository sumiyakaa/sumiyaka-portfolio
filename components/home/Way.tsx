import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Way.module.css";

/**
 * 働き方（THE WAY・#way）— P9「働き方の前面化」(2026-08-27)。
 * FV「その意味を、見る」の飛び先。HomeIntro 直後に置く最初の紙（フルブリード白）。
 * 文言は正本 `P9_原稿_top_service_about.md` T-2 どおり一言一句不変。
 * 宣言「コンサルティングでは、ありません。」・社長の声2つ・答え＋現場写真は
 * 「いくら浮くか」(#value) から移設（見た目は page.module.css の旧クラスをそのまま複製）。
 * 出現は既存 ScrollReveal のみ＝新しいアニメーションは作らない。
 */
export default function Way() {
  return (
    <section id="way" className={styles.section}>
      <div className={styles.inner}>
        {/* 0-1. 英字ラベル（装飾）＋大見出し＋リード＋キッカー */}
        <ScrollReveal>
          <p className={styles.label} aria-hidden="true">
            THE WAY
          </p>
          {/* 句ごとに inline-block＝折り返しは読点の後でだけ起きる（語の途中で折れない） */}
          <h2 className={styles.valueLead}>
            <span className={styles.phrase}>新人を育てるように、</span>
            <span className={styles.phrase}>御社のAIを育てます。</span>
          </h2>
          <p className={styles.lead}>
            AIを「導入」して終わりにはしません。御社の仕事のやり方をAIに一つずつ教え込み、社員の方と並んで手を動かし、私がいなくても回る状態まで持っていく。そこまでが、私の仕事です。
          </p>
          <p className={styles.kicker}>コンサルティングでは、ありません。</p>
        </ScrollReveal>

        {/* 2. 社長の悩み2つ（声の形の引用）＝移設・不変 */}
        <ScrollReveal className={styles.valueVoices} delay={0.1}>
          <p className={styles.valueVoice}>
            「AIが話題になっている。でも、実際にどうしたらいいのか分からない。」
          </p>
          <p className={styles.valueVoice}>
            「社員にAIを渡した。でも、使い方までは教えられない。」
          </p>
        </ScrollReveal>

        {/* 3. 答え＋現場写真「対の額」＝移設・不変
            - 写真は実写（クライアント先での導入指導）。原比率1264×948・トリミングなし・CSSフィルタ不使用 */}
        <ScrollReveal className={styles.valueProof} delay={0.1}>
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
        </ScrollReveal>

        {/* 4. 3工程（PC 3カラム／SP 1カラム） */}
        <ScrollReveal className={styles.head}>
          <h3 className={styles.headTitle}>やることは、三つです。</h3>
        </ScrollReveal>
        <ol className={styles.steps}>
          <ScrollReveal as="li" className={styles.step}>
            <span className={styles.stepNo}>01</span>
            <h4 className={styles.stepTitle}>現場に入る</h4>
            <p className={styles.stepBody}>
              ヒアリング室ではなく、実際に作業している机の横で。誰が、どのファイルを、どの順で触っているか。本人も言葉にできない手順は、見に行けば分かります。
            </p>
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.step} delay={0.1}>
            <span className={styles.stepNo}>02</span>
            <h4 className={styles.stepTitle}>御社の仕事を、AIに教える</h4>
            <p className={styles.stepBody}>
              汎用のAIをそのまま渡しても、御社の業務は動きません。実際のファイルと判断の基準を一つずつ教え込み、御社専用の仕組みに育てます。一つの作業だけでなく、情報を集めてから出すまでの一連の流れで。
            </p>
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.step} delay={0.2}>
            <span className={styles.stepNo}>03</span>
            <h4 className={styles.stepTitle}>社員の方が回せる状態で、手を離す</h4>
            <p className={styles.stepBody}>
              一緒に実装し、手順書に落とし、使いこなせるようになるまで伴走します。ゴールは、私が要らなくなることです。
            </p>
          </ScrollReveal>
        </ol>

        {/* 5. 3段階（縦3行・左に丸数字・右に題字＋補足・①にタグ） */}
        <ScrollReveal className={styles.head}>
          <h3 className={styles.headTitle}>多くの会社は、いまここで止まっています。</h3>
        </ScrollReveal>
        <ol className={styles.stages}>
          <ScrollReveal as="li" className={styles.stage}>
            <span className={styles.stageNo}>①</span>
            <div className={styles.stageBody}>
              <p className={styles.stageTitle}>
                社員が、生成AIを個人で使っている
                <span className={styles.stageTag}>ほとんどの会社</span>
              </p>
              <p className={styles.stageNote}>文章の下書き、調べもの、壁打ち</p>
            </div>
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.stage} delay={0.1}>
            <span className={styles.stageNo}>②</span>
            <div className={styles.stageBody}>
              <p className={styles.stageTitle}>
                社内のデータや既存システムと繋がった、業務専用のAIがある
              </p>
              <p className={styles.stageNote}>
                見積・請求・台帳の照合などが、御社のファイルで動く
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.stage} delay={0.2}>
            <span className={styles.stageNo}>③</span>
            <div className={styles.stageBody}>
              <p className={styles.stageTitle}>
                AIがあることを前提に、仕事の進め方そのものを組み直している
              </p>
              <p className={styles.stageNote}>
                人は判断に集中し、集める・揃える・出すはAIが担う
              </p>
            </div>
          </ScrollReveal>
        </ol>

        {/* 6. 締め＋導線（/service） */}
        <ScrollReveal>
          <p className={styles.close}>
            ①で止まるのは、自然なことです。②③へ進むには、御社の業務を知っていて、AIも作れる人が要る。私がお手伝いするのは、①から③へ進む道です。
          </p>
          <p className={styles.more}>
            <Link href="/service" className={styles.moreLink}>
              進め方と、できないこと → /service
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
