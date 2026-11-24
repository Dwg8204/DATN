import InfoTooltip from '../../../components/common/InfoTooltip';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { validatePassword } from '../utils/passwordValidation';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import styles from './Auth.module.css';
import { useAuth } from '../../../context/AuthContext';
import { authApi, getApiError } from '../services/authApi';
import { useToast } from '../../../context/ToastContext';
import { validateEmail } from '../utils/emailValidation';

export default function SignupPage() {
  const ui = useUiTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess, dismissToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (busy) return;
    dismissToast();

    const validationError = (!firstName.trim() && 'Please enter your first name.')
      || (!lastName.trim() && 'Please enter your last name.')
      || (([...firstName.trim()].length > 100 || [...lastName.trim()].length > 100) && 'First name and last name must each be at most 100 characters.')
      || validateEmail(email)
      || validatePassword(password, confirmPassword);
    if (validationError) {
      showError(ui(validationError));
      return;
    }

    setBusy(true);
    try {
      const result = await authApi.register({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, confirmPassword });
      login(result);
      showSuccess(ui("Your account has been created successfully."));
      navigate('/');
    } catch (requestError) {
      showError(getApiError(requestError, ui("Unable to create your account. Please try again.")));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.signupWrapper}>
      <div className={styles.container}>
        <span className={styles.title}>{ui("SIGN UP TO YOUR ACCOUNT")}</span>
        <form className={styles.signupForm} onSubmit={handleSignup} noValidate>
          <div className={styles.signupFormGroup}>
            <div className={styles.inputRow}>
              <div className={styles.inputColMargin}>
                <label htmlFor="signup-first-name" className={styles.label}>{ui("First name")} <span className={styles.requiredMark} aria-hidden="true">*</span> <InfoTooltip label={ui("More information")} text={ui("First name and last name must each be at most 100 characters.")} /></label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputHalf}`}
                  id="signup-first-name" maxLength={100} autoComplete="given-name"
                  required
                  value={firstName}
                  onMouseEnter={(event) => { const input = event.currentTarget; input.title = input.scrollWidth > input.clientWidth ? input.value : ""; }}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className={styles.inputCol}>
                <label htmlFor="signup-last-name" className={styles.label}>{ui("Last name")} <span className={styles.requiredMark} aria-hidden="true">*</span> <InfoTooltip label={ui("More information")} text={ui("First name and last name must each be at most 100 characters.")} /></label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputHalf}`}
                  id="signup-last-name" maxLength={100} autoComplete="family-name"
                  required
                  value={lastName}
                  onMouseEnter={(event) => { const input = event.currentTarget; input.title = input.scrollWidth > input.clientWidth ? input.value : ""; }}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.inputCol}>
              <label htmlFor="signup-email" className={styles.label}>{ui("Email")} <span className={styles.requiredMark} aria-hidden="true">*</span></label>
              <input
                type="email"
                className={`${styles.input} ${styles.inputFull}`}
                placeholder="abcxyz@gmail.com"
                id="signup-email" maxLength={320} autoComplete="email"
                  required
                  value={email}
                  onMouseEnter={(event) => { const input = event.currentTarget; input.title = input.scrollWidth > input.clientWidth ? input.value : ""; }}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={styles.inputCol}>
              <label htmlFor="signup-password" className={styles.label}>{ui("Password")} <span className={styles.requiredMark} aria-hidden="true">*</span> <InfoTooltip label={ui("More information")} text={ui("Password must contain at least 8 characters, an uppercase letter (A-Z), a lowercase letter (a-z), a number and a special character.")} /></label>
              <PasswordInput
                className={`${styles.input} ${styles.inputFull}`}
                autoComplete="new-password"
                id="signup-password"
                  required
                  value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className={styles.inputCol}>
              <label htmlFor="signup-confirm" className={styles.label}>{ui("Confirm password")} <span className={styles.requiredMark} aria-hidden="true">*</span></label>
              <PasswordInput
                className={`${styles.input} ${styles.inputFull}`}
                autoComplete="new-password"
                id="signup-confirm"
                  required
                  value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className={styles.submitBtnSignup}>
            <span className={styles.submitBtnText}>{ui("SIGN UP")}</span>
          </button>
        </form>
        <div className={styles.signupBottomLink}>
          <span className={styles.bottomText}>{ui("Already have account?")}</span>
          <Link to="/login" className={styles.bottomAction}>{ui("Sign in")}</Link>
        </div>
      </div>
    </div>
  );
}
