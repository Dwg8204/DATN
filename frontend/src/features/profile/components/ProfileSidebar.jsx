import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { UserCircle, Bell, History, LogOut } from 'lucide-react';
import styles from './ProfileSidebar.module.css';

export default function ProfileSidebar({ activeTab }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.userInfo}>
        <img src={user?.avatar || 'https://placehold.co/74x74'} alt="Avatar" className={styles.avatar} />
        <div className={styles.userDetails}>
          <div className={styles.name}>{user?.name || 'User'}</div>
          <div className={styles.email}>{user?.email || 'email@example.com'}</div>
        </div>
      </div>
      
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
