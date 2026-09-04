import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AudioLines, BookOpen, ChevronDown, Headphones, Home, Languages, Mic, PenLine, User, LogOut } from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '../../context/AuthContext';
import UserNotifications from './UserNotifications';

const navItems = [
  {
    label: 'LISTENING',
    mobileLabel: 'Listening',
    MobileIcon: Headphones,
    to: '/listening/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/p9xrd9hn_expires_30_days.png',
    dropdown: [
      { label: 'Listening Overview', to: '/listening/overview' },
      { label: 'Listening Feed', to: '/listening/feed' },
      { label: 'Listening Test', to: '/listening/tests' },
    ],
  },
  {
    label: 'READING',
    mobileLabel: 'Reading',
    MobileIcon: BookOpen,
    to: '/reading',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/4d89xmet_expires_30_days.png',
    dropdown: [
      { label: 'Reading Overview', to: '/reading' },
      { label: 'Reading Test', to: '/reading/tests' },
    ],
  },
  {
    label: 'WRITING',
    mobileLabel: 'Writing',
    MobileIcon: PenLine,
    to: '/writing/overview',
    dropdown: [
      { label: 'Writing Overview', to: '/writing/overview' },
      { label: 'Writing Test', to: '/writing/tests' },
    ],
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/fc21zx6v_expires_30_days.png',
  },
  {
    label: 'SPEAKING',
    mobileLabel: 'Speaking',
    MobileIcon: Mic,
    to: '/speaking/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/gg3z1wbc_expires_30_days.png',
    dropdown: [
      { label: 'Speaking Overview', to: '/speaking/overview' },
      { label: 'Speaking Feed', to: '/speaking/feed' },
      { label: 'Speaking Test', to: '/speaking/tests' },
    ],
  },
  {
    label: 'GRAMMAR & VOCAB',
    mobileLabel: 'Grammar',
    MobileIcon: Languages,
    to: '/grammar-vocab/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/gg3z1wbc_expires_30_days.png',
    dropdown: [
      { label: 'Grammar & Vocab Overview', to: '/grammar-vocab/overview' },
      { label: 'Grammar & Vocab Test', to: '/grammar-vocab/tests' },
    ],
  },
  {
    label: 'DICTATION',
    mobileLabel: 'Dictation',
    MobileIcon: AudioLines,
    to: '/dictation',
    icon: null,
    dropdown: [
      { label: 'Dictation Practice', to: '/dictation' },
      { label: 'Flashcard', to: '/dictation?mode=flashcard' },
      { label: 'Vocabulary Notebook', to: '/dictation?mode=notebook' },
    ],
  },
];

export default function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.logoWrap}>
        <Link to="/">
          <img
            src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png"
            alt="AptiMate Logo"
            className={styles.logo}
          />
        </Link>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <div key={item.label} className={styles.navItemContainer}>
            <button
              className={styles.navItem}
              onClick={() => navigate(item.to)}
            >
              <span className={styles.navLabel}>{item.label}</span>
              {item.dropdown && <ChevronDown className={styles.navIcon} aria-hidden="true" />}
            </button>
            {item.dropdown && (
              <div className={styles.dropdownMenu}>
                {item.dropdown.map((subItem) => (
                  <button
                    key={subItem.label}
                    className={styles.dropdownItem}
                    onClick={() => navigate(subItem.to)}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <UserNotifications />
        {isAuthenticated ? (
          <div className={styles.userMenuContainer}>
            <div className={styles.userProfileBtn}>
              <img src={user?.avatar || 'https://placehold.co/32x32'} alt="User" className={styles.userAvatar} />
              <span className={styles.userName}>{user?.name}</span>
              <ChevronDown className={styles.navIcon} aria-hidden="true" />
            </div>
            <div className={styles.userDropdown}>
              <button className={styles.dropdownItem} onClick={() => navigate('/profile')}>
                <User size={16} style={{ marginRight: '8px' }} />
                My Profile
              </button>
              <button className={styles.dropdownItem} onClick={() => { logout(); navigate('/'); }}>
                <LogOut size={16} style={{ marginRight: '8px' }} />
                Log out
              </button>
            </div>
          </div>
        ) : (
          <button className={styles.signInBtn} onClick={() => navigate('/login')}>
            <span className={styles.signInText}>SIGN IN</span>
          </button>
        )}
      </div>
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <NavLink to="/" className={({ isActive }) => `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}>
          <Home className={styles.mobileNavIcon} aria-hidden="true" />
          <span>Home</span>
        </NavLink>
        {navItems.map((item) => {
          const MobileIcon = item.MobileIcon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
            >
              <MobileIcon className={styles.mobileNavIcon} aria-hidden="true" />
              <span>{item.mobileLabel}</span>
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
