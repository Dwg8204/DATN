import styles from './PaginationDots.module.css';

export default function PaginationDots({ total = 3, active = 0 }) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`${styles.dot} ${i === active ? styles.dotActive : styles.dotInactive}`}
        />
      ))}
    </div>
  );
}
