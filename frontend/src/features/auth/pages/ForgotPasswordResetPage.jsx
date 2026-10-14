import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import PasswordInput from '../components/PasswordInput';
import { validatePassword } from '../utils/passwordValidation';
import { authApi, getApiError } from '../services/authApi';
import { useToast } from '../../../context/ToastContext';

export default function ForgotPasswordResetPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();
  const { showError, showSuccess, dismissToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    dismissToast();
    const validationError = validatePassword(newPassword, confirmPassword);
    if (validationError) {
      showError(validationError);
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword({ newPassword, confirmPassword });
      sessionStorage.removeItem('aptimate.password-reset.email');
      showSuccess(ui("Password updated successfully. Please sign in."));
      navigate('/login', { replace: true });
    } catch (requestError) {
      showError(getApiError(requestError, ui("Unable to reset the password. Please request a new OTP.")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>{ui("RESET PASSWORD")}</span>
        <form className={styles.form} onSubmit={handleResetPassword} noValidate>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>{ui("New Password")}</span>
                <PasswordInput
                  className={`${styles.input} ${styles.inputFull}`}
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>{ui("Confirm New Password")}</span>
                <PasswordInput
                  className={`${styles.input} ${styles.inputFull}`}
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={busy} className={styles.submitBtn}>
              <span className={styles.submitBtnText}>{ui("UPDATE PASSWORD")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
