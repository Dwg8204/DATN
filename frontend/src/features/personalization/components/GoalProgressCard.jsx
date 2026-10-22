import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Personalization.module.css';

export default function GoalProgressCard({ data, error = false }) {
  const { t } = useTranslation();
  const progress = data?.snapshot?.goal;
  return <section className={styles.card}>
    <h2>{t('personalization.progressTitle')}</h2>
    {error ? <p role="alert" className={styles.error}>{t('personalization.loadFailed')}</p> : !data ? <p role="status">{t('personalization.loading')}</p> : !progress ? <p>{t('personalization.noGoal')}</p> : <>
      <p>{t('personalization.goalSummary', data.goal)}</p>
      <progress className={styles.progress} aria-label={t('personalization.progressTitle')} value={Math.min(progress.completed, progress.targetTests)} max={progress.targetTests} />
      <p><strong>{t(`personalization.pace.${progress.status}`)}</strong> · {t('personalization.expected', { expected: progress.expected, pace: progress.requiredPace, days: progress.remainingDays })}</p>
      {progress.targetReached && <p>{t('personalization.reached')}</p>}
      <p>{t('personalization.bandEstimate')}: {data.snapshot.band.overallEstimate ?? t('personalization.insufficient')}</p>
      {data.snapshot.band.overall?.status === 'PARTIAL' && <p className={styles.muted}>{t('personalization.ability.missing', { skills: data.snapshot.band.overall.missing.map(skill=>t('personalization.ability.skills.'+skill)).join(', ') })}</p>}
      <dl className={styles.reportMetrics}>{data.snapshot.band.bySkill?.map(skill=><div key={skill.skill}><dt>{t('personalization.ability.skills.'+skill.skill)}</dt><dd>{skill.band ?? '—'} · {t('personalization.ability.status.'+(skill.status ?? 'NONE'))}</dd></div>)}</dl>
      <p className={styles.muted}>{t('personalization.habit', data.snapshot.habit)} · {data.goal.timezone}</p>
    </>}
    <Link to="/profile">{t('personalization.title')}</Link>
  </section>;
}
