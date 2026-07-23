import React from 'react';
import styles from './SubmitModal.module.css';

export default function SubmitModal({ isOpen, onBack, onNext }) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.submitModal}>
        <p className={styles.modalText}>
          Are you sure you want to submit your test?<br/><br/>
          If yes, press "Next" to continue.<br/>
          If not, press "Back" to review your test.<br/><br/>
          You will not be able to edit your test after submitting.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.backBtn} onClick={onBack}>Back</button>
          <button className={styles.nextBtn} onClick={onNext}>Next</button>
        </div>
      </div>
    </div>
  );
}
