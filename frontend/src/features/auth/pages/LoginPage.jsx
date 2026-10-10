import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import styles from './Auth.module.css';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../services/authApi';
import { useToast } from '../../../context/ToastContext';
import { validateEmail } from '../utils/emailValidation';
import { safeReturnPath } from '../utils/authorization';
import { useTranslation } from 'react-i18next';
import { normalizeApiError } from '../../../services/apiError';

export default function LoginPage() {
  const { t } = useTranslation();
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

    const validationError = validateEmail(email, t) || (!password && t('auth.passwordRequired'));
    if (validationError) {
      showError(validationError);
      return;
    }

    setBusy(true);
    try {
      const result = await authApi.login({ email: email.trim(), password });
      login(result);
      navigate(safeReturnPath(location.state?.from, result.profile?.role), { replace: true });
    } catch (requestError) {
      const error = normalizeApiError(requestError, t('auth.loginFailed'));
      showError(t(`auth.errors.${error.code}`, { defaultValue: error.message || t('auth.loginFailed') }));
    }
    finally { setBusy(false); }
  };
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>{t('auth.loginTitle')}</span>
        <form className={styles.form} onSubmit={handleLogin} noValidate>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label}>{t('auth.email')}</span>
                <input
                  type="email"
                  className={`${styles.input} ${styles.inputFull}`}
                  placeholder="abcxyz@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.inputCol}>
                <span className={styles.label}>{t('auth.password')}</span>
                <PasswordInput
                  className={`${styles.input} ${styles.inputFull}`}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className={styles.optionsRow}>
                <Link to="/forgot-password" className={styles.forgotPassword}>
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>
            <button type="submit" disabled={busy} className={styles.submitBtn}>
              <span className={styles.submitBtnText}>{busy ? t('auth.loggingIn') : t('auth.login')}</span>
            </button>
          </div>
          <span className={styles.orText}>{t('auth.or')}</span>
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
          <span className={styles.bottomText}>{t('auth.noAccount')}</span>
          <Link to="/signup" className={styles.bottomAction}>{t('auth.signUp')}</Link>
        </div>
      </div>
    </div>
  );
}
