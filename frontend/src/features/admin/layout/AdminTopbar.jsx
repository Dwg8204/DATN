import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { Menu, PanelLeftClose, Search } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import styles from './AdminLayout.module.css';

export default function AdminTopbar({ collapsed, onToggleSidebar }) {
  const ui = useUiTranslation();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNotifications = pathname === '/admin/notifications';
  const isDashboard = pathname === '/admin/dashboard';
  const title = pathname.includes('/tests') ? 'Test Management' : pathname.includes('/users') ? 'User Management' : pathname.includes('/feedback') ? 'Feedback' : pathname.includes('/notifications') ? 'Notification' : 'Dashboard';
  return (
    <header className={styles.topbar}>
      <div className="adminTopbarTitle"><button className="adminMenuToggle" onClick={onToggleSidebar} aria-label={collapsed ? ui("Expand sidebar") : ui("Collapse sidebar")}>{collapsed ? <Menu /> : <PanelLeftClose />}</button><h1>{ui(title)}</h1></div>
      {!isDashboard && <label className={styles.globalSearch}>
        <Search aria-hidden="true" />
        {isNotifications ? <input key="notification-search" type="search" placeholder={ui("Search notifications")} aria-label={ui("Search notifications")}
          maxLength={200} value={searchParams.get('q') || ''} onChange={event => {
            const value = event.target.value;
            setSearchParams(current => {
              const next = new URLSearchParams(current);
              if (value) next.set('q', value); else next.delete('q');
              next.set('page', '1');
              return next;
            }, { replace: true });
          }} /> : <input key="admin-search" type="search" placeholder={ui("Search")} aria-label={ui("Search admin pages")} />}
      </label>}
    </header>
  );
}
