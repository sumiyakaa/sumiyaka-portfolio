import styles from "./Marquee.module.css";

interface MarqueeProps {
  text: string;
  reverse?: boolean;
  className?: string;
}

export default function Marquee({
  text,
  reverse = false,
  className = "",
}: MarqueeProps) {
  const items = Array.from({ length: 6 }, (_, i) => (
    <span key={i} className={styles.item} aria-hidden={i > 0}>
      {text}
      <span className={styles.separator}>●</span>
    </span>
  ));

  return (
    <div className={`${styles.marquee} ${className}`} aria-label={text}>
      <div
        className={`${styles.track} ${reverse ? styles.reverse : ""}`}
      >
        {items}
        {items}
      </div>
    </div>
  );
}
