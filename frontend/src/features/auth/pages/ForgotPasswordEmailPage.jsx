import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import { authApi, getApiError } from '../services/authApi';
import { useToast } from '../../../context/ToastContext';
import { validateEmail } from '../utils/emailValidation';

export default function ForgotPasswordEmailPage() {
  const navigate = useNavigate();
  const { showError, showSuccess, dismissToast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (busy) return;
    dismissToast();
    const validationError = validateEmail(email);
    if (validationError) {
      showError(validationError);
      return;
    }
    setBusy(true);
    try {
      await authApi.requestPasswordOtp(email.trim());
      sessionStorage.setItem('aptimate.password-reset.email', email.trim().toLowerCase());
      showSuccess('If an account exists for this email, an OTP has been sent. Please check your inbox.');
      navigate('/forgot-password/verify-otp');
    } catch (requestError) {
      showError(getApiError(requestError, 'Unable to send the OTP. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>FORGOT PASSWORD</span>
        <form className={styles.form} onSubmit={handleSendOTP} noValidate>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>Email</span>
                <input
                  type="email"
                  className={`${styles.input} ${styles.inputFull}`}
                  placeholder="abcxyz@gmail.com"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  disabled={busy}
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={busy} aria-busy={busy} className={styles.submitBtn}>
              <span className={styles.submitBtnText}>
                {busy && <LoaderCircle className={styles.loadingIcon} aria-hidden="true" />}
                {busy ? 'SENDING OTP...' : 'SEND OTP'}
              </span>
            </button>
            {busy && <p className={styles.loadingHint} role="status">Connecting to the email service. This may take a few seconds.</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
