import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';

export default function ForgotPasswordOTPPage() {
  const navigate = useNavigate();

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    // Giả lập xác thực OTP thành công
    navigate('/forgot-password/reset');
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>VERIFY OTP</span>
        <form className={styles.form} onSubmit={handleVerifyOTP}>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <span className={styles.label} style={{ textAlign: 'center', marginBottom: '10px' }}>
                Vui lòng nhập mã OTP đã được gửi về email của bạn
              </span>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>OTP Code</span>
                <input
                  type="text"
                  className={`${styles.input} ${styles.inputFull}`}
                  placeholder="Enter OTP (e.g. 123456)"
                  required
                />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn}>
              <span className={styles.submitBtnText}>VERIFY</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
