import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';

export default function ForgotPasswordEmailPage() {
  const navigate = useNavigate();

  const handleSendOTP = (e) => {
    e.preventDefault();
    // Giả lập xử lý gửi OTP thành công và chuyển sang bước 2
    navigate('/forgot-password/verify-otp');
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>FORGOT PASSWORD</span>
        <form className={styles.form} onSubmit={handleSendOTP}>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>Email</span>
                <input
                  type="email"
                  className={`${styles.input} ${styles.inputFull}`}
                  placeholder="abcxyz@gmail.com"
                  required
                />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn}>
              <span className={styles.submitBtnText}>SEND OTP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
