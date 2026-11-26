import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ResultBackButton.module.css';

export default function ResultBackButton({ to }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { returnPage, idx } = window.history.state ?? {};
  const back = event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (returnPage && Number.isInteger(returnPage.index) && returnPage.index < idx) {
      event.preventDefault();
      navigate(returnPage.index - idx);
    }
  };
  return <Link to={returnPage?.href ?? to} replace onClick={back} className={styles.back}>
    <ArrowLeft aria-hidden="true" />
    <span>{t('common.back')}</span>
  </Link>;
}
