import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { ArrowLeft } from 'lucide-react';
import styles from './EditorBackButton.module.css';

export default function EditorBackButton({ onClick }) {
  const ui = useUiTranslation();
  return <div className={styles.row}><button type="button" onClick={onClick}><ArrowLeft/>{ui("Back to test information")}</button></div>;
}
