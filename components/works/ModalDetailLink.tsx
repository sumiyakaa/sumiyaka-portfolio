"use client";

export default function ModalDetailLink({ slug }: { slug: string }) {
  return (
    <button
      onClick={() => {
        // Force full page navigation (not intercepted)
        window.location.href = `/works/${slug}`;
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-heading)",
        fontWeight: 400,
        fontSize: 13,
        letterSpacing: "0.08em",
        color: "var(--sumi-sei-paper)",
        background: "var(--sumi-ink-on-paper)",
        padding: "14px 32px",
        border: "1px solid var(--sumi-ink-on-paper)",
        cursor: "pointer",
        boxShadow: "0 1px 1px rgba(31, 28, 28, 0.2), 0 6px 14px -6px rgba(31, 28, 28, 0.4)",
      }}
    >
      詳しく見る →
    </button>
  );
}
