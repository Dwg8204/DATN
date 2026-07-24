import { Link, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

const navItems = [
  {
    label: 'LISTENING',
    to: '/listening/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/p9xrd9hn_expires_30_days.png',
    dropdown: [
      { label: 'Listening Overview', to: '/listening/overview' },
      { label: 'Listening Feed', to: '/listening/feed' },
      { label: 'Listening Test', to: '/listening/tests' },
    ],
  },
  {
    label: 'READING',
    to: '/reading',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/4d89xmet_expires_30_days.png',
    dropdown: [
      { label: 'Reading Overview', to: '/reading' },
      { label: 'Practice Tests', to: '/reading/choose' },
    ],
  },
  {
    label: 'WRITING',
    to: '/writing',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/fc21zx6v_expires_30_days.png',
  },
  {
    label: 'SPEAKING',
    to: '/speaking',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/gg3z1wbc_expires_30_days.png',
  },
  {
    label: 'GRAMMAR & VOCAB',
    to: '/grammar-vocab/overview',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/gg3z1wbc_expires_30_days.png',
    dropdown: [
      { label: 'Grammar & Vocab Overview', to: '/grammar-vocab/overview' },
      { label: 'Grammar & Vocab Test', to: '/grammar-vocab/tests' },
    ],
  },
  {
    label: 'VOCABULARY',
    to: '/vocab',
    icon: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/gg3z1wbc_expires_30_days.png',
  },
  {
    label: 'DICTATION',
    to: '/dictation',
    icon: null,
  },
];

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.logoWrap}>
        <Link to="/">
          <img
            src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png"
            alt="AptiMate Logo"
            className={styles.logo}
          />
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <div key={item.label} className={styles.navItemContainer}>
              <button
                className={styles.navItem}
                onClick={() => navigate(item.to)}
              >
                <span className={styles.navLabel}>{item.label}</span>
                {item.icon && (
                  <img
                    src={item.icon}
                    alt=""
                    className={styles.navIcon}
                  />
                )}
              </button>
              {item.dropdown && (
                <div className={styles.dropdownMenu}>
                  {item.dropdown.map((subItem) => (
                    <button
                      key={subItem.label}
                      className={styles.dropdownItem}
                      onClick={() => navigate(subItem.to)}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      <button className={styles.signInBtn} onClick={() => navigate('/login')}>
        <span className={styles.signInText}>SIGN IN</span>
      </button>
    </header>
  );
}
