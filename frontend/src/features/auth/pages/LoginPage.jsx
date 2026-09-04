import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import styles from './Auth.module.css';
import { useAuth } from '../../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('aptimate.mock_users') || '[]');
    const user = existingUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      setError('Invalid email or password.');
      return;
    }

    // Exclude password from profile
    const { password: _, ...profile } = user;
    
    login({ accessToken: 'mock-token-' + Date.now(), profile });
    navigate('/');
  };
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>LOG IN TO YOUR ACCOUNT</span>
        {error && <div style={{ color: 'red', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form className={styles.form} onSubmit={handleLogin}>
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
            <button type="submit" className={styles.submitBtn}>
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
