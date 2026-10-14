import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json' with { type: 'json' };
import vi from './locales/vi.json' with { type: 'json' };

const resources = { en: { translation: en }, vi: { translation: vi } };

const storedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem('aptimate-language') : null;

i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage === 'vi' ? 'vi' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function changeLanguage(language) {
  const next = language === 'vi' ? 'vi' : 'en';
  if (typeof window !== 'undefined') window.localStorage.setItem('aptimate-language', next);
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  return i18n.changeLanguage(next);
}

if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;

export default i18n;
