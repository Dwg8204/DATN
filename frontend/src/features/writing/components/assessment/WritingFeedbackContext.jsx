import { useTranslation } from 'react-i18next';
import styles from './WritingAssessment.module.css';

export default function WritingFeedbackContext({ writing, assisted = false }) {
  const { t } = useTranslation();
  if (!writing && !assisted) return null;
  return (
    <div className={styles.muted}>
      {writing && (
        <p>
          {t('writingAi.locale', {
            language: t(`writingAi.${writing.feedbackLocale === 'vi' ? 'languageVi' : 'languageEn'}`),
          })}
        </p>
      )}
      {assisted && <p>{t('writingAi.assisted')}</p>}
    </div>
  );
}
