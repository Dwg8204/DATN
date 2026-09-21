import styles from './AttemptScoreSummary.module.css';

export default function AttemptScoreSummary({ score = 0, maxScore = 0, title = 'Final score', subtitle }) {
  const numericScore = Number(score) || 0;
  const numericMaximum = Number(maxScore) || 0;
  const percentage = numericMaximum ? Math.round((numericScore / numericMaximum) * 100) : 0;

  return <section className={styles.summary} aria-label={title}>
    <div><span>{title}</span>{subtitle && <small>{subtitle}</small>}</div>
    <strong>{numericScore}<small>/{numericMaximum}</small></strong>
    <span className={styles.percentage}>{percentage}%</span>
  </section>;
}
