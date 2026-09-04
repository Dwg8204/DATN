import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import styles from './AdminLayout.module.css';
import './AdminLayoutEnhancements.css';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`${styles.shell} ${collapsed ? 'adminShellCollapsed' : ''}`}>
      <AdminSidebar collapsed={collapsed} />
      <div className={styles.workspace}>
        <AdminTopbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((value) => !value)} />
        <main className={styles.main}><Outlet /></main>
      </div>
    </div>
  );
}
