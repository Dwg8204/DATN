import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import styles from './LanguageSelector.module.css';

const LANGUAGES = [
  { code: 'en', country: 'gb', labelKey: 'language.english' },
  { code: 'vi', country: 'vn', labelKey: 'language.vietnamese' },
];

function CountryFlag({ country }) {
  if (country === 'vn') {
    return <svg className={styles.flag} viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Vietnam flag">
      <rect width="30" height="20" rx="2" fill="#da251d" />
      <path d="m15 4.2 1.35 4.1h4.32l-3.5 2.54 1.34 4.12L15 12.42l-3.5 2.54 1.34-4.12-3.5-2.54h4.32z" fill="#ffdf00" />
    </svg>;
  }
  return <svg className={styles.flag} viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" role="img" aria-label="United Kingdom flag">
    <rect width="30" height="20" rx="2" fill="#012169" />
    <path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="4" />
    <path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="1.7" />
    <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
    <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.3" />
  </svg>;
}

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const activeCode = i18n.resolvedLanguage?.startsWith('vi') ? 'vi' : 'en';
  const activeLanguage = LANGUAGES.find(language => language.code === activeCode) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = event => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectLanguage = language => {
    if (language.code !== activeCode) void changeLanguage(language.code);
    setOpen(false);
  };

  return (
    <div className={styles.selector} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(current => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('language.current')}: ${t(activeLanguage.labelKey)}. ${t('language.select')}`}
      >
        <CountryFlag country={activeLanguage.country} />
        <ChevronDown className={open ? styles.chevronOpen : ''} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.menu} role="listbox" aria-label={t('language.select')}>
          {LANGUAGES.map(language => {
            const active = language.code === activeCode;
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.option} ${active ? styles.active : ''}`}
                key={language.code}
                onClick={() => selectLanguage(language)}
              >
                <CountryFlag country={language.country} />
                <span>{language.code.toUpperCase()}</span>
                {active && <Check aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
