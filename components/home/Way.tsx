import Image from "next/image";
import ScrollReveal from "@/components/animation/ScrollReveal";
import CountUp from "@/components/animation/CountUp";
import DrawRule from "@/components/animation/DrawRule";
import InViewGate from "@/components/animation/InViewGate";
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
          <DrawRule className={styles.headRule} duration={0.6} delay={0.1} />
          <h3 className={styles.headTitle}>やることは、三つです。</h3>
        </ScrollReveal>
        {/* P11・2026-09-03＝3枚が常にゆっくり上下に揺れる（あおきさん指示）。
            ⚠ 揺れは内側の .float に当てる。.step は ScrollReveal が transform を持っており、
              同じ要素に CSS アニメを当てるとインラインstyleより強いので出現演出を壊す。
            ⚠ 既定は paused。InViewGate が画面内のあいだだけ .stepsLive を付ける＝
              見えていない間・背面タブでは本当に止まる。 */}
        <InViewGate as="ol" className={styles.steps} activeClassName={styles.stepsLive}>
          <ScrollReveal as="li" className={styles.step}>
            <div className={styles.float}>
              <span className={styles.stepNo}>01</span>
              <h4 className={styles.stepTitle}>現場に入る</h4>
              <p className={styles.stepBody}>
                ヒアリング室ではなく、実際に作業している机の横で。誰が、どのファイルを、どの順で触っているか。本人も言葉にできない手順は、見に行けば分かります。
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.step} delay={0.1}>
            <div className={styles.float}>
              <span className={styles.stepNo}>02</span>
              <h4 className={styles.stepTitle}>御社の仕事を、AIに教える</h4>
              <p className={styles.stepBody}>
                汎用のAIをそのまま渡しても、御社の業務は動きません。実際のファイルと判断の基準を一つずつ教え込み、御社専用の仕組みに育てます。一つの作業だけでなく、情報を集めてから出すまでの一連の流れを、まるごと任せられる形にします。
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.step} delay={0.2}>
            <div className={styles.float}>
              <span className={styles.stepNo}>03</span>
              <h4 className={styles.stepTitle}>社員の方が回せる状態で、手を離す</h4>
              <p className={styles.stepBody}>
                一緒に実装し、手順書に落とし、使いこなせるようになるまで伴走します。ゴールは、私が要らなくなることです。
              </p>
            </div>
          </ScrollReveal>
        </InViewGate>

        {/* 5. 安心して任せられるか（セキュリティと信頼＝経歴から・D-T）
            P11「減量」2026-09-03＝問いは3つの短文へ、経歴は下の「経歴票」へ、
            約束3行は横並びの短句へ。文量を落として、要点だけが残るようにした。 */}
        <ScrollReveal className={styles.head}>
          <DrawRule className={styles.headRule} duration={0.6} delay={0.1} />
          <h3 className={styles.headTitle}>安心して、任せられますか。</h3>
        </ScrollReveal>
        <ScrollReveal delay={0.05}>
          <p className={styles.trustAsk}>
            ためらう理由は、たいてい機能ではなく不安です。
            <span className={styles.trustAskLine}>情報は、漏れないか。</span>
            <span className={styles.trustAskLine}>作ったものに、穴は残らないか。</span>
            <span className={styles.trustAskLine}>想定外が起きたとき、誰が対処するのか。</span>
          </p>
        </ScrollReveal>

        {/* 経歴票（奥付のような小さな台帳）＝P11・2026-09-03 で作り直し。
            旧：「7」を86pxまで大きくして見出しにしていたが、経歴は統計値ではないので
            数字を主役にするのは形が合わない（あおきさん指摘）。項目と値の台帳に改め、
            本文の1文目（クリニック名と担当）は票に移して重複を消した。 */}
        <ScrollReveal className={styles.trustProof} delay={0.05}>
          <dl className={styles.record}>
            <DrawRule className={styles.recordRule} delay={0.1} />
            <div className={styles.recordRow}>
              <dt className={styles.recordKey}>現場</dt>
              <dd className={styles.recordVal}>大手美容外科クリニック</dd>
            </div>
            <div className={styles.recordRow}>
              <dt className={styles.recordKey}>担当</dt>
              <dd className={styles.recordVal}>院内システム・サーバー保守</dd>
            </div>
            <div className={styles.recordRow}>
              <dt className={styles.recordKey}>在籍</dt>
              <dd className={`${styles.recordVal} ${styles.recordTerm}`}>
                <CountUp value={7} duration={1} delay={0.35} suffix="年" />
              </dd>
            </div>
          </dl>
          <p className={styles.trustAnswer}>
            止まれば診療が止まり、漏れれば人体の情報という最上級のプライバシーが漏れる現場でした。そこで身についた「止めない・漏らさない」作り方に、AIを掛けています。
          </p>
        </ScrollReveal>

        <ul className={styles.trustList}>
          <ScrollReveal as="li" className={styles.trustItem} direction="right">
            <DrawRule className={styles.trustItemRule} duration={0.5} delay={0.15} />
            何を渡し、何を渡さないかを、先に決める
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.trustItem} direction="right" delay={0.08}>
            <DrawRule className={styles.trustItemRule} duration={0.5} delay={0.25} />
            どこまで自動で動かし、どこで止めるかを、設計する
          </ScrollReveal>
          <ScrollReveal as="li" className={styles.trustItem} direction="right" delay={0.16}>
            <DrawRule className={styles.trustItemRule} duration={0.5} delay={0.35} />
            想定外の対処を、社員の方ができる状態にする
          </ScrollReveal>
        </ul>

        {/* 6. 締め（AI歴＝2022年12月から仕事で・4年目／2026年12月に「4年」へ更新）。
            導線は Steps 末尾へ（P10） */}
        <ScrollReveal as="p" className={styles.close}>
          <span className={styles.closeDate}>2022.12 —</span>
          <span className={styles.closeText}>
            ChatGPT公開初日から、仕事で使い続けて4年目。医療機関の中で使う以上、何を渡さないかから決めました。
          </span>
        </ScrollReveal>
      </div>
    </section>
  );
}
