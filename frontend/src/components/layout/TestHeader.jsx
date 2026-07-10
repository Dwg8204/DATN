import { Link } from 'react-router-dom';
import styles from './TestHeader.module.css';

export default function TestHeader({ testTakerId = 'Test taker ID' }) {
  return (
    <header className={styles.testHeader}>
      <div className={styles.inner}>
        <Link to="/">
          <img
            src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/k96lx1ec_expires_30_days.png"
            alt="AptiMate Logo"
            className={styles.logo}
          />
        </Link>
        <div className={styles.testTakerInfo}>
          <span className={styles.testTakerLabel}>{testTakerId}</span>
        </div>
      </div>
    </header>
  );
}
