import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CircleCheck, CircleAlert, Info } from 'lucide-react';
import { toast } from '../../services/toastStore';
import styles from './ToastNotification.module.css';

const variants = {
  success: { Icon: CircleCheck, title: 'Success' },
  error: { Icon: CircleAlert, title: 'Please check' },
  info: { Icon: Info, title: 'Notice' },
};

// Compatibility adapter for existing declarative callers. All notifications
// share the provider's single viewport instead of rendering overlapping portals.
export default function ToastNotification({ message, type = 'success', onClose, duration = 4500 }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!message) return;
    const id = toast.show(message, type, { duration, onClose: () => closeRef.current?.() });
    return () => toast.dismiss(id);
  }, [message, type, duration]);
  return null;
}

export function ToastViewport({ message, type = 'success', onClose, duration = 4500 }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!message || !duration || paused) return;
    const timer = setTimeout(() => closeRef.current?.(), duration);
    return () => clearTimeout(timer);
  }, [message, type, duration, paused]);

  if (!message) return null;
  const variant = variants[type] || variants.info;
  const { Icon } = variant;

  return createPortal(
    <div
      className={`${styles.toast} ${styles[type] || styles.info}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className={styles.icon}><Icon aria-hidden="true" /></div>
      <div className={styles.message}><strong>{variant.title}</strong><p>{message}</p></div>
      <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close notification">
        <X size={18} aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
