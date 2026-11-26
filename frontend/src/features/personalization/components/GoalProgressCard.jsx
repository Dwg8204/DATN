import controls from '../../../components/common/LearningControls.module.css';
import PageLoader from '../../../components/common/PageLoader.jsx';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Personalization.module.css';
import ui from './LearningSurfaces.module.css';

export default function GoalProgressCard({ data, error = false }) {
  const { t } = useTranslation();
  const progress = data?.snapshot?.goal;
  return <section className={`${styles.card} ${ui.goalProgress}`}>
    <h2>{t('personalization.progressTitle')}</h2>
    {error ? <p role="alert" className={styles.error}>{t('personalization.loadFailed')}</p> : !data ? <PageLoader compact /> : !progress ? <p>{t('personalization.noGoal')}</p> : <>
      <div className={ui.goalReadout}><strong>{progress.completed}<small> / {progress.targetTests}</small></strong><p>{t('personalization.goalSummary', data.goal)}</p></div>
      <progress className={controls.meter} aria-label={t('personalization.progressTitle')} value={Math.min(progress.completed, progress.targetTests)} max={progress.targetTests} />
      <p><strong>{t(`personalization.pace.${progress.status}`)}</strong> · {t('personalization.expected', { expected: progress.expected, pace: progress.requiredPace, days: progress.remainingDays })}</p>
      {progress.targetReached && <p>{t('personalization.reached')}</p>}
      <p>{t('personalization.bandEstimate')}: {data.snapshot.band.overallEstimate ?? t('personalization.insufficient')}</p>
      {data.snapshot.band.overall?.status === 'PARTIAL' && <p className={styles.muted}>{t('personalization.ability.missing', { skills: data.snapshot.band.overall.missing.map(skill=>t('personalization.ability.skills.'+skill)).join(', ') })}</p>}
      <dl className={styles.reportMetrics}>{data.snapshot.band.bySkill?.map(skill=><div key={skill.skill}><dt>{t('personalization.ability.skills.'+skill.skill)}</dt><dd>{skill.band ?? t('dashboard.noData')} · {t('personalization.ability.status.'+(skill.status ?? 'NONE'))}</dd></div>)}</dl>
      <p className={styles.muted}>{t('personalization.habit', data.snapshot.habit)} · {data.goal.timezone}</p>
    </>}
    <Link to="/profile">{t('personalization.title')}</Link>
  </section>;
}
