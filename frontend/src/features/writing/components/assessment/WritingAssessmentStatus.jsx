import { useTranslation } from 'react-i18next';
import styles from './WritingAssessment.module.css';

export default function WritingAssessmentStatus({ data, refresh, retry, retrying, retryError }) {
  const { t } = useTranslation();
  if (data.gradingStatus === 'COMPLETED' && data.result?.writing) return null;
  const paused = data.assessment?.enabled === false && ['QUEUED', 'PROCESSING'].includes(data.gradingStatus);
  return (
    <section className={styles.panel} role="status">
      <h2>
        {t(`writingAi.${paused ? 'paused' : data.gradingStatus}`, { defaultValue: t('writingAi.QUEUED') })}
      </h2>
      <p>{t(`writingAi.${data.gradingStatus === 'FAILED' ? 'failedHelp' : 'saved'}`)}</p>
      <div className={styles.actions}>
        {refresh && <button onClick={refresh}>{t('writingAi.refresh')}</button>}
        {data.assessment?.retryable && (
          <button disabled={retrying} onClick={retry}>
            {t(`writingAi.${retrying ? 'retrying' : 'retry'}`)}
          </button>
        )}
      </div>
      {retryError && <p role="alert">{t(retryError)}</p>}
    </section>
  );
}
