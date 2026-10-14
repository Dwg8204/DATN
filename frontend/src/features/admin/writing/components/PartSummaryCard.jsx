import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { Edit3, House } from 'lucide-react';
import styles from './PartSummaryCard.module.css';

export default function PartSummaryCard({ part, onEdit }) {
  const ui = useUiTranslation();
  return <article className={styles.card}><div className={styles.content}><strong>{ ui("Part") + ' ' }{part.number}</strong><span>{ui(part.title)} ({part.summary})</span></div><button onClick={onEdit}>{ ui("Edit") + ' ' }<House/><Edit3/></button></article>;
}
