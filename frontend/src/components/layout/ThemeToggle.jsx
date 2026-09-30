import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import styles from './ThemeToggle.module.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={styles.toggle}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={18} className={styles.icon} />
      ) : (
        <Moon size={18} className={styles.icon} />
      )}
    </button>
  );
};

export default ThemeToggle;
