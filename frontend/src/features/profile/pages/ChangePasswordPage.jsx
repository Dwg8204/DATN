import React, { useState } from 'react';
import ProfileSidebar from '../components/ProfileSidebar';
import styles from './ChangePasswordPage.module.css';
import PasswordInput from '../../auth/components/PasswordInput';
import { useAuth } from '../../../context/AuthContext';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { useToast } from '../../../context/ToastContext';
import { addPersonalNotification } from '../../../utils/notificationStorage';
import { useNavigate } from 'react-router-dom';
import { authApi, getApiError } from '../../auth/services/authApi';
import { validatePassword } from '../../auth/utils/passwordValidation';

export default function ChangePasswordPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess, dismissToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    dismissToast();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Please fill in all fields.');
      return;
    }

    const passwordError = validatePassword(newPassword, confirmPassword);
    if (passwordError) {
      showError(passwordError);
      return;
    }

    setShowConfirm(true);
  };

  const executeSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setShowConfirm(false);
      showSuccess('Password changed successfully. Please sign in again.');
      try {
        addPersonalNotification('Password changed successfully.');
      } catch {
        // A full browser notification store must not turn a successful password change into an error.
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      showError(getApiError(requestError, 'Unable to update your password. Please try again.'));
      setShowConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="password" />

        <div className={styles.content}>
          <h1 className={styles.title}>Change password</h1>

          <form className={styles.form} onSubmit={handleFormSubmit} noValidate>
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
              <button type="submit" disabled={busy} className={styles.saveBtn}>
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
