import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { personalizationApi } from '../services/personalizationApi';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import styles from './Personalization.module.css';

const routes = {
  GRAMMAR_VOCAB: 'grammar-vocab',
  READING: 'reading',
  LISTENING: 'listening',
  WRITING: 'writing',
  SPEAKING: 'speaking',
};
const ruleReasons = new Set([
  'DAILY_VOCAB',
  'GOAL_PACE',
  'BAND_PRACTICE',
  'RECENT_MISTAKES',
]);
export default function StudyPlanCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    personalizationApi
      .plan()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
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
  const renderItem = (item) => (
    <li key={item.id} className={styles.task}>
      <span>
        {item.completedAt ? '✓ ' : ''}
        {item.activityType === 'TEST'
          ? `${item.title} · ${t(`personalization.skills.${item.component}`)}${item.partNumber ? ` · Part ${item.partNumber}` : ''}`
          : t(`personalization.activities.${item.activityType}`, {
              count: item.questionCount ?? item.targetCount,
            })}
      </span>
      {data?.plan?.source === 'AI' && item.reason && !ruleReasons.has(item.reason) && (
        <span className={styles.muted}>{item.reason}</span>
      )}
      <span>
        {item.doneCount}/{item.targetCount}
      </span>
      <button disabled={busy || !item.available} onClick={() => open(item)}>
        {t(
          !item.available
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
  const days = [
    ...new Set(data?.plan?.items.map((item) => item.scheduledOn) ?? []),
  ];
  return (
    <section className={styles.card}>
      <h2>{t('personalization.today')}</h2>
      {error && (
        <p role="alert" className={styles.error}>
          {t('personalization.planFailed')}
        </p>
      )}
      {!data && !error && <p>{t('personalization.loading')}</p>}
      {data && !data.plan && <p>{t('personalization.noGoal')}</p>}
      {data?.plan && (
        <>
          <p className={styles.muted}>
            {data.today} · {data.timezone}
          </p>
          {today.length ? (
            <ul className={styles.taskList}>{today.map(renderItem)}</ul>
          ) : (
            <p>{t('personalization.noTasks')}</p>
          )}
          <details>
            <summary>
              {t('personalization.weekPlan', { week: data.plan.weekIndex })}
            </summary>
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
