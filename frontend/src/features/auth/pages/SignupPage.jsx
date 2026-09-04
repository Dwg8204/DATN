import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import styles from './Auth.module.css';
import { useAuth } from '../../../context/AuthContext';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = (e) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('aptimate.mock_users') || '[]');
    if (existingUsers.some(u => u.email === email)) {
      setError('Email already in use.');
      return;
    }

    const newUser = {
      id: Date.now(),
      name: `${firstName} ${lastName}`,
      email,
      password, // Note: In a real app, passwords should be hashed
      avatar: 'https://placehold.co/100x100?text=' + firstName.charAt(0)
    };

    existingUsers.push(newUser);
    localStorage.setItem('aptimate.mock_users', JSON.stringify(existingUsers));

    // Exclude password from profile
    const { password: _, ...profile } = newUser;
    
    login({ accessToken: 'mock-token-' + Date.now(), profile });
    navigate('/');
  };
  return (
    <div className={styles.signupWrapper}>
      <div className={styles.container}>
        <span className={styles.title}>SIGN UP TO YOUR ACCOUNT</span>
        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
        <form className={styles.signupForm} onSubmit={handleSignup}>
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
          <button type="submit" className={styles.submitBtnSignup}>
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
