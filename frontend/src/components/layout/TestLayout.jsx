import { Outlet } from 'react-router-dom';
import TestHeader from './TestHeader';
import styles from './TestLayout.module.css';

export default function TestLayout({ headerProps }) {
  return (
    <div className={styles.shell}>
      <div className={styles.layout}>
        <TestHeader {...headerProps} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
