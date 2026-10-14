import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import styles from './FormField.module.css';

export default function FormField({ label, error, hint, required, children }) {
  const ui = useUiTranslation();
  return <label className={styles.field}><span className={styles.label}>{ui(label)}{required && <b> *</b>}</span>{children}{hint && !error && <small>{hint}</small>}{error && <small className={styles.error}>{ui.error(error)}</small>}</label>;
}
