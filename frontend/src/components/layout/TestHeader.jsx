import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './TestHeader.module.css';
import { getReadingRemainingSeconds } from '../../features/module-reading/utils/readingSessionStorage';

function formatRemainingTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function TestHeader({ testTakerId = 'Test taker ID', timeRemaining, controlledTimer = false, onConfirmExit, showTimer = true, showExit = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExitModal, setShowExitModal] = useState(false);
  const [exiting, setExiting] = useState(false);
  const isReadingTest = location.pathname.startsWith('/reading/test/');
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (isReadingTest) return getReadingRemainingSeconds();
    return null;
  });

  useEffect(() => {
    if (controlledTimer) return undefined;
    if (!isReadingTest) return undefined;

    const updateTimer = () => {
      let remaining = null;
      if (isReadingTest) {
        remaining = getReadingRemainingSeconds();
      }
      setRemainingSeconds(remaining);

    };

    updateTimer();
    const intervalId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [controlledTimer, isReadingTest]);

  const displayedTime = controlledTimer
    ? (timeRemaining ?? '--:--')
    : (timeRemaining || (remainingSeconds === null ? '' : formatRemainingTime(remainingSeconds)));

  const handleExitClick = () => {
    setShowExitModal(true);
  };

  const handleCloseModal = () => {
    setShowExitModal(false);
  };

  const handleConfirmExit = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      const destination = onConfirmExit ? await onConfirmExit() : '/';
      if (destination !== false) navigate(typeof destination === 'string' ? destination : '/');
    } finally {
      setExiting(false);
    }
  };

  return (
    <header className={styles.testHeader}>
      <div className={styles.inner}>
        <div className={styles.leftSide}>
          <button className={styles.logoBtn} onClick={handleExitClick} title="Exit test">
            <img
              src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png"
              alt="AptiMate Logo"
              className={styles.logo}
            />
          </button>
          <div className={styles.testTakerInfo}>
            <span className={styles.testTakerLabel}>{testTakerId}</span>
          </div>
        </div>

        <div className={styles.rightSide}>
          {showTimer && <div className={styles.timeWrap}>
            <div className={styles.timeLabel}>Time remaining</div>
            <div className={styles.timeRow}>
              <div className={styles.timeIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#131927" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 6V12L16 14" stroke="#131927" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.timeValue}>{displayedTime}</div>
            </div>
          </div>}
          {showExit && <button className={styles.exitBtn} onClick={handleExitClick}>
            <span className={styles.exitBtnText}>Exit test</span>
          </button>}
        </div>
      </div>

      {showExitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.exitModal}>
            <div className={styles.closeIcon} onClick={handleCloseModal}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="16" height="16">
                <path d="M0.750453 11.2348L5.99309 5.99219M11.2357 0.749547L5.99309 5.99219M5.99309 5.99219L0.750453 0.749547M5.99309 5.99219L11.2357 11.2348" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className={styles.modalText}>
              Are you sure you want to exit the test?<br /><br />
              {controlledTimer ? 'Your currently saved answers will be submitted before you leave.' : 'Your progress will not be saved if you leave now.'}<br />
              Do you still want to exit?
            </p>
            <div className={styles.modalActions}>
              <button className={styles.stayBtn} onClick={handleCloseModal} disabled={exiting}>Stay in test</button>
              <button className={styles.confirmExitBtn} onClick={handleConfirmExit} disabled={exiting}>{exiting ? 'Submitting…' : 'Submit and exit'}</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
