import { MoreVertical } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { ADMIN_LOGOUT_ITEM, ADMIN_NAVIGATION } from '../config/adminNavigation';
import styles from './AdminLayout.module.css';

function NavigationItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
      <Icon aria-hidden="true" /><span>{item.label}</span>
    </NavLink>
  );
}

export default function AdminSidebar() {
  const { pathname } = useLocation();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}><img src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png" alt="AptiMate" /></div>
      <div className={styles.account}><div className={styles.avatar}>HT</div><div><strong>Hung To</strong><span>tongochung9308@gmail.com</span></div><MoreVertical /></div>
      <nav className={styles.navigation} aria-label="Admin navigation">
        {ADMIN_NAVIGATION.map((item) => <div key={item.to}><NavigationItem item={item} />{item.label === 'Test Management' && pathname.includes('/admin/tests') && <div className={styles.subnav}><span>• Admin</span><span>• User request</span></div>}</div>)}
      </nav>
      <NavigationItem item={ADMIN_LOGOUT_ITEM} />
    </aside>
  );
}
