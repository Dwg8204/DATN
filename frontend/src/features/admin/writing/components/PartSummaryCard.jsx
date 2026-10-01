import { Edit3, House } from 'lucide-react';
import styles from './PartSummaryCard.module.css';

export default function PartSummaryCard({ part, onEdit }) {
  return <article className={styles.card}><div className={styles.content}><strong>Part {part.number}</strong><span>{part.title} ({part.summary})</span></div><button onClick={onEdit}>Edit <House/><Edit3/></button></article>;
}
