import React, { useEffect } from 'react';
import { X, BellRing } from 'lucide-react';
import styles from './ToastNotification.module.css';

export default function ToastNotification({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div className={styles.toast}>
      <div className={styles.icon}>
        <BellRing />
      </div>
      <div className={styles.message}>
        <p>{message}</p>
        <span>Just now · System</span>
      </div>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}
