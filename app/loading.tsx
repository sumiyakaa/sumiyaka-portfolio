import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <span className={styles.brand}>AKASHIKI</span>
        <div className={styles.bar}>
          <div className={styles.barFill} />
        </div>
      </div>
    </div>
  );
}
