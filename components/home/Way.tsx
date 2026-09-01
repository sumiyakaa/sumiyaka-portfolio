import Image from "next/image";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Way.module.css";

/**
 * 働き方（THE WAY・#way）— P9「働き方の前面化」(2026-08-27)。
 * FV「その意味を、見る」の飛び先。HomeIntro 直後に置く最初の紙（フルブリード白）。
 * 文言は正本 `P9_原稿_top_service_about.md` T-2 どおり一言一句不変。
 * 宣言「コンサルティングでは、ありません。」・社長の声2つ・答え＋現場写真は
 * 「いくら浮くか」(#value) から移設（見た目は page.module.css の旧クラスをそのまま複製）。
 * 出現は既存 ScrollReveal のみ＝新しいアニメーションは作らない。
 * P10（2026-09-02）＝末尾の /service 枠ボタンは直後の Steps（#steps）へ移設した
 * （同じ導線を隣接して2回置かない）。それ以外の文言・構成は不変。
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
            AIの「導入」は、入口にすぎません。御社の仕事のやり方をAIに一つずつ教え込み、社員の方と並んで手を動かし、私がいなくても回る状態まで持っていきます。
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
            助言や資料だけを納めることは、しません。御社の業務を仕組みに変え、社員の方と一緒に手を動かし、使いこなせるようになるまで教える——そこまでが、私の仕事です。
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
              汎用のAIをそのまま渡しても、御社の業務は動きません。実際のファイルと判断の基準を一つずつ教え込み、御社専用の仕組みに育てます。一つの作業だけでなく、情報を集めてから出すまでの一連の流れを、まるごと任せられる形にします。
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

        {/* 5. 安心して任せられるか（セキュリティと信頼＝経歴から・D-T） */}
        <ScrollReveal className={styles.head}>
          <h3 className={styles.headTitle}>安心して、任せられますか。</h3>
        </ScrollReveal>
        <ScrollReveal delay={0.05}>
          <p className={styles.trustAsk}>
            AI導入をためらう理由の多くは、機能ではなく不安です。何も考えずに使えば、情報は外に漏れる。セキュリティの知識がないままAIでプログラムを組めば、動いてはいても穴が残る。想定外が起きたとき、誰が対処するのか。
          </p>
          <p className={styles.trustAnswer}>
            私は大手美容外科クリニックで、社内・院内システムとサーバーの保守を7年間担当しました。止まれば診療が止まり、漏れれば人体の情報という最上級のプライバシーが漏れる現場です。高校・大学で体系立てて学んだ情報技術と、その現場で身についた「止めない・漏らさない」作り方に、最新のAIを掛け合わせて仕事をしています。
          </p>
        </ScrollReveal>
        <ul className={styles.trustList}>
          <ScrollReveal as="li" className={styles.trustItem}>
            AIに何を渡し、何を渡さないかを、先に決める
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.trustItem} delay={0.1}>
            どこまで自動で動かし、どこで止めるかを、設計する
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.trustItem} delay={0.2}>
            想定外が起きたときの対処を、社員の方が自分でできる状態にする
          </ScrollReveal>
        </ul>

        {/* 6. 締め（AI歴＝2022年12月から仕事で・4年目）。導線は Steps 末尾へ（P10） */}
        <ScrollReveal>
          <p className={styles.close}>
            私自身、2022年12月のChatGPT公開初日から、仕事でAIを使い続けて4年目です。医療機関の中で使う以上、何を渡さないかから決めました。御社にお渡しするのは、私が自分で守ってきた使い方です。
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
