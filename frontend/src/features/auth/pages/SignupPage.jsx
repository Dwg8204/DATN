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
      || validateEmail(email)
      || validatePassword(password, confirmPassword);
    if (validationError) {
      showError(validationError);
      return;
    }

    setBusy(true);
    try {
      const result = await authApi.register({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, confirmPassword });
      login(result);
      showSuccess('Your account has been created successfully.');
      navigate('/');
    } catch (requestError) {
      showError(getApiError(requestError, 'Unable to create your account. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.signupWrapper}>
      <div className={styles.container}>
        <span className={styles.title}>SIGN UP TO YOUR ACCOUNT</span>
        <form className={styles.signupForm} onSubmit={handleSignup} noValidate>
          <div className={styles.signupFormGroup}>
            <div className={styles.inputRow}>
              <div className={styles.inputColMargin}>
                <span className={styles.label}>First Name</span>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputHalf}`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className={styles.inputCol}>
                <span className={styles.label}>Last Name</span>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputHalf}`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className={styles.inputCol}>
              <span className={styles.label}>Confirm password</span>
              <PasswordInput
                className={`${styles.input} ${styles.inputFull}`}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className={styles.submitBtnSignup}>
            <span className={styles.submitBtnText}>SIGN UP</span>
          </button>
        </form>
        <div className={styles.signupBottomLink}>
          <span className={styles.bottomText}>Already have account?</span>
          <Link to="/login" className={styles.bottomAction}>SIGN IN</Link>
        </div>
      </div>
    </div>
  );
}
