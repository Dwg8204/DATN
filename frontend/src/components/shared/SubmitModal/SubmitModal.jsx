import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React from 'react';
import styles from './SubmitModal.module.css';

export default function SubmitModal({
  isOpen,
  onBack,
  onNext,
  busy = false,
  message,
  backLabel = 'Back',
  confirmLabel = 'Next',
}) {
  const ui = useUiTranslation();
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.submitModal}>
        <p className={styles.modalText}>{message ?? <>{ui("Are you sure you want to submit your test?")}<br/><br/>{ui("If yes, press \"Next\" to continue.")}<br/>{ui("If not, press \"Back\" to review your test.")}<br/><br/>{ui("You will not be able to edit your test after submitting.")}</>}</p>
        <div className={styles.modalActions}>
          <button className={styles.backBtn} onClick={onBack} disabled={busy}>{ui(backLabel)}</button>
          <button className={styles.nextBtn} onClick={onNext} disabled={busy}>{busy ? ui("Submitting…") : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
