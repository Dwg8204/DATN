import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { personalizationApi } from '../services/personalizationApi';
import styles from './Personalization.module.css';

export default function GoalProgressCard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { let active = true;
    personalizationApi.goal().then(value => { if (active) { setData(value); setError(false); } }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  const progress = data?.snapshot?.goal;
  return <section className={styles.card}>
    <h2>{t('personalization.progressTitle')}</h2>
    {error ? <p role="alert" className={styles.error}>{t('personalization.loadFailed')}</p> : !data ? <p role="status">{t('personalization.loading')}</p> : !progress ? <p>{t('personalization.noGoal')}</p> : <>
      <p>{t('personalization.goalSummary', data.goal)}</p>
      <progress className={styles.progress} aria-label={t('personalization.progressTitle')} value={Math.min(progress.completed, progress.targetTests)} max={progress.targetTests} />
      <p><strong>{t(`personalization.pace.${progress.status}`)}</strong> · {t('personalization.expected', { expected: progress.expected, pace: progress.requiredPace, days: progress.remainingDays })}</p>
      {progress.targetReached && <p>{t('personalization.reached')}</p>}
      <p>{t('personalization.bandEstimate')}: {data.snapshot.band.overallEstimate ?? t('personalization.insufficient')}</p>
      <p className={styles.muted}>{t('personalization.habit', data.snapshot.habit)} · {data.goal.timezone}</p>
    </>}
    <Link to="/profile">{t('personalization.title')}</Link>
  </section>;
}
