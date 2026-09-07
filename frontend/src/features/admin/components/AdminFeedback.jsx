import { CheckCircle2, TriangleAlert, X } from 'lucide-react';
import styles from './AdminFeedback.module.css';

export function AdminToast({ message, type = 'success', onClose }) {
  if (!message) return null;
  const Icon = type === 'success' ? CheckCircle2 : TriangleAlert;
  return <div className={`${styles.toast} ${styles[type]}`} role="status"><Icon/><span>{message}</span><button type="button" onClick={onClose} aria-label="Close notification"><X/></button></div>;
}

/** Shows one validation problem at a time so a long form never overwhelms the user. */
export function AdminValidationToast({ errors = [], onClose }) {
  const findFirst = value => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(findFirst).find(Boolean);
    if (value && typeof value === 'object') return Object.values(value).map(findFirst).find(Boolean);
    return '';
  };
  return <AdminToast message={findFirst(errors)} type="error" onClose={onClose} />;
}

export function AdminConfirmDialog({ open, title, message, confirmLabel = 'Delete', onCancel, onConfirm }) {
  if (!open) return null;
  return <div className={styles.backdrop} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title"><div className={styles.warning}><TriangleAlert/></div><h2 id="admin-confirm-title">{title}</h2><p>{message}</p><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className={styles.danger} onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
