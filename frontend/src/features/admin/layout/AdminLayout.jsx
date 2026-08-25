import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.workspace}>
        <AdminTopbar />
        <main className={styles.main}><Outlet /></main>
      </div>
    </div>
  );
}
