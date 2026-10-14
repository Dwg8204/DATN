import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import { useWritingAssessmentPolling } from '../hooks/useWritingAssessmentPolling';
import WritingAssessmentStatus from '../components/assessment/WritingAssessmentStatus';
import WritingAiSummary, { WritingCefr } from '../components/assessment/WritingAiSummary';
import styles from './WritingResultPage.module.css';

export default function WritingResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attemptId = params.get('attemptId');
  const isPractice = params.get('practice') === 'true';
  const assessment = useWritingAssessmentPolling(attemptId);
  const { data, loading, error } = assessment;
  if (loading || (error && !data)) return <AttemptPageState loading={loading} error={error} backHref={isPractice ? '/writing/practice' : '/writing/tests'} />;
  if (!data?.result) return <AttemptPageState error={t('writingAi.unavailable')} backHref={isPractice ? '/writing/practice' : '/writing/tests'} />;
  const writing = data.result.writing;
  const items = data.result.items ?? [];
  const answered = items.filter(
    (item) => item.selectedAnswer?.kind === 'TEXT' && item.selectedAnswer.text.trim(),
  ).length;
  const duration =
    data.startedAt && data.submittedAt ? formatDuration(data.startedAt, data.submittedAt) : '--:--:--';
  return (
    <div className={styles.page}>
      <main>
        {(params.get('timedOut') === 'true' || data.submittedAfterExpiry) && (
          <div className={styles.notice}>{t('writingAi.timeout')}</div>
        )}
        <h1>{data.title || t('writingAi.title')}</h1>
        <WritingAssessmentStatus {...assessment} />
        <div className={writing?.scope === 'FULL_SKILL' ? styles.overview : undefined}>
        <WritingCefr writing={writing} />
        <section className={styles.panel}>
          <h2>{t('writingAi.testSummary')}</h2>
          <dl className={styles.summaryList}>
            <div>
              <dt>{t('writingAi.time')}</dt>
              <dd>{duration}</dd>
            </div>
            <div>
              <dt>{t('writingAi.type')}</dt>
              <dd>
                {t(data.scope === 'FULL_SKILL' ? 'writingAi.full' : 'writingAi.part', {
                  number: data.partNumber,
                })}
              </dd>
            </div>
            <div>
              <dt>{t('writingAi.answered')}</dt>
              <dd>
                {answered}/{items.length}
              </dd>
            </div>
            <div>
              <dt>{t('writingAi.status')}</dt>
              <dd>{t(`writingAi.${data.gradingStatus}`, { defaultValue: t('writingAi.QUEUED') })}</dd>
            </div>
          </dl>
        </section>
        </div>
        <WritingAiSummary writing={writing} assisted={isPractice && !!data.result.assistance?.revealedKeys?.length} />
        <div className={styles.actions}>
          <button
            onClick={() =>
              navigate(`/writing/result-detail?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`)
            }
          >
            {t('writingAi.detail')}
          </button>
          <button onClick={() => navigate(isPractice ? '/writing/practice' : '/writing/tests')}>
            {t('writingAi.another')}
          </button>
        </div>
      </main>
    </div>
  );
}
