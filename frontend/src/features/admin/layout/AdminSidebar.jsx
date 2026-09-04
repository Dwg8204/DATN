import { MoreVertical } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
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

export default function AdminSidebar({ collapsed }) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? 'adminSidebarCollapsed' : ''}`}>
      <Link className={`${styles.brand} adminHomeBrand`} to="/" aria-label="Back to AptiMate home"><img src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png" alt="AptiMate" /></Link>
      <div className={styles.account}><div className={styles.avatar}>HT</div><div><strong>Hung To</strong><span>tongochung9308@gmail.com</span></div><MoreVertical /></div>
      <nav className={styles.navigation} aria-label="Admin navigation">
        {ADMIN_NAVIGATION.map((item) => <NavigationItem item={item} key={item.to} />)}
      </nav>
      <NavigationItem item={ADMIN_LOGOUT_ITEM} />
    </aside>
  );
}
