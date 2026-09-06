import tb from "./top-body.module.css";

type Props = {
  /** 章番号（01…09）。TopProgress（進捗線）の番号と揃える */
  no: string;
  /** 英字ラベル（装飾） */
  label: string;
  /** 紙（白転調）の上に置くとき */
  onPaper?: boolean;
  className?: string;
};

/**
 * 章番号（01 — THE WAY）— P12「1画面1メッセージ」(2026-09-06)。
 * 各セクションの頭に置く装飾。読み上げ対象ではない（aria-hidden）。
 */
export default function SectionMark({ no, label, onPaper = false, className = "" }: Props) {
  return (
    <p
      className={[tb.mark, onPaper ? tb.onPaper : "", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <span className={tb.markNo}>{no}</span>
      <span className={tb.markRule} />
      <span>{label}</span>
    </p>
  );
}
