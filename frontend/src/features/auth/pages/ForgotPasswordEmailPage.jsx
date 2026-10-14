import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import { authApi, getApiError } from '../services/authApi';
import { useToast } from '../../../context/ToastContext';
import { validateEmail } from '../utils/emailValidation';

export default function ForgotPasswordEmailPage() {
  const ui = useUiTranslation();
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
      showSuccess(ui("If an account exists for this email, an OTP has been sent. Please check your inbox."));
      navigate('/forgot-password/verify-otp');
    } catch (requestError) {
      showError(getApiError(requestError, ui("Unable to send the OTP. Please try again.")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>{ui("FORGOT PASSWORD")}</span>
        <form className={styles.form} onSubmit={handleSendOTP} noValidate>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>{ui("Email")}</span>
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
                {busy ? ui("SENDING OTP...") : ui("SEND OTP")}
              </span>
            </button>
            {busy && <p className={styles.loadingHint} role="status">{ui("Connecting to the email service. This may take a few seconds.")}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
