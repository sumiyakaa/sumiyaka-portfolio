import Image from "next/image";
import { notFound } from "next/navigation";
import { getWorkBySlug } from "@/lib/works";
import {
  getDetailMetaFacts,
  getDetailChipGroups,
  getDetailRebuild,
  hasDetailSummary,
  hasDetailChallenge,
} from "@/lib/detail";
import WorkModal from "@/components/works/WorkModal";
import ModalDetailLink from "@/components/works/ModalDetailLink";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function InterceptedWorkPage({ params }: PageProps) {
  const { slug } = await params;
  const work = getWorkBySlug(slug);
  if (!work) notFound();

  const metaFacts = getDetailMetaFacts(work);
  const chipGroups = getDetailChipGroups(work);
  // 移植版。公開URLが未設定なら null＝下のブロックごと描画しない
  const rebuild = getDetailRebuild(work);

  return (
    <WorkModal slug={slug}>
      {/* Action buttons — top */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <ModalDetailLink slug={slug} />
        {work.liveUrl && (
          <a
            href={work.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontFamily: "var(--font-heading)",
              fontWeight: 400,
              fontSize: 13,
              letterSpacing: "0.08em",
              color: "#111",
              border: "1px solid #ddd",
              padding: "14px 32px",
              textDecoration: "none",
              transition: "border-color 0.3s",
            }}
          >
            LIVE SITE ↗
          </a>
        )}
      </div>

      {/* Hero pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {work.category.map((cat) => (
          <span key={cat} style={{ fontSize: 11, letterSpacing: "0.08em", padding: "4px 12px", border: "1px solid #ddd", color: "#666", fontFamily: "var(--font-heading)" }}>{cat}</span>
        ))}
      </div>

      {/* Title */}
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 200, fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "0.06em", color: "#111", lineHeight: 1.2, marginBottom: 8 }}>
        {work.title}
      </h2>

      <p style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontSize: 13, color: "#888", letterSpacing: "0.04em", marginBottom: 24 }}>
        {work.genre} / {work.siteType}
      </p>

      {/* Thumbnail */}
      {work.thumbnail && (
        <div style={{ marginBottom: 32, overflow: "hidden" }}>
          <Image
            src={work.thumbnail}
            alt={work.title}
            width={800}
            height={450}
            style={{ width: "100%", height: "auto", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Description */}
      <p style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontSize: 14, lineHeight: 2, color: "#333", marginBottom: 32 }}>
        {work.description}
      </p>

      {/* Summary */}
      {hasDetailSummary(work) && (
        <div style={{ marginBottom: 32 }}>
          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 300, letterSpacing: "0.2em", color: "#999", marginBottom: 12 }}>CONCEPT</span>
          <p style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontSize: 14, lineHeight: 2, color: "#333" }}>
            {work.summary}
          </p>
          {hasDetailChallenge(work) && (
            <div style={{ marginTop: 20, paddingLeft: 16, borderLeft: "2px solid #e0e0e0" }}>
              <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 300, letterSpacing: "0.1em", color: "#999", marginBottom: 8 }}>背景・課題</span>
              <p style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontSize: 13, lineHeight: 1.8, color: "#555" }}>
                {work.challenge}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Meta Facts */}
      <div style={{ marginBottom: 32 }}>
        <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 300, letterSpacing: "0.2em", color: "#999", marginBottom: 16 }}>PROJECT INFO</span>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px 32px" }}>
          {metaFacts.map((fact) => (
            <div key={fact.label}>
              <dt style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 400, letterSpacing: "0.06em", color: "#999", marginBottom: 4 }}>{fact.label}</dt>
              <dd style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 300, color: "#333" }}>{fact.value}</dd>
            </div>
          ))}

          {/* 担当範囲。掲載作品はすべて同じ体制なので Work 型には持たせず固定表現で出す。
              既存項目の並び・文言は変えず、最終行に全幅で1行だけ足している */}
          <div style={{ gridColumn: "1 / -1" }}>
            <dt style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 400, letterSpacing: "0.06em", color: "#999", marginBottom: 4 }}>担当範囲</dt>
            <dd style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 300, color: "#333" }}>企画・設計・デザイン・コーディング・実装・公開（すべて一人）</dd>
          </div>
        </dl>
      </div>

      {/* Tech chips */}
      {chipGroups.map((group) => (
        <div key={group.label} style={{ marginBottom: 20 }}>
          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 300, letterSpacing: "0.1em", color: "#999", marginBottom: 8 }}>{group.label}</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {group.items.map((item) => (
              <span key={item} style={{ fontSize: 12, padding: "4px 12px", border: "1px solid #e0e0e0", color: "#555", fontFamily: "var(--font-body)", fontWeight: 300 }}>{item}</span>
            ))}
          </div>
        </div>
      ))}

      {/* Rebuild — 同じデザインを別プラットフォームで組み直した版。
          rebuild が null＝公開URL未設定のときはブロックごと出さない */}
      {rebuild && (
        <div style={{ marginTop: 32, padding: 20, border: "1px solid #e0e0e0", background: "#fafafa" }}>
          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 300, letterSpacing: "0.2em", color: "#999", marginBottom: 10 }}>REBUILD</span>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: "#111", lineHeight: 1.6, marginBottom: 10 }}>
            {/* 前後の空白を JSX の行トリムに委ねると落ちるので、文字列側で持つ */}
            {`同じデザインを ${rebuild.platform} で再構築`}
          </p>
          {rebuild.note !== "" && (
            <p style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontSize: 13, lineHeight: 1.9, color: "#555" }}>
              {rebuild.note}
            </p>
          )}
          {rebuild.facts.length > 0 && (
            <ul style={{ margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {rebuild.facts.map((fact) => (
                <li key={fact} style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontSize: 12, lineHeight: 1.8, color: "#555", paddingLeft: 14, textIndent: -14 }}>
                  — {fact}
                </li>
              ))}
            </ul>
          )}
          <a
            href={rebuild.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginTop: 16,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: "#111",
              border: "1px solid #ddd",
              padding: "10px 20px",
              textDecoration: "none",
            }}
          >
            {`${rebuild.platform} 版を見る ↗`}
          </a>
        </div>
      )}

      {/* Action buttons — bottom */}
      <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
        <ModalDetailLink slug={slug} />
        {work.liveUrl && (
          <a
            href={work.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontFamily: "var(--font-heading)",
              fontWeight: 400,
              fontSize: 13,
              letterSpacing: "0.08em",
              color: "#111",
              border: "1px solid #ddd",
              padding: "14px 32px",
              textDecoration: "none",
              transition: "border-color 0.3s",
            }}
          >
            LIVE SITE ↗
          </a>
        )}
      </div>
    </WorkModal>
  );
}
