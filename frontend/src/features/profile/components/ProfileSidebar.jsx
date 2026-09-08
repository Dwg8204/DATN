import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { UserCircle, Bell, History, LogOut, LayoutDashboard } from 'lucide-react';
import { calcGoalProgress } from '../../../utils/dashboardUtils';
import { getHistoryEntries } from '../../../utils/historyStorage';
import styles from './ProfileSidebar.module.css';

export default function ProfileSidebar({ activeTab }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      <div className={styles.userInfo}>
        <img src={user?.avatar || 'https://placehold.co/74x74'} alt="Avatar" className={styles.avatar} />
        <div className={styles.userDetails}>
          <div className={styles.name}>{user?.name || 'User'}</div>
          <div className={styles.email}>{user?.email || 'email@example.com'}</div>
        </div>
      </div>
      
      {goalConfig.active && goalProgress ? (
        <div className={styles.goalGrid}>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Mục tiêu</div>
            <div className={styles.goalTileValuePrimary}>Band {goalConfig.targetBand}</div>
          </div>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Hiện tại (Est.)</div>
            <div className={styles.goalTileValue}>Band {goalProgress.currentEstBand}</div>
          </div>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Đã hoàn thành</div>
            <div className={styles.goalTileValue}>
              {goalProgress.completedTests} <span className={styles.goalTileUnit}>đề</span>
            </div>
          </div>
          <div className={styles.goalTile}>
            <div className={styles.goalTileTitle}>Thời gian học</div>
            <div className={styles.goalTileValue}>
              {goalProgress.totalHours} <span className={styles.goalTileUnit}>giờ</span>
            </div>
          </div>
        </div>
      ) : null}

      <button className={styles.btnSetGoal} onClick={() => navigate('/profile')}>
        {goalConfig.active ? 'Thay đổi mục tiêu' : 'Đặt mục tiêu học tập'}
      </button>
      
      <div className={styles.divider}></div>
      
      <div className={styles.navMenu}>
        <button 
          className={`${styles.navItem} ${activeTab === 'info' || activeTab === 'password' ? styles.active : ''}`}
          onClick={() => navigate('/profile')}
        >
          <UserCircle size={20} style={{ marginRight: '16px' }} />
          <span>Personal Information</span>
        </button>
        
        <button 
          className={`${styles.navItem} ${activeTab === 'notifications' ? styles.active : ''}`}
          onClick={() => navigate('/profile/notifications')}
        >
          <Bell size={20} style={{ marginRight: '16px' }} />
          <span>Notifications</span>
        </button>

        <button 
          className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => navigate('/profile/dashboard')}
        >
          <LayoutDashboard size={20} style={{ marginRight: '16px' }} />
          <span>Dashboard</span>
        </button>
        
        <button 
          className={`${styles.navItem} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => navigate('/profile/history')}
        >
          <History size={20} style={{ marginRight: '16px' }} />
          <span>My Learning History</span>
        </button>
        
        <button className={styles.navItem} onClick={handleLogout}>
          <LogOut size={20} style={{ marginRight: '16px' }} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
