import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { ChevronDown, MoreVertical } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_LOGOUT_ITEM, ADMIN_NAVIGATION } from '../config/adminNavigation';
import styles from './AdminLayout.module.css';
import { useAuth } from '../../../context/AuthContext';
import { hasAnyRole } from '../../auth/utils/authorization';

function NavigationItem({ item, onClick }) {
  const ui = useUiTranslation();
  const Icon = item.icon;
  return (
    <NavLink to={item.to} onClick={onClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
      <Icon aria-hidden="true" /><span>{ui(item.label)}</span>
    </NavLink>
  );
}

function NavigationAction({ item, disabled, onClick }) {
  const ui = useUiTranslation();
  const Icon = item.icon;
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${styles.navItem} ${styles.navAction}`}>
      <Icon aria-hidden="true" /><span>{disabled ? ui("Signing out...") : item.label}</span>
    </button>
  );
}

function NavigationGroup({ item, collapsed }) {
  const ui = useUiTranslation();
  const location = useLocation();
  const sectionActive = location.pathname.startsWith('/admin/tests');
  const [open, setOpen] = useState(() => sectionActive && !collapsed && window.matchMedia('(min-width: 901px)').matches);
  const groupRef = useRef(null);
  const toggleRef = useRef(null);
  const submenuId = useId();
  const purpose = new URLSearchParams(location.search).get('purpose') || 'EXAM';
  const Icon = item.icon;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = event => {
      if (!groupRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  return <div ref={groupRef} className={`${styles.navGroup} ${collapsed ? styles.navGroupCollapsed : ''}`}
    onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
      }
    }}>
    <button ref={toggleRef} type="button" className={`${styles.navItem} ${styles.navGroupButton} ${sectionActive ? styles.navItemActive : ''}`}
      aria-label={ui(item.label)} title={ui(item.label)} aria-controls={submenuId}
      aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Icon aria-hidden="true" /><span>{ui(item.label)}</span><ChevronDown className={open ? styles.chevronOpen : ''} aria-hidden="true" />
    </button>
    {open && <div id={submenuId} className={styles.navSubmenu}>
      <strong className={styles.navSubmenuTitle}>{ui(item.label)}</strong>
      {item.children.map(child => {
        const childPurpose = new URL(child.to, window.location.origin).searchParams.get('purpose');
        const active = sectionActive && purpose === childPurpose;
        return <Link key={child.to} to={child.to} className={active ? styles.navSubmenuActive : ''}
          aria-current={active ? 'page' : undefined} onClick={() => {
            if (collapsed || window.matchMedia('(max-width: 900px)').matches) setOpen(false);
          }}>{ui(child.label)}</Link>;
      })}
    </div>}
  </div>;
}

export default function AdminSidebar({ collapsed }) {
  const ui = useUiTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Admin user';
  const initials = displayName.split(/\s+/).map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const visibleNavigation = ADMIN_NAVIGATION.filter(item => hasAnyRole(user?.role, item.roles));

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? 'adminSidebarCollapsed' : ''}`}>
      <Link className={`${styles.brand} adminHomeBrand`} to="/" aria-label={ui("Back to AptiMate home")}><img src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png" alt="AptiMate" /></Link>
      <div className={styles.account}><div className={styles.avatar}>{initials}</div><div><strong title={displayName}>{displayName}</strong><span title={user?.email}>{user?.email}</span></div><MoreVertical /></div>
      <nav className={styles.navigation} aria-label={ui("Admin navigation")}>
        {visibleNavigation.map((item) => item.children
          ? <NavigationGroup item={item} collapsed={collapsed} key={item.to} />
          : <NavigationItem item={item} key={item.to} />)}
      </nav>
      <NavigationAction item={ADMIN_LOGOUT_ITEM} disabled={signingOut} onClick={handleLogout} />
    </aside>
  );
}
