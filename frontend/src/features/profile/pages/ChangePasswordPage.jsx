import React, { useState } from 'react';
import ProfileSidebar from '../components/ProfileSidebar';
import styles from './ChangePasswordPage.module.css';
import PasswordInput from '../../auth/components/PasswordInput';
import { useAuth } from '../../../context/AuthContext';
import ConfirmModal from '../../../components/common/ConfirmModal';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    setShowConfirm(true);
  };

  const executeSave = () => {
    try {
      const existingUsers = JSON.parse(localStorage.getItem('aptimate.mock_users') || '[]');
      const userIndex = existingUsers.findIndex(u => u.email === user.email);

      if (userIndex === -1) {
        setError('User not found in local database.');
        return;
      }

      const currentUserRecord = existingUsers[userIndex];
      
      if (currentUserRecord.password !== currentPassword) {
        setError('Current password is incorrect.');
        return;
      }

      existingUsers[userIndex].password = newPassword;
      localStorage.setItem('aptimate.mock_users', JSON.stringify(existingUsers));

      setShowConfirm(false);
      alert('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError('An error occurred while updating the password.');
      console.error(e);
      setShowConfirm(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="password" />
        
        <div className={styles.content}>
          <h1 className={styles.title}>Change password</h1>
          
          <form className={styles.form} onSubmit={handleFormSubmit}>
            {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
            
            <div className={styles.inputCol}>
              <label className={styles.label}>Current password</label>
              <PasswordInput 
                className={styles.input} 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
              />
            </div>
            
            <div className={styles.inputCol}>
              <label className={styles.label}>New password</label>
              <PasswordInput 
                className={styles.input} 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
              />
            </div>
            
            <div className={styles.inputCol}>
              <label className={styles.label}>Confirm new password</label>
              <PasswordInput 
                className={styles.input} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
              />
            </div>
            
            <div className={styles.actions}>
              <button type="submit" className={styles.saveBtn}>
                Save changes
              </button>
            </div>
          </form>

          {showConfirm && (
            <ConfirmModal 
              title="Change Password"
              message="Are you sure you want to change your password?"
              onConfirm={executeSave}
              onCancel={() => setShowConfirm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
