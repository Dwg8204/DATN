import { useTranslation } from 'react-i18next';
import styles from './PageLoader.module.css';

export default function PageLoader({ compact = false }) {
  const { t } = useTranslation();
  return <div className={compact ? styles.compact : styles.page} role="status" aria-label={t('common.loading')}>
    <span className={styles.spinner} aria-hidden="true" />
  </div>;
}
