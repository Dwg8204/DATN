import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';

export default function SignupPage() {
  return (
    <div className={styles.signupWrapper}>
      <div className={styles.container}>
        <span className={styles.title}>SIGN UP TO YOUR ACCOUNT</span>
        <div className={styles.signupForm}>
          <div className={styles.signupFormGroup}>
            <div className={styles.inputRow}>
              <div className={styles.inputColMargin}>
                <span className={styles.label} style={{ marginRight: '192px' }}>First Name</span>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputHalf}`}
                />
              </div>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ marginRight: '194px' }}>Last Name</span>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputHalf}`}
                />
              </div>
            </div>
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
              <input
                type="password"
                className={`${styles.input} ${styles.inputFull}`}
              />
            </div>
            <div className={styles.inputCol}>
              <span className={styles.label} style={{ marginRight: '488px' }}>Confirm password</span>
              <input
                type="password"
                className={`${styles.input} ${styles.inputFull}`}
              />
            </div>
          </div>
          <button className={styles.submitBtnSignup}>
            <span className={styles.submitBtnText}>SIGN UP</span>
          </button>
        </div>
        <div className={styles.signupBottomLink}>
          <span className={styles.bottomText}>Already have account?</span>
          <Link to="/login" className={styles.bottomAction}>SIGN IN</Link>
        </div>
      </div>
    </div>
  );
}
