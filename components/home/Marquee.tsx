import styles from "./Marquee.module.css";

interface MarqueeProps {
  text?: string;
  items?: string[];
  reverse?: boolean;
  className?: string;
  variant?: "default" | "code";
}

export default function Marquee({
  text,
  items: itemsProp,
  reverse = false,
  className = "",
  variant = "default",
}: MarqueeProps) {
  const isCode = variant === "code";
  const itemClass = isCode ? styles.codeItem : styles.item;
  const sepClass = isCode ? styles.codeSeparator : styles.separator;
  const sepChar = isCode ? "·" : "●";

  const renderSet = (prefix: string) => {
    if (itemsProp) {
      const repeated = [...itemsProp, ...itemsProp, ...itemsProp];
      return repeated.map((item, i) => (
        <span
          key={`${prefix}${i}`}
          className={itemClass}
          aria-hidden={prefix !== "a" || i > 0}
        >
          {item}
          <span className={sepClass}>{sepChar}</span>
        </span>
      ));
    }
    return Array.from({ length: 6 }, (_, i) => (
      <span
        key={`${prefix}${i}`}
        className={itemClass}
        aria-hidden={prefix !== "a" || i > 0}
      >
        {text}
        <span className={sepClass}>{sepChar}</span>
      </span>
    ));
  };

  const ariaLabel = itemsProp ? itemsProp.join(` ${sepChar} `) : text;

  return (
    <div
      className={`${styles.marquee} ${isCode ? styles.codeMarquee : ""} ${className}`}
      aria-label={ariaLabel}
    >
      <div
        className={`${styles.track} ${reverse ? styles.reverse : ""}`}
      >
        {renderSet("a")}
        {renderSet("b")}
      </div>
    </div>
  );
}
