import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ResultBackButton.module.css';

export default function ResultBackButton({ to }) {
  const { t } = useTranslation();
  return <Link to={to} className={styles.back}>
    <ArrowLeft aria-hidden="true" />
    <span>{t('common.back')}</span>
  </Link>;
}
