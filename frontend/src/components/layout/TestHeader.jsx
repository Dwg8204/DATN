import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './TestHeader.module.css';
import { getGrammarVocabRemainingSeconds } from '../../features/grammar_vocab/utils/grammarVocabSessionStorage';

function formatRemainingTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function TestHeader({ testTakerId = 'Test taker ID', timeRemaining }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showExitModal, setShowExitModal] = useState(false);
  const isGrammarVocabTest = location.pathname.startsWith('/grammar-vocab/test/');
  const [remainingSeconds, setRemainingSeconds] = useState(() => (
    isGrammarVocabTest ? getGrammarVocabRemainingSeconds() : null
  ));

  useEffect(() => {
    if (!isGrammarVocabTest) return undefined;

    const updateTimer = () => {
      const remaining = getGrammarVocabRemainingSeconds();
      setRemainingSeconds(remaining);

      if (remaining === 0) {
        const testId = searchParams.get('testId') || '1';
        const isFull = searchParams.get('isFull') === 'true';
        const part = location.pathname.endsWith('/part2') ? '2' : '1';
        navigate(`/grammar-vocab/result?testId=${testId}&isFull=${isFull}&part=${part}&timedOut=true`, { replace: true });
      }
    };

    updateTimer();
    const intervalId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [isGrammarVocabTest, location.pathname, navigate, searchParams]);

  const displayedTime = timeRemaining
    || (remainingSeconds === null ? '23:30' : formatRemainingTime(remainingSeconds));

  const handleExitClick = () => {
    setShowExitModal(true);
  };

  const handleCloseModal = () => {
    setShowExitModal(false);
  };

  const handleConfirmExit = () => {
    navigate('/');
  };

  return (
    <header className={styles.testHeader}>
      <div className={styles.inner}>
        <div className={styles.leftSide}>
          <Link to="/">
            <img
              src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png"
              alt="AptiMate Logo"
              className={styles.logo}
            />
          </Link>
          <div className={styles.testTakerInfo}>
            <span className={styles.testTakerLabel}>{testTakerId}</span>
          </div>
        </div>

        <div className={styles.rightSide}>
          <div className={styles.timeWrap}>
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
          </div>
          <button className={styles.exitBtn} onClick={handleExitClick}>
            <span className={styles.exitBtnText}>Exit test</span>
          </button>
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
              Your progress will not be saved if you leave now.<br />
              Do you still want to exit?
            </p>
            <div className={styles.modalActions}>
              <button className={styles.stayBtn} onClick={handleCloseModal}>Stay in test</button>
              <button className={styles.confirmExitBtn} onClick={handleConfirmExit}>Exit anyway</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
