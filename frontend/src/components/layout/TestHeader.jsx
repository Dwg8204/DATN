import { Link, useNavigate } from 'react-router-dom';
import styles from './TestHeader.module.css';

export default function TestHeader({ testTakerId = 'Test taker ID', timeRemaining = '23:30' }) {
  const navigate = useNavigate();

  const handleExit = () => {
    // Should confirm exit, but for now just navigate home or list
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
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#131927" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 6V12L16 14" stroke="#131927" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.timeValue}>{timeRemaining}</div>
            </div>
          </div>
          <button className={styles.exitBtn} onClick={handleExit}>
            <span className={styles.exitBtnText}>Exit test</span>
          </button>
        </div>
      </div>
    </header>
  );
}
