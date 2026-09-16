import { TriangleAlert } from 'lucide-react';
import ToastNotification from '../../../components/common/ToastNotification';
import { getFirstValidationError } from '../../../utils/validationErrors';
import styles from './AdminFeedback.module.css';

export function AdminToast({ message, type = 'success', onClose }) {
  return <ToastNotification message={message} type={type} onClose={onClose} duration={type === 'error' ? 0 : 4500} />;
}

/** Shows one validation problem at a time so a long form never overwhelms the user. */
export function AdminValidationToast({ errors = [], onClose }) {
  return <AdminToast message={getFirstValidationError(errors)} type="error" onClose={onClose} />;
}

export function AdminConfirmDialog({ open, title, message, confirmLabel = 'Delete', onCancel, onConfirm }) {
  if (!open) return null;
  return <div className={styles.backdrop} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title"><div className={styles.warning}><TriangleAlert/></div><h2 id="admin-confirm-title">{title}</h2><p>{message}</p><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className={styles.danger} onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
