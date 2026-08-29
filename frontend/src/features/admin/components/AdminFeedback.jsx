import { CheckCircle2, TriangleAlert, X } from 'lucide-react';
import styles from './AdminFeedback.module.css';

export function AdminToast({ message, type = 'success', onClose }) {
  if (!message) return null;
  const Icon = type === 'success' ? CheckCircle2 : TriangleAlert;
  return <div className={`${styles.toast} ${styles[type]}`} role="status"><Icon/><span>{message}</span><button onClick={onClose} aria-label="Close notification"><X/></button></div>;
}

export function AdminConfirmDialog({ open, title, message, confirmLabel = 'Delete', onCancel, onConfirm }) {
  if (!open) return null;
  return <div className={styles.backdrop} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title"><div className={styles.warning}><TriangleAlert/></div><h2 id="admin-confirm-title">{title}</h2><p>{message}</p><div><button onClick={onCancel}>Cancel</button><button className={styles.danger} onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
