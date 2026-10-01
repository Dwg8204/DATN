import { ArrowLeft } from 'lucide-react';
import styles from './EditorBackButton.module.css';

export default function EditorBackButton({ onClick }) {
  return <div className={styles.row}><button type="button" onClick={onClick}><ArrowLeft/>Back to test information</button></div>;
}
