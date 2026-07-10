import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';

export default function ForgotPasswordResetPage() {
  const navigate = useNavigate();

  const handleResetPassword = (e) => {
    e.preventDefault();
    // Giả lập cập nhật mật khẩu thành công và quay về trang đăng nhập
    alert("Password updated successfully!");
    navigate('/login');
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <span className={styles.title}>RESET PASSWORD</span>
        <form className={styles.form} onSubmit={handleResetPassword}>
          <div className={styles.formGroup}>
            <div className={styles.signupFormGroup}>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>New Password</span>
                <input
                  type="password"
                  className={`${styles.input} ${styles.inputFull}`}
                  required
                />
              </div>
              <div className={styles.inputCol}>
                <span className={styles.label} style={{ alignSelf: 'flex-start' }}>Confirm New Password</span>
                <input
                  type="password"
                  className={`${styles.input} ${styles.inputFull}`}
                  required
                />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn}>
              <span className={styles.submitBtnText}>UPDATE PASSWORD</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
