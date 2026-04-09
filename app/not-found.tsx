import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.wrapper}>
      <div className={styles.inner}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>PAGE NOT FOUND</h1>
        <p className={styles.text}>
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link href="/" className={styles.link}>
          BACK TO HOME <span>→</span>
        </Link>
      </div>

      <div className={styles.bgText} aria-hidden="true">
        404
      </div>
    </main>
  );
}
