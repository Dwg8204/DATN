import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import styles from './AttemptScoreSummary.module.css';

export default function AttemptScoreSummary({ score = 0, maxScore = 0, title = 'Final score', subtitle }) {
  const ui = useUiTranslation();
  const numericScore = Number(score) || 0;
  const numericMaximum = Number(maxScore) || 0;
  const percentage = numericMaximum ? Math.round((numericScore / numericMaximum) * 100) : 0;

  return <section className={styles.summary} aria-label={title}>
    <div><span>{ui(title)}</span>{subtitle && <small>{ui(subtitle)}</small>}</div>
    <strong>{numericScore}<small>/{numericMaximum}</small></strong>
    <span className={styles.percentage}>{percentage}%</span>
  </section>;
}
