import React from 'react';
import { Link } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import styles from './Auth.module.css';

export default function LoginPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>LOG IN TO YOUR ACCOUNT</span>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ marginRight: '592px' }}>Email</span>
                <input
                  type="email"
                  className={`${styles.input} ${styles.inputFull}`}
                  placeholder="abcxyz@gmail.com"
                />
              </div>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ marginRight: '557px' }}>Password</span>
                <PasswordInput
                  className={`${styles.input} ${styles.inputFull}`}
                  autoComplete="current-password"
                />
              </div>
              <div className={styles.optionsRow}>
                <Link to="/forgot-password" className={styles.forgotPassword}>
                  Forgot password?
                </Link>
              </div>
            </div>
            <button className={styles.submitBtn}>
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
        </div>
        <div className={styles.verifyBottomLink}>
          <span className={styles.bottomText}>Don’t have account?</span>
          <Link to="/signup" className={styles.bottomAction}>SIGN UP</Link>
        </div>
      </div>
    </div>
  );
}
