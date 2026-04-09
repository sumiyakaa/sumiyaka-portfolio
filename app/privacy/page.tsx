import type { Metadata } from "next";
import ScrollReveal from "@/components/animation/ScrollReveal";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "PRIVACY POLICY — AKASHIKI",
  description:
    "AKASHIKI（灯敷）のプライバシーポリシー。個人情報の取り扱い・利用目的・管理体制について記載しています。",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    title: "1. 個人情報の収集",
    body: "当サイトでは、お問い合わせフォームを通じて、以下の個人情報を収集する場合があります。\n\n・氏名\n・メールアドレス\n・お問い合わせ内容\n\nこれらの情報は、お問い合わせへの回答およびご連絡のためにのみ利用いたします。",
  },
  {
    title: "2. 個人情報の利用目的",
    body: "収集した個人情報は、以下の目的で利用いたします。\n\n・お問い合わせへの回答・対応\n・制作案件に関するご連絡\n・サービス改善のための分析（個人を特定しない形での統計的利用）",
  },
  {
    title: "3. 個人情報の第三者提供",
    body: "収集した個人情報を、ご本人の同意なく第三者に提供することはありません。ただし、法令に基づく場合はこの限りではありません。",
  },
  {
    title: "4. 個人情報の管理",
    body: "収集した個人情報は、適切な安全管理措置を講じ、紛失・漏洩・改ざん等の防止に努めます。不要となった個人情報は、速やかに適切な方法で廃棄いたします。",
  },
  {
    title: "5. アクセス解析ツール",
    body: "当サイトでは、Googleアナリティクスを利用してアクセス情報を収集する場合があります。Googleアナリティクスはトラフィックデータの収集のためにCookieを使用しています。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。Cookieを無効にすることで収集を拒否することができますので、お使いのブラウザの設定をご確認ください。",
  },
  {
    title: "6. お問い合わせ",
    body: "個人情報の取り扱いに関するお問い合わせは、当サイトのお問い合わせフォームよりご連絡ください。",
  },
  {
    title: "7. プライバシーポリシーの変更",
    body: "当サイトのプライバシーポリシーは、必要に応じて内容を見直し、変更することがあります。変更後のプライバシーポリシーは、当ページにて公開した時点で効力を生じるものとします。",
  },
];

export default function PrivacyPage() {
  return (
    <main>
      {/* Hero FV */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>PRIVACY POLICY</h1>
          <p className={styles.heroSub}>個人情報保護方針</p>
        </div>
      </section>

      {/* Content */}
      <section className={styles.content}>
        <div className={styles.inner}>
          <ScrollReveal>
            <p className={styles.intro}>
              AKASHIKI（灯敷）（以下「当サイト」）は、個人情報の重要性を認識し、その保護の徹底を図るため、以下のとおりプライバシーポリシーを定めます。
            </p>
          </ScrollReveal>

          <div className={styles.sections}>
            {SECTIONS.map((section, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <p className={styles.sectionBody}>
                    {section.body.split("\n").map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < section.body.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <p className={styles.date}>制定日: 2026年4月1日</p>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
