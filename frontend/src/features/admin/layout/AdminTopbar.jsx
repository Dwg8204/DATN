import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import styles from './AdminLayout.module.css';

export default function AdminTopbar() {
  const { pathname } = useLocation();
  const title = pathname.includes('/tests') ? 'Test Management' : pathname.includes('/users') ? 'User Management' : pathname.includes('/feedback') ? 'Feedback' : pathname.includes('/notifications') ? 'Notification' : 'Dashboard';
  return (
    <header className={styles.topbar}>
      <h1>{title}</h1>
      <label className={styles.globalSearch}>
        <Search aria-hidden="true" />
        <input type="search" placeholder="Search" aria-label="Search admin pages" />
      </label>
    </header>
  );
}
