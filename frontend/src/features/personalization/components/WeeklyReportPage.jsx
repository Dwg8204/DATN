import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProfileSidebar from '../../profile/components/ProfileSidebar';
import { personalizationApi } from '../services/personalizationApi';
import layout from '../../profile/pages/ProfilePage.module.css';
import styles from './Personalization.module.css';
import FinalGoalSuggestion from './FinalGoalSuggestion';

export default function WeeklyReportPage() {
  const { id } = useParams();
  return <ReportDetail key={id} id={id} />;
}

function ReportDetail({ id }) {
  const [, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    let timer;
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
  const final = report?.kind === 'FINAL';
  return <div className={layout.page}><div className={layout.container}>
    <ProfileSidebar activeTab="reports" />
    <main className={layout.content}>
      <section className={styles.card}>
        <Link to={report?.goalId ? `/profile/reports?goalId=${report.goalId}` : '/profile/reports'}>{t('personalization.reportsTitle')}</Link>
        <h1>{t(final ? 'personalization.finalReport' : report?.kind === 'MIDTERM' ? 'personalization.midtermReport' : 'personalization.weeklyReport', { week: report?.weekIndex ?? '' })}</h1>
        {error && <p role="alert">{t('personalization.reportUnavailable')}</p>}
        {!report && !error && <p role="status">{t('personalization.reportLoading')}</p>}
        <button onClick={() => setReload(value => value + 1)}>{t('personalization.reload')}</button>
        {report && <>
          <p>{report.coversFrom} – {report.coversTo}</p>
          <button onClick={() => setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set('chat', '1'); next.set('chatRequest', crypto.randomUUID());
            return next;
          }, { replace: true })}>{t('personalization.askReport')}</button>
          {report.source !== 'AI' && <p className={styles.muted} role="status">{t('personalization.reportFallback')}</p>}
          <dl className={styles.reportMetrics}>
            <div><dt>{t(final ? 'personalization.finalTests' : 'personalization.reportTests')}</dt><dd>{snapshot.period.completed}</dd></div>
            <div><dt>{t('personalization.reportActiveDays')}</dt><dd>{snapshot.period.activeDays}</dd></div>
            <div><dt>{t('personalization.reportVocab')}</dt><dd>{snapshot.period.vocabReviewed}</dd></div>
            <div><dt>{t(final ? 'personalization.finalPlanDone' : 'personalization.reportPlanDone')}</dt><dd>{Math.round(snapshot.period.planDoneRatio * 100)}%</dd></div>
            <div><dt>{t('personalization.reportGoalProgress')}</dt><dd>{snapshot.goal?.completed ?? 0}/{snapshot.goal?.targetTests ?? 0}</dd></div>
            <div><dt>{t('personalization.reportExpected')}</dt><dd>{snapshot.goal?.expected ?? 0}</dd></div>
          </dl>
          {final && report.outcome && <section>
            <p>{t('personalization.finalLifecycle')}: {t(`personalization.lifecycle.${report.outcome.lifecycle}`)}</p>
            <p>{t(report.outcome.testTargetReached ? 'personalization.finalTestsReached' : 'personalization.finalTestsNotReached')}</p>
            {report.outcome.targetReachedOn && <p>{t('personalization.reachedOn', { date: report.outcome.targetReachedOn })}</p>}
            <p>{t(`personalization.bandOutcome.${report.outcome.bandTargetStatus}`)}</p>
          </section>}
          {snapshot.goal && <p>{t(`personalization.pace.${snapshot.goal.status}`)}</p>}
          <p>{t('personalization.reportEstimatedBand')}: {snapshot.band.overallEstimate ?? t('personalization.reportInsufficient')} · {t('goal.targetBand')}: {snapshot.band.target ?? '—'}</p>
          {(final || report.kind === 'MIDTERM') && snapshot.bandChange?.length > 0 && <section aria-label={t('personalization.ability.changeTitle')}>
            <h2>{t('personalization.ability.changeTitle')}</h2>
            <div className={styles.bandTableWrap}><table className={styles.bandTable}>
              <thead><tr><th scope="col">{t('personalization.ability.skill')}</th><th scope="col">{t('personalization.ability.baseline')}</th><th scope="col">{t('personalization.ability.current')}</th></tr></thead>
              <tbody>{snapshot.bandChange.map(row=><tr key={row.skill}><th scope="row">{t('personalization.ability.skills.'+row.skill)}</th><td>{row.baseline ?? '—'}</td><td>{row.current ?? '—'}</td></tr>)}</tbody>
            </table></div>
            {!snapshot.baseline && <p className={styles.muted}>{t('personalization.ability.noBaseline')}</p>}
          </section>}
          {content && <article>
            <h2>{content.headline}</h2><p>{content.narrative}</p>
            {content.progressSoFar && <><h3>{t('personalization.reportSoFar')}</h3><p>{content.progressSoFar}</p></>}
            {content.wins?.length > 0 && <><h3>{t('personalization.reportWins')}</h3><ul>{content.wins.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
            {content.nextSteps?.length > 0 && <><h3>{t('personalization.reportNextSteps')}</h3><ul>{content.nextSteps.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
            {content.achievements?.length > 0 && <><h3>{t('personalization.reportWins')}</h3><ul>{content.achievements.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
          </article>}
          {final && content?.nextGoalSuggestion && <FinalGoalSuggestion key={report.id} suggestion={content.nextGoalSuggestion} />}
          <p><Link to="/profile/dashboard">{t('personalization.reportOpenPlan')}</Link></p>
        </>}
      </section>
    </main>
  </div></div>;
}
