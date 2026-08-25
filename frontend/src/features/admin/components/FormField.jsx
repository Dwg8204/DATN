import styles from './FormField.module.css';

export default function FormField({ label, error, hint, required, children }) {
  return <label className={styles.field}><span className={styles.label}>{label}{required && <b> *</b>}</span>{children}{hint && !error && <small>{hint}</small>}{error && <small className={styles.error}>{error}</small>}</label>;
}
