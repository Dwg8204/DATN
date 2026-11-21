import InfoTooltip from '../../../components/common/InfoTooltip';
import PasswordRequirements from '../components/PasswordRequirements';
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
      showError(ui(validationError));
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
                <label htmlFor="reset-new" className={styles.label} style={{ alignSelf: 'flex-start' }}>{ui("New Password")} <span className={styles.requiredMark} aria-hidden="true">*</span> <InfoTooltip label={ui("More information")} text={ui("Password must contain at least 8 characters, an uppercase letter (A-Z), a lowercase letter (a-z), a number and a special character.")} /></label>
                <PasswordInput
                  className={`${styles.input} ${styles.inputFull}`}
                  id="reset-new" aria-describedby="reset-new-rules"
                  required
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              <PasswordRequirements id="reset-new-rules" />
              </div>
              <div className={styles.inputCol}>
                <label htmlFor="reset-confirm" className={styles.label} style={{ alignSelf: 'flex-start' }}>{ui("Confirm New Password")} <span className={styles.requiredMark} aria-hidden="true">*</span></label>
                <PasswordInput
                  className={`${styles.input} ${styles.inputFull}`}
                  id="reset-confirm"
                  required
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
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
