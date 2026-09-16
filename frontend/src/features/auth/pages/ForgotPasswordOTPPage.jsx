import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import { authApi, getApiError } from '../services/authApi';
import { useToast } from '../../../context/ToastContext';

export default function ForgotPasswordOTPPage() {
  const navigate = useNavigate();
  const { showError, dismissToast } = useToast();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (busy) return;
    dismissToast();
    const email = sessionStorage.getItem('aptimate.password-reset.email');
    if (!email) {
      showError('Please request a new OTP to continue resetting your password.');
      navigate('/forgot-password', { replace: true });
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      showError('Please enter the 6-digit OTP from your email.');
      return;
    }
    setBusy(true);
    try {
      await authApi.verifyPasswordOtp(email, otp);
      navigate('/forgot-password/reset');
    } catch (requestError) {
      showError(getApiError(requestError, 'The OTP is invalid or expired.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>VERIFY OTP</span>
        <form className={styles.form} onSubmit={handleVerifyOTP} noValidate>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <span className={styles.label} style={{ textAlign: 'center', marginBottom: '10px' }}>
                Enter the OTP code sent to your email address
              </span>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>OTP Code</span>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputFull}`}
                  placeholder="Enter OTP (e.g. 123456)"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={busy || otp.length !== 6} className={styles.submitBtn}>
              <span className={styles.submitBtnText}>VERIFY</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
