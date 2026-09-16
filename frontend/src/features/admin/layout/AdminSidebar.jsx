import { MoreVertical } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { ADMIN_LOGOUT_ITEM, ADMIN_NAVIGATION } from '../config/adminNavigation';
import styles from './AdminLayout.module.css';
import { useAuth } from '../../../context/AuthContext';
import { hasAnyRole } from '../../auth/utils/authorization';

function NavigationItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} onClick={onClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
      <Icon aria-hidden="true" /><span>{item.label}</span>
    </NavLink>
  );
}

export default function AdminSidebar({ collapsed }) {
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'AptiMate user';
  const initials = displayName.split(/\s+/).map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const visibleNavigation = ADMIN_NAVIGATION.filter(item => hasAnyRole(user?.role, item.roles));
  return (
    <aside className={`${styles.sidebar} ${collapsed ? 'adminSidebarCollapsed' : ''}`}>
      <Link className={`${styles.brand} adminHomeBrand`} to="/" aria-label="Back to AptiMate home"><img src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png" alt="AptiMate" /></Link>
      <div className={styles.account}><div className={styles.avatar}>{initials}</div><div><strong>{displayName}</strong><span>{user?.email}</span></div><MoreVertical /></div>
      <nav className={styles.navigation} aria-label="Admin navigation">
        {visibleNavigation.map((item) => <NavigationItem item={item} key={item.to} />)}
      </nav>
      <NavigationItem item={ADMIN_LOGOUT_ITEM} onClick={logout} />
    </aside>
  );
}
