"use client";

import { useRouter } from "next/navigation";

export default function ModalDetailLink({ slug }: { slug: string }) {
  const router = useRouter();

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
        color: "#fff",
        background: "#111",
        padding: "14px 32px",
        border: "none",
        cursor: "pointer",
        transition: "background 0.3s",
      }}
    >
      詳しく見る →
    </button>
  );
}
