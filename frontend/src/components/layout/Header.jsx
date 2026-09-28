import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AudioLines, BookOpen, ChevronDown, Headphones, Home, Languages, Mic, PenLine, User, LogOut, Bell, LayoutDashboard, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './Header.module.css';
import { useAuth } from '../../context/AuthContext';
import UserNotifications from './UserNotifications';
import LanguageSelector from './LanguageSelector';

const navItems = [
  {
    key: 'listening',
    label: 'LISTENING',
    mobileLabel: 'Listening',
    MobileIcon: Headphones,
    to: '/listening/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/p9xrd9hn_expires_30_days.png',
    dropdown: [
      { label: 'Listening Overview', to: '/listening/overview' },
      { label: 'Listening Feed', to: '/listening/feed' },
      { label: 'Listening Practice', to: '/listening/practice' },
      { label: 'Listening Test', to: '/listening/tests' },
    ],
  },
  {
    key: 'reading',
    label: 'READING',
    mobileLabel: 'Reading',
    MobileIcon: BookOpen,
    to: '/reading',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/4d89xmet_expires_30_days.png',
    dropdown: [
      { label: 'Reading Overview', to: '/reading' },
      { label: 'Reading Practice', to: '/reading/practice' },
      { label: 'Reading Test', to: '/reading/tests' },
    ],
  },
  {
    key: 'writing',
    label: 'WRITING',
    mobileLabel: 'Writing',
    MobileIcon: PenLine,
    to: '/writing/overview',
    dropdown: [
      { label: 'Writing Overview', to: '/writing/overview' },
      { label: 'Writing Practice', to: '/writing/practice' },
      { label: 'Writing Test', to: '/writing/tests' },
    ],
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/fc21zx6v_expires_30_days.png',
  },
  {
    key: 'speaking',
    label: 'SPEAKING',
    mobileLabel: 'Speaking',
    MobileIcon: Mic,
    to: '/speaking/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/gg3z1wbc_expires_30_days.png',
    dropdown: [
      { label: 'Speaking Overview', to: '/speaking/overview' },
      { label: 'Speaking Feed', to: '/speaking/feed' },
      { label: 'Speaking Practice', to: '/speaking/practice' },
      { label: 'Speaking Test', to: '/speaking/tests' },
    ],
  },
  {
    key: 'grammar',
    label: 'GRAMMAR & VOCAB',
    mobileLabel: 'Grammar',
    MobileIcon: Languages,
    to: '/grammar-vocab/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/gg3z1wbc_expires_30_days.png',
    dropdown: [
      { label: 'Grammar & Vocab Overview', to: '/grammar-vocab/overview' },
      { label: 'Grammar & Vocab Practice', to: '/grammar-vocab/practice' },
      { label: 'Grammar & Vocab Test', to: '/grammar-vocab/tests' },
    ],
  },
  {
    key: 'dictation',
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

function dropdownLabel(item, subItem, t) {
  if (item.key === 'dictation') {
    if (subItem.to.includes('flashcard')) return t('nav.flashcard');
    if (subItem.to.includes('notebook')) return t('nav.vocabularyNotebook');
  }
  const section = subItem.to.includes('/practice') ? 'practice' : subItem.to.includes('/tests') ? 'tests'
    : subItem.to.includes('/feed') ? 'feed' : 'overview';
  return section === 'feed' ? t('nav.feed') : t(`common.${section}`);
}

export default function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
              <span className={styles.navLabel}>{t(`nav.${item.key}`).toUpperCase()}</span>
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
                    {dropdownLabel(item, subItem, t)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <LanguageSelector />
        <UserNotifications />
        {isAuthenticated ? (
          <div className={styles.userMenuContainer} ref={userMenuRef}>
            <div
              className={styles.userProfileBtn}
              onClick={() => {
                if (window.innerWidth <= 700) {
                  navigate('/profile');
                } else {
                  setIsUserMenuOpen(!isUserMenuOpen);
                }
              }}
            >
              <img src={user?.avatar?.url || user?.avatar || 'https://placehold.co/32x32'} alt="User" className={styles.userAvatar} />
              <span className={styles.userName}>{user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ')}</span>
              <ChevronDown className={styles.navIcon} aria-hidden="true" />
            </div>
            {isUserMenuOpen && window.innerWidth > 700 && (
              <div className={`${styles.userDropdown} ${styles.open}`}>
                <button className={styles.dropdownItem} onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}>
                  <User size={16} style={{ marginRight: '8px' }} />
                  {t('profile.myProfile')}
                </button>
                <button className={styles.dropdownItem} onClick={() => { navigate('/profile/notifications'); setIsUserMenuOpen(false); }}>
                  <Bell size={16} style={{ marginRight: '8px' }} />
                  {t('profile.notifications')}
                </button>
                <button className={styles.dropdownItem} onClick={() => { navigate('/profile/dashboard'); setIsUserMenuOpen(false); }}>
                  <LayoutDashboard size={16} style={{ marginRight: '8px' }} />
                  {t('profile.dashboard')}
                </button>
                <button className={styles.dropdownItem} onClick={() => { navigate('/profile/history'); setIsUserMenuOpen(false); }}>
                  <History size={16} style={{ marginRight: '8px' }} />
                  {t('profile.history')}
                </button>
                <button className={styles.dropdownItem} onClick={async () => {
                  setIsUserMenuOpen(false);
                  try {
                    await logout();
                    navigate('/', { replace: true });
                  } catch {
                    // The shared API error toast keeps the user informed.
                  }
                }}>
                  <LogOut size={16} style={{ marginRight: '8px' }} />
                  {t('profile.logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className={styles.signInBtn} onClick={() => navigate('/login')}>
            <span className={styles.signInText}>{t('profile.signIn').toUpperCase()}</span>
          </button>
        )}
      </div>
      <nav className={styles.mobileNav} aria-label={t('nav.mobileNavigation')}>
        <NavLink to="/" className={({ isActive }) => `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}>
          <Home className={styles.mobileNavIcon} aria-hidden="true" />
          <span>{t('nav.home')}</span>
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
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
