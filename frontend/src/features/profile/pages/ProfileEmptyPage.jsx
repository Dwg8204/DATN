import React from 'react';
import ProfileSidebar from '../components/ProfileSidebar';
import styles from './ProfilePage.module.css';

export default function ProfileEmptyPage({ activeTab }) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab={activeTab} />
        <div className={styles.content}>
          {/* Empty content as requested */}
        </div>
      </div>
    </div>
  );
}
