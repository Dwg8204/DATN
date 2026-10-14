import { useTranslation } from 'react-i18next';
import AssessmentProgress from '../../../test-attempts/components/AssessmentProgress.jsx';
import styles from './WritingAssessment.module.css';

export default function WritingAssessmentStatus({ data, refresh, retry, retrying, retryError, error, paused, runKey, attemptId }) {
  const { t } = useTranslation();
  if (data.gradingStatus === 'COMPLETED' && data.result?.writing) return <AssessmentProgress data={data} attemptId={attemptId} runKey={runKey} />;
  return (
    <section className={styles.panel}>
      <AssessmentProgress data={data} paused={paused} error={error} refresh={refresh} runKey={runKey} attemptId={attemptId} />
      {data.gradingStatus === 'FAILED' && <p>{t('writingAi.failedHelp')}</p>}
      <div className={styles.actions}>
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
