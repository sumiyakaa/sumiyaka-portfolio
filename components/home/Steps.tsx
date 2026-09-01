import Link from "next/link";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./Steps.module.css";

/**
 * 三段（THREE STEPS・#steps）— P10「三段の梯子」(2026-09-02)。
 * Way の直後に置き、同じ紙（--paper-white）を続ける＝新しい色境界を作らない。
 * 文言は正本 `P10_原稿_三段.md` T10-1 どおり一言一句不変。
 * 一段目＝御社専用の道具（オフライン・データを出さない）／二段目＝その道具をAIに使わせる／
 * 三段目＝社員の方が自分で作れるようになる。
 * `/service` の「御社は、いまどの段階ですか。」(①②③) と同じ梯子を、提供側から見せたもの。
 * 出現は既存 ScrollReveal のみ＝新しいアニメーションは作らない。
 * 末尾の /service リンクは Way から移設（同じ導線を隣接して2回置かない）。
 */

type Step = {
  mark: string;
  title: string;
  tag: string;
  bodies: string[];
};

const STEPS: Step[] = [
  {
    mark: "一",
    title: "御社専用の道具を、お渡しする",
    tag: "AIは、まだ入れなくて構いません",
    bodies: [
      "汎用のソフトに業務を合わせるのではなく、御社がいま使っているファイルの形に合わせて道具を作ります。この役目は長いあいだクラウドのサービスが担ってきましたが、あちらは多くの会社に共通する形へ業務を寄せる作りです。AIが道具を作る手間を大きく下げたことで、一社のためだけに作ることが現実的になりました。",
      "お渡しする道具は、御社のパソコンの中だけで動きます。インターネットに繋がっていなくても動き、データはどこにも出ません。私の手元にも届きません。",
    ],
  },
  {
    mark: "二",
    title: "その道具を、AIに使わせる",
    tag: "「〇〇の作業をお願いします」で終わる",
    bodies: [
      "一段目で作った道具を、社内のデータや既存のシステムと繋ぎ、御社の仕事のやり方を覚えたAIに使わせます。ファイルを開いて、探して、貼り付けて——という手順そのものが要らなくなります。頼めば、終わっている。そこまで持っていきます。",
    ],
  },
  {
    mark: "三",
    title: "社員の方が、自分で作れるようになる",
    tag: "私が、要らなくなる",
    bodies: [
      "新しく何かを始めるときに、私を呼ばなくても、社員の方が自分でAIを使って形にできる状態にします。ここまで来ると、仕組みは御社の中で増えていきます。教えるところまでを仕事にしているのは、そのためです。",
    ],
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
            <span className={styles.phrase}>一段目は、</span>
            <span className={styles.phrase}>AIを入れません。</span>
          </h2>
          <p className={styles.lead}>
            AI導入には、段階があります。いきなり全部を変えようとすると、たいてい途中で止まります。まず道具だけをお渡しし、次にその道具をAIに使わせ、最後は社員の方が自分で作れるようにする。どの段から始めても、どの段で止めても構いません。
          </p>
        </ScrollReveal>

        <ol className={styles.list}>
          {STEPS.map((step, i) => (
            <ScrollReveal
              as="li"
              key={step.mark}
              className={styles.row}
              delay={i === 0 ? 0 : 0.1}
            >
              <span className={styles.mark} aria-hidden="true">
                {step.mark}
              </span>
              <div className={styles.body}>
                <p className={styles.head}>
                  <span className={styles.name}>{step.title}</span>
                  <span className={styles.tag}>{step.tag}</span>
                </p>
                {step.bodies.map((text) => (
                  <p key={text} className={styles.text}>
                    {text}
                  </p>
                ))}

                {/* 一段目にだけ実測の裏づけ（ベンチマーク・すべて「約」で書く） */}
                {i === 0 && (
                  <div className={styles.figure}>
                    <p className={styles.figureHead}>
                      <span className={styles.figureNum}>約8割</span>
                      <span className={styles.figureLabel}>手作業からの削減</span>
                    </p>
                    <p className={styles.figureBody}>
                      公開している6本のツールと同じ処理を、500件規模のデータで実際に走らせて測りました。手作業なら合わせて20時間ちかくかかる仕事が、人が確認する時間まで入れても4時間ほど。
                    </p>
                    <p className={styles.figureNote}>
                      初めて仕組みを作るときの時間は含みません。判断が必要なものは、ツールが人へ返します。
                    </p>
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </ol>

        <ScrollReveal>
          <p className={styles.close}>
            いきなり三段目に立てる会社はありません。一段目だけでも、手作業は確かに減ります。いま御社がどこにいるかを一緒に確かめて、次の一段を決めるところから始めます。
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
