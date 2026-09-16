import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import styles from './Auth.module.css';
import { useAuth } from '../../../context/AuthContext';
import { authApi, getApiError } from '../services/authApi';
import { useToast } from '../../../context/ToastContext';
import { validateEmail } from '../utils/emailValidation';
import { safeReturnPath } from '../utils/authorization';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, dismissToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (busy) return;
    dismissToast();

    const validationError = validateEmail(email) || (!password && 'Please enter your password.');
    if (validationError) {
      showError(validationError);
      return;
    }

    setBusy(true);
    try {
      const result = await authApi.login({ email: email.trim(), password });
      login(result);
      navigate(safeReturnPath(location.state?.from, result.profile?.role), { replace: true });
    } catch (requestError) { showError(getApiError(requestError, 'Unable to log in. Please try again.')); }
    finally { setBusy(false); }
  };
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>LOG IN TO YOUR ACCOUNT</span>
        <form className={styles.form} onSubmit={handleLogin} noValidate>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label}>Email</span>
                <input
                  type="email"
                  className={`${styles.input} ${styles.inputFull}`}
                  placeholder="abcxyz@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.inputCol}>
                <span className={styles.label}>Password</span>
                <PasswordInput
                  className={`${styles.input} ${styles.inputFull}`}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className={styles.optionsRow}>
                <Link to="/forgot-password" className={styles.forgotPassword}>
                  Forgot password?
                </Link>
              </div>
            </div>
            <button type="submit" disabled={busy} className={styles.submitBtn}>
              <span className={styles.submitBtnText}>LOG IN</span>
            </button>
          </div>
          <span className={styles.orText}>or</span>
          <div className={styles.socialRow}>
            <img
              src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/h1uwe8ii_expires_30_days.png"
              alt="Google"
              className={styles.socialIcon}
            />
            <img
              src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/wsv6okme_expires_30_days.png"
              alt="Facebook"
              className={styles.socialIcon}
            />
          </div>
        </form>
        <div className={styles.verifyBottomLink}>
          <span className={styles.bottomText}>Don’t have account?</span>
          <Link to="/signup" className={styles.bottomAction}>SIGN UP</Link>
        </div>
      </div>
    </div>
  );
}
