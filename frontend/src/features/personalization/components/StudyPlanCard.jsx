import controls from '../../../components/common/LearningControls.module.css';
import LearningSummary from '../../../components/common/LearningSummary.jsx';
import { CalendarDays, CircleCheck, Circle } from 'lucide-react';
import PageLoader from '../../../components/common/PageLoader.jsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import styles from './Personalization.module.css';
import ui from './LearningSurfaces.module.css';
import PlacementReplanNotice from './PlacementReplanNotice';

const routes = {
  GRAMMAR_VOCAB: 'grammar-vocab',
  READING: 'reading',
  LISTENING: 'listening',
  WRITING: 'writing',
  SPEAKING: 'speaking',
};
const ruleReasons = new Set([
  'PLACEMENT',
  'DAILY_VOCAB',
  'GOAL_PACE',
  'BAND_PRACTICE',
  'RECENT_MISTAKES',
  'WEAK_TOPIC',
  'SIMILAR_QUESTIONS',
]);
export default function StudyPlanCard({ data, loadError = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = async (item) => {
    if (item.activityType === 'VOCAB_REVIEW') {
      navigate('/dictation?mode=flashcard');
      return;
    }
    if (item.activityType === 'MISTAKE_REVIEW') {
      navigate(`/profile/mistakes?itemId=${item.id}`);
      return;
    }
    const skill = routes[item.component];
    if (item.completedAt) {
      if (skill && item.reviewAttempt) {
        const query = new URLSearchParams({ attemptId: item.reviewAttempt.id });
        if (item.reviewAttempt.purpose === 'PRACTICE') query.set('practice', 'true');
        navigate(`/${skill}/result?${query}`);
      }
      return;
    }
    if (!skill || !item.testId || !item.available || busy) return;
    if (item.purpose === 'EXAM') {
      navigate(`/${skill}/introduction?testId=${item.testId}&mode=full`);
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const attempt = await practiceAttemptsApi.start({
        testId: item.testId,
        attemptId: crypto.randomUUID(),
        mode: item.partNumber ? `part${item.partNumber}` : 'full',
      });
      navigate(
        `/${skill}/test/${attempt.scope === 'PART' ? `part${attempt.partNumber}` : 'part1'}?attemptId=${attempt.attemptId}&practice=true`,
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const canOpen = item => item.completedAt && ['TEST', 'TOPIC_REVIEW'].includes(item.activityType)
    ? Boolean(item.reviewAttempt)
    : item.available;
  const renderItem = (item) => (
    <li key={item.id} className={styles.task} data-complete={Boolean(item.completedAt)}>
      {item.completedAt ? <CircleCheck className={ui.taskMark} size={20} aria-hidden="true" /> : <Circle className={ui.taskMark} size={20} aria-hidden="true" /> }
      <span>
        {item.activityType === 'TOPIC_REVIEW' && `${item.topicName ?? ''} · `}
        {['TEST', 'TOPIC_REVIEW'].includes(item.activityType)
          ? `${item.title} · ${t(`personalization.skills.${item.component}`)}${item.partNumber ? ` · Part ${item.partNumber}` : ''}`
          : t(`personalization.activities.${item.activityType}`, {
              count: item.questionCount ?? item.targetCount,
            })}
      </span>
      {item.retrieval?.tier === 1 && item.retrieval.matchCount > 0 && (
        <span className={styles.muted} data-testid="retrieval-match">
          {t('personalization.retrieval.matches', { count: item.retrieval.matchCount })}
          {item.retrieval.matchedTopics?.length > 0 && ` · ${item.retrieval.matchedTopics.join(', ')}`}
        </span>
      )}
      {item.retrieval?.tier === 2 && item.retrieval.matchedTopics?.length > 0 && (
        <span className={styles.muted} data-testid="retrieval-topic">
          {t('personalization.retrieval.topic', { topics: item.retrieval.matchedTopics.join(', ') })}
        </span>
      )}
      {item.reason === 'PLACEMENT' && (
        <span className={styles.muted}>
          {t('personalization.placement.title')}
        </span>
      )}
      {data?.plan?.source === 'AI' &&
        item.reason &&
        !ruleReasons.has(item.reason) && (
          <span className={styles.muted}>{item.reason}</span>
        )}
      <span className={ui.taskCount}>
        {item.completedAt && <strong>{t('goal.completed')} · </strong>}{item.doneCount}/{item.targetCount}
      </span>
      <button disabled={busy || !canOpen(item)} onClick={() => open(item)}>
        {t(
          !canOpen(item)
            ? 'personalization.unavailable'
            : item.completedAt
              ? 'personalization.review'
              : 'personalization.open',
        )}
      </button>
    </li>
  );
  const today =
    data?.plan?.items.filter((item) => item.scheduledOn === data.today) ?? [];
  const completedToday = today.filter(item => item.completedAt).length;
  const days = [
    ...new Set(data?.plan?.items.map((item) => item.scheduledOn) ?? []),
  ];
  return (
    <section className={`${styles.card} ${ui.schedule}`}>
      <h2>{t('personalization.today')}</h2>
      {data?.plan?.id && data.plan.replannedAfterPlacementAt && (
        <PlacementReplanNotice key={data.plan.id} planId={data.plan.id} />
      )}
      {(error || loadError) && (
        <p role="alert" className={styles.error}>
          {t('personalization.planFailed')}
        </p>
      )}
      {!data && !error && !loadError && <PageLoader compact />}
      {data && !data.plan && <p>{t('personalization.noGoal')}</p>}
      {data?.plan && (
        <>
          <div className={ui.todayLine}><time dateTime={data.today}>{data.today}</time>
            {today.length > 0 && <span>{t('goal.completed')} · {completedToday}/{today.length}</span>}
          </div>
          {today.length > 0 && <progress className={controls.meter} aria-label={t('personalization.today')} value={completedToday} max={today.length} />}
          {today.length ? (
            <ul className={styles.taskList}>{today.map(renderItem)}</ul>
          ) : (
            <p>{t('personalization.noTasks')}</p>
          )}
          <details>
            <LearningSummary icon={CalendarDays}>
              {t('personalization.weekPlan', { week: data.plan.weekIndex })}
            </LearningSummary>
            {days.map((day) => (
              <section key={day}>
                <h3>{day}</h3>
                <ul className={styles.taskList}>
                  {data.plan.items
                    .filter((item) => item.scheduledOn === day)
                    .map(renderItem)}
                </ul>
              </section>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
