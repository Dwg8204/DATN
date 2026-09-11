import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { UserCircle, Bell, History, LogOut, LayoutDashboard, Menu } from 'lucide-react';
import { calcGoalProgress } from '../../../utils/dashboardUtils';
import { getHistoryEntries } from '../../../utils/historyStorage';
import styles from './ProfileSidebar.module.css';

export default function ProfileSidebar({ activeTab }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const historyEntries = getHistoryEntries();
  const savedConfig = localStorage.getItem('aptimate.dashboard_goal');
  const goalConfig = savedConfig ? JSON.parse(savedConfig) : { active: false };
  const goalProgress = goalConfig.active ? calcGoalProgress(goalConfig, historyEntries) : null;

  return (
    <div className={styles.sidebar}>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileTitle}>
          {activeTab === 'info' || activeTab === 'password' ? 'Personal Information' :
           activeTab === 'notifications' ? 'Notifications' :
           activeTab === 'dashboard' ? 'Dashboard' :
           activeTab === 'history' ? 'My Learning History' : ''}
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
              Personal Information
            </button>
            
            <button 
              className={`${styles.dropdownItem} ${activeTab === 'notifications' ? styles.active : ''}`}
              onClick={() => { navigate('/profile/notifications'); setIsMobileMenuOpen(false); }}
            >
              <Bell size={16} style={{ marginRight: '8px' }} />
              Notifications
            </button>

            <button 
              className={`${styles.dropdownItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
              onClick={() => { navigate('/profile/dashboard'); setIsMobileMenuOpen(false); }}
            >
              <LayoutDashboard size={16} style={{ marginRight: '8px' }} />
              Dashboard
            </button>
            
            <button 
              className={`${styles.dropdownItem} ${activeTab === 'history' ? styles.active : ''}`}
              onClick={() => { navigate('/profile/history'); setIsMobileMenuOpen(false); }}
            >
              <History size={16} style={{ marginRight: '8px' }} />
              My Learning History
            </button>
            
            <button className={styles.dropdownItem} onClick={handleLogout}>
              <LogOut size={16} style={{ marginRight: '8px' }} />
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.userInfo} ${styles.mobileHidden}`}>
        <img src={user?.avatar || 'https://placehold.co/74x74'} alt="Avatar" className={styles.avatar} />
        <div className={styles.userDetails}>
          <div className={styles.name}>{user?.name || 'User'}</div>
          <div className={styles.email}>{user?.email || 'email@example.com'}</div>
        </div>
      </div>
      
      {goalConfig.active && goalProgress ? (
        <div className={`${styles.goalGrid} ${styles.mobileHidden}`}>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Target</div>
            <div className={styles.goalTileValuePrimary}>Band {goalConfig.targetBand}</div>
          </div>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Current (Est.)</div>
            <div className={styles.goalTileValue}>Band {goalProgress.currentEstBand}</div>
          </div>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Completed</div>
            <div className={styles.goalTileValue}>
              {goalProgress.completedTests} <span className={styles.goalTileUnit}>tests</span>
            </div>
          </div>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Learning Time</div>
            <div className={styles.goalTileValue}>
              {goalProgress.totalHours} <span className={styles.goalTileUnit}>hours</span>
            </div>
          </div>
        </div>
      ) : null}

      <button className={`${styles.btnSetGoal} ${styles.mobileHidden}`} onClick={() => navigate('/profile')}>
        {goalConfig.active ? 'Change Goal' : 'Set Learning Goal'}
      </button>
      
      <div className={`${styles.divider} ${styles.mobileHidden}`}></div>
      
      <div className={styles.navMenu}>
        <button 
          className={`${styles.navItem} ${activeTab === 'info' || activeTab === 'password' ? styles.active : ''}`}
          onClick={() => navigate('/profile')}
          title="Personal Information"
        >
          <UserCircle size={20} className={styles.navIcon} />
          <span className={styles.navText}>Personal Information</span>
        </button>
        
        <button 
          className={`${styles.navItem} ${activeTab === 'notifications' ? styles.active : ''}`}
          onClick={() => navigate('/profile/notifications')}
          title="Notifications"
        >
          <Bell size={20} className={styles.navIcon} />
          <span className={styles.navText}>Notifications</span>
        </button>

        <button 
          className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => navigate('/profile/dashboard')}
          title="Dashboard"
        >
          <LayoutDashboard size={20} className={styles.navIcon} />
          <span className={styles.navText}>Dashboard</span>
        </button>
        
        <button 
          className={`${styles.navItem} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => navigate('/profile/history')}
          title="My Learning History"
        >
          <History size={20} className={styles.navIcon} />
          <span className={styles.navText}>My Learning History</span>
        </button>
        
        <button className={styles.navItem} onClick={handleLogout} title="Log out">
          <LogOut size={20} className={styles.navIcon} />
          <span className={styles.navText}>Log out</span>
        </button>
      </div>

    </div>
  );
}
