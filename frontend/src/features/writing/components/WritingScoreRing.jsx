import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import styles from './WritingScoreRing.module.css';

export default function WritingScoreRing({ score, label, compact = false }) {
  const ui = useUiTranslation();
  return <div className={`${styles.item} ${compact ? styles.compact : ''}`}><div className={styles.ring} style={{ '--score': `${Math.max(0, Math.min(100, score)) * 3.6}deg` }}><span>{score}%</span></div>{label && <strong>{ui(label)}</strong>}</div>;
}
