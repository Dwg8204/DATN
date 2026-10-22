import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { UserCircle, Bell, History, LogOut, LayoutDashboard, Menu } from 'lucide-react';
import styles from './ProfileSidebar.module.css';
import { useTranslation } from 'react-i18next';

export default function ProfileSidebar({ activeTab }) {
  const ui = useUiTranslation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch {
      // The shared API error toast explains why the session could not be closed.
    }
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileTitle}>
          {activeTab === 'info' || activeTab === 'password' ? t('profile.myProfile') :
            activeTab === 'notifications' ? t('profile.notifications') :
              activeTab === 'dashboard' ? t('profile.dashboard') :
                activeTab === 'history' ? t('profile.history') : activeTab === 'reports' ? t('personalization.reportsTitle') : activeTab === 'mistakes' ? t('personalization.mistakesTitle') : ''}
        </div>

        <div className={styles.mobileMenuContainer} ref={mobileMenuRef}>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={24} />
          </button>

          <div className={`${styles.mobileDropdown} ${isMobileMenuOpen ? styles.open : ''}`}>
            <button
              className={`${styles.dropdownItem} ${activeTab === 'info' || activeTab === 'password' ? styles.active : ''}`}
              onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }}
            >
              <UserCircle size={16} style={{ marginRight: '8px' }} />
              {t('profile.myProfile')}
            </button>

            <button
              className={`${styles.dropdownItem} ${activeTab === 'notifications' ? styles.active : ''}`}
              onClick={() => { navigate('/profile/notifications'); setIsMobileMenuOpen(false); }}
            >
              <Bell size={16} style={{ marginRight: '8px' }} />
              {t('profile.notifications')}
            </button>

            <button
              className={`${styles.dropdownItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
              onClick={() => { navigate('/profile/dashboard'); setIsMobileMenuOpen(false); }}
            >
              <LayoutDashboard size={16} style={{ marginRight: '8px' }} />
              {t('profile.dashboard')}
            </button>

            <button
              className={`${styles.dropdownItem} ${activeTab === 'history' ? styles.active : ''}`}
              onClick={() => { navigate('/profile/history'); setIsMobileMenuOpen(false); }}
            >
              <History size={16} style={{ marginRight: '8px' }} />
              {t('profile.history')}
            </button>

            <button className={styles.dropdownItem} onClick={() => { navigate('/profile/mistakes'); setIsMobileMenuOpen(false); }}><History size={16} style={{ marginRight: '8px' }} />{t('personalization.mistakesTitle')}</button>
            <button className={`${styles.dropdownItem} ${activeTab === 'reports' ? styles.active : ''}`} onClick={() => { navigate('/profile/reports'); setIsMobileMenuOpen(false); }}><History size={16} style={{ marginRight: '8px' }} />{t('personalization.reportsTitle')}</button>
            <button className={styles.dropdownItem} onClick={handleLogout}>
              <LogOut size={16} style={{ marginRight: '8px' }} />
              {t('profile.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.userInfo} ${styles.mobileHidden}`}>
        <img src={user?.avatar?.url || user?.avatar || 'https://placehold.co/74x74'} alt={ui("Avatar")} className={styles.avatar} />
        <div className={styles.userDetails}>
          <div className={styles.name}>{user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || ui("User")}</div>
          <div className={styles.email}>{user?.email || "email@example.com"}</div>
        </div>
      </div>



      <button className={`${styles.btnSetGoal} ${styles.mobileHidden}`} onClick={() => navigate('/profile')}>
        {t('goal.tracker')}
      </button>

      <div className={`${styles.divider} ${styles.mobileHidden}`}></div>

      <div className={styles.navMenu}>
        <button className={`${styles.navItem} ${activeTab === 'reports' ? styles.active : ''}`} onClick={() => navigate('/profile/reports')}><History size={20} className={styles.navIcon} /><span className={styles.navText}>{t('personalization.reportsTitle')}</span></button>
        <button className={`${styles.navItem} ${activeTab === 'mistakes' ? styles.active : ''}`} onClick={() => navigate('/profile/mistakes')}><History size={20} className={styles.navIcon} /><span className={styles.navText}>{t('personalization.mistakesTitle')}</span></button>
        <button
          className={`${styles.navItem} ${activeTab === 'info' || activeTab === 'password' ? styles.active : ''}`}
          onClick={() => navigate('/profile')}
          title={t('profile.myProfile')}
        >
          <UserCircle size={20} className={styles.navIcon} />
          <span className={styles.navText}>{t('profile.myProfile')}</span>
        </button>

        <button
          className={`${styles.navItem} ${activeTab === 'notifications' ? styles.active : ''}`}
          onClick={() => navigate('/profile/notifications')}
          title={t('profile.notifications')}
        >
          <Bell size={20} className={styles.navIcon} />
          <span className={styles.navText}>{t('profile.notifications')}</span>
        </button>

        <button
          className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => navigate('/profile/dashboard')}
          title={t('profile.dashboard')}
        >
          <LayoutDashboard size={20} className={styles.navIcon} />
          <span className={styles.navText}>{t('profile.dashboard')}</span>
        </button>

        <button
          className={`${styles.navItem} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => navigate('/profile/history')}
          title={t('profile.history')}
        >
          <History size={20} className={styles.navIcon} />
          <span className={styles.navText}>{t('profile.history')}</span>
        </button>

        <button className={styles.navItem} onClick={handleLogout} title={t('profile.logout')}>
          <LogOut size={20} className={styles.navIcon} />
          <span className={styles.navText}>{t('profile.logout')}</span>
        </button>
      </div>

    </div>
  );
}
