import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProfileSidebar from '../../profile/components/ProfileSidebar';
import { personalizationApi } from '../services/personalizationApi';
import layout from '../../profile/pages/ProfilePage.module.css';
import styles from './Personalization.module.css';

export default function WeeklyReportPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    let timer;
    setReport(null); setError(false);
    const load = async () => {
      try {
        const data = await personalizationApi.report(id);
        if (!active) return;
        setReport(data); setError(false);
        if (['PENDING', 'FAILED'].includes(data.status)) timer = setTimeout(load, 15_000);
      } catch { if (active) setError(true); }
    };
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, [id, reload]);
  const snapshot = report?.snapshot;
  const content = report?.content;
  return <div className={layout.page}><div className={layout.container}>
    <ProfileSidebar activeTab="dashboard" />
    <main className={layout.content}>
      <section className={styles.card}>
        <Link to="/profile/dashboard">{t('personalization.reportOpenPlan')}</Link>
        <h1>{t(report?.kind === 'MIDTERM' ? 'personalization.midtermReport' : 'personalization.weeklyReport', { week: report?.weekIndex ?? '' })}</h1>
        {error && <p role="alert">{t('personalization.reportUnavailable')}</p>}
        {!report && !error && <p role="status">{t('personalization.reportLoading')}</p>}
        <button onClick={() => setReload(value => value + 1)}>{t('personalization.reload')}</button>
        {report && <>
          <p>{report.coversFrom} – {report.coversTo}</p>
          {report.source !== 'AI' && <p className={styles.muted} role="status">{t('personalization.reportFallback')}</p>}
          <dl className={styles.reportMetrics}>
            <div><dt>{t('personalization.reportTests')}</dt><dd>{snapshot.period.completed}</dd></div>
            <div><dt>{t('personalization.reportActiveDays')}</dt><dd>{snapshot.period.activeDays}</dd></div>
            <div><dt>{t('personalization.reportVocab')}</dt><dd>{snapshot.period.vocabReviewed}</dd></div>
            <div><dt>{t('personalization.reportPlanDone')}</dt><dd>{Math.round(snapshot.period.planDoneRatio * 100)}%</dd></div>
            <div><dt>{t('personalization.reportGoalProgress')}</dt><dd>{snapshot.goal?.completed ?? 0}/{snapshot.goal?.targetTests ?? 0}</dd></div>
            <div><dt>{t('personalization.reportExpected')}</dt><dd>{snapshot.goal?.expected ?? 0}</dd></div>
          </dl>
          {snapshot.goal && <p>{t(`personalization.pace.${snapshot.goal.status}`)}</p>}
          <p>{t('personalization.reportEstimatedBand')}: {snapshot.band.overallEstimate ?? t('personalization.reportInsufficient')} · {t('goal.targetBand')}: {snapshot.band.target ?? '—'}</p>
          {content && <article>
            <h2>{content.headline}</h2><p>{content.narrative}</p>
            {content.progressSoFar && <><h3>{t('personalization.reportSoFar')}</h3><p>{content.progressSoFar}</p></>}
            {content.wins?.length > 0 && <><h3>{t('personalization.reportWins')}</h3><ul>{content.wins.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
            {content.nextSteps?.length > 0 && <><h3>{t('personalization.reportNextSteps')}</h3><ul>{content.nextSteps.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
          </article>}
          <p><Link to="/profile/dashboard">{t('personalization.reportOpenPlan')}</Link></p>
        </>}
      </section>
    </main>
  </div></div>;
}
