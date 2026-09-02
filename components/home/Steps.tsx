import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import CountUp from "@/components/animation/CountUp";
import DrawRule from "@/components/animation/DrawRule";
import styles from "./Steps.module.css";

/**
 * 三段（THREE STEPS・#steps）— P10「三段の梯子」(2026-09-02)／**P11「減量」で改稿 (2026-09-03)**。
 * Way の直後に置き、同じ紙（--paper-white）を続ける＝新しい色境界を作らない。
 * 1段目＝御社専用の道具（オフライン・データを出さない）／2段目＝その道具をAIに使わせる／
 * 3段目＝社員の方が自分で作れるようになる。
 * `/service` の「御社は、いまどの段階ですか。」(①②③) と同じ梯子を、提供側から見せたもの。
 *
 * P11 の変更（あおきさん指示 2026-09-03）：
 *  - 文量を約半分へ（冗長な言い換え・SaaS の来歴の段落を落とし、要点だけ残す）
 *  - **漢数字「一/二/三」→ 算用数字「1/2/3」**（見出し・締めの「◯段目」も同様）
 *  - 単調な等幅3行をやめ、大きな数字＋PC の段差（梯子）で上下のリズムを作る
 *  - 出現は既存 ScrollReveal のみ（direction 違いを使うだけ＝新しいアニメーションは作らない）
 * 末尾の /service リンクは Way から移設（同じ導線を隣接して2回置かない）。
 */

type Step = {
  no: string;
  tag: string;
  title: string;
  bodies: string[];
  /**
   * 各段の囲み。3段とも同じ体裁で置く（1段目だけ有って不揃い、というのを解消）。
   * ⚠ 数値を出すのは実測がある1段目だけ。2・3段目は種類の違う中身を、同じ枠で見せる。
   *   （tag でどういう性質の情報かを明示する＝実測 / 例 / お渡しするもの）
   */
  note: {
    tag: string;
    /** 大きく置く語。1段目だけ CountUp の数字が入る */
    lead?: string;
    leadLabel?: string;
    ratio?: string;
    body: string;
    foot?: string;
  };
};

const STEPS: Step[] = [
  {
    no: "1",
    tag: "AIは、まだ入れません",
    title: "御社専用の道具を、渡す",
    bodies: [
      "汎用のソフトに業務を合わせるのではなく、いま使っているファイルの形に道具を合わせます。AIが道具を作る手間を下げたことで、一社のためだけに作ることが現実的になりました。",
      "動くのは御社のパソコンの中だけ。インターネットに繋がっていなくても動き、データはどこにも出ません。",
    ],
    note: {
      tag: "実測",
      leadLabel: "手作業からの削減",
      ratio: "20時間 → 4時間",
      body: "公開中の6本のツールと同じ処理を、500件規模のデータで実測。手作業なら合わせて20時間ちかい仕事が、人が確認する時間を入れても4時間ほど。減るのは、そのうちの約8割です。",
      foot: "初回の構築にかかる時間は含みません。判断が要るものは、人へ返します。",
    },
  },
  {
    no: "2",
    tag: "頼めば、終わっている",
    title: "その道具を、AIに使わせる",
    bodies: [
      "作った道具を社内のデータや既存のシステムと繋ぎ、御社の仕事のやり方を覚えたAIに使わせます。開いて、探して、貼り付けて——その手順ごと、要らなくなります。",
    ],
    note: {
      tag: "例",
      lead: "「今月分の請求書を」",
      leadLabel: "の一言で終わる",
      body: "台帳を開く／取引先ごとに分ける／1件ずつPDFにする／保存先へ仕分ける。1段目の道具でも消えるのは操作の手間までで、いつ・何を渡すかは人が決めていました。ここを任せます。",
      foot: "人が見るのは、出来上がったものだけになります。",
    },
  },
  {
    no: "3",
    tag: "私が、要らなくなる",
    title: "社員の方が、自分で作れる",
    bodies: [
      "次に何か始めるとき、私を呼ばずに社員の方が形にできる状態まで。ここまで来ると、仕組みは御社の中で増えていきます。",
    ],
    note: {
      tag: "お渡しするもの",
      lead: "道具 ／ 手順書 ／ 作り方",
      body: "納めるのは道具だけではありません。どう考えて作ったのかを手順書に残し、社員の方が同じものを作れるところまで一緒にやります。",
      foot: "次に必要になったとき、私を呼ばずに済みます。",
    },
  },
];

export default function Steps() {
  return (
    <section id="steps" className={styles.section}>
      <div className={styles.inner}>
        <ScrollReveal>
          <p className={styles.label} aria-hidden="true">
            THREE STEPS
          </p>
          {/* 句ごとに inline-block＝折り返しは読点の後でだけ起きる（語の途中で折れない） */}
          <h2 className={styles.title}>
            <span className={styles.phrase}>1段目は、</span>
            <span className={styles.phrase}>AIを入れません。</span>
          </h2>
          <p className={styles.lead}>
            AI導入には、段階があります。いきなり全部を変えようとすると、たいてい途中で止まる。
            <span className={styles.leadStrong}>
              どの段から始めても、どの段で止めても構いません。
            </span>
          </p>
        </ScrollReveal>

        <ol className={styles.list}>
          {STEPS.map((step, i) => (
            <ScrollReveal
              as="li"
              key={step.no}
              className={styles.row}
              direction="right"
              delay={i === 0 ? 0 : 0.08}
            >
              <span className={styles.numCell} aria-hidden="true">
                <DrawRule className={styles.ruleThick} duration={0.6} delay={0.1} />
                <span className={styles.num}>{step.no}</span>
              </span>
              <div className={styles.body}>
                <DrawRule className={styles.ruleThin} duration={1} delay={0.2} />
                <p className={styles.tag}>{step.tag}</p>
                <h3 className={styles.name}>{step.title}</h3>
                {step.bodies.map((text) => (
                  <p key={text} className={styles.text}>
                    {text}
                  </p>
                ))}

                {/* 3段とも同じ体裁の囲みを置く。
                    ⚠ 数値を出すのは実測がある1段目だけ。2・3段目は「例」「お渡しするもの」＝
                      種類の違う中身を同じ枠で見せる（枠の左上の小さな札で性質を明示する）。 */}
                <div className={styles.figure}>
                  <p className={styles.figureTag}>{step.note.tag}</p>
                  <p className={styles.figureHead}>
                    {i === 0 ? (
                      <span className={styles.figureNum}>
                        <CountUp value={8} prefix="約" suffix="割" duration={1.2} delay={0.3} />
                      </span>
                    ) : (
                      <span className={styles.figureLead}>{step.note.lead}</span>
                    )}
                    {step.note.leadLabel && (
                      <span className={styles.figureLabel}>{step.note.leadLabel}</span>
                    )}
                  </p>
                  {step.note.ratio && (
                    <p className={styles.figureRatio}>{step.note.ratio}</p>
                  )}
                  <p className={styles.figureBody}>{step.note.body}</p>
                  {step.note.foot && (
                    <p className={styles.figureNote}>{step.note.foot}</p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </ol>

        <ScrollReveal className={styles.closeBlock}>
          <DrawRule className={styles.closeRule} duration={1.1} delay={0.05} />
          <p className={styles.close}>
            いきなり3段目に立てる会社は、ありません。1段目だけでも、手作業は確かに減ります。
          </p>
          <p className={styles.closeSub}>
            まずは、いま御社がどこにいるかを一緒に確かめるところから。
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
