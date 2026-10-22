import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProfileSidebar from '../../profile/components/ProfileSidebar';
import { personalizationApi as api } from '../services/personalizationApi';
import layout from '../../profile/pages/ProfilePage.module.css';
import styles from './Personalization.module.css';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const goalId = params.get('goalId') ?? '';
  const parsedPage = Number(params.get('page'));
  const page = Number.isInteger(parsedPage) && parsedPage > 0 && parsedPage <= 10000 ? parsedPage : 1;
  const [goals, setGoals] = useState([]);
  const [goalPage, setGoalPage] = useState(1);
  const [moreGoals, setMoreGoals] = useState(false);
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const [state, setState] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([api.goal(), api.history(1)]).then(([current, history]) => {
      if (!active) return;
      setGoals([...current.goal ? [current.goal] : [], ...history.items]);
      setMoreGoals(history.hasMore); setGoalError(false);
    }).catch(() => { if (active) setGoalError(true); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    let active = true;
    const key = `${goalId}:${page}:${reload}`;
    api.reports({ goalId: goalId || undefined, page }).then(data => {
      if (active) setState({ key, data });
    }).catch(() => { if (active) setState({ key, error: true }); });
    return () => { active = false; };
  }, [goalId, page, reload]);
  const current = state?.key === `${goalId}:${page}:${reload}` ? state : null;
  const move = (id, nextPage = 1) => setParams({ ...(id ? { goalId: id } : {}), ...(nextPage > 1 ? { page: String(nextPage) } : {}) });
  const loadGoals = async () => {
    if (goalBusy) return;
    setGoalBusy(true);
    try {
      const next = await api.history(goalPage + 1);
      setGoals(previous => [...previous, ...next.items.filter(item => !previous.some(g => g.id === item.id))]);
      setGoalPage(next.page); setMoreGoals(next.hasMore); setGoalError(false);
    } catch { setGoalError(true); }
    finally { setGoalBusy(false); }
  };
  return <div className={layout.page}><div className={layout.container}>
    <ProfileSidebar activeTab="reports" />
    <main className={layout.content}><section className={styles.card}>
      <h1>{t('personalization.reportsTitle')}</h1>
      <label className={styles.field}>{t('personalization.filterGoal')}
        <select value={goalId} onChange={e => move(e.target.value)}>
          <option value="">{t('personalization.allGoals')}</option>
          {goalId && !goals.some(g => g.id === goalId) && <option value={goalId}>{t('personalization.selectedGoal')}</option>}
          {goals.map(goal => <option key={goal.id} value={goal.id}>{goal.startDate} · {t('personalization.goalSummary', goal)} · {t(`personalization.lifecycle.${goal.status}`)}</option>)}
        </select>
      </label>
      {moreGoals && <button disabled={goalBusy} onClick={loadGoals}>{t('personalization.moreGoals')}</button>}
      {goalError && <p role="alert">{t('personalization.loadFailed')}</p>}
      <button onClick={() => { setGoalPage(1); setReload(v => v + 1); }}>{t('personalization.reload')}</button>
      {!current && <p role="status">{t('personalization.reportLoading')}</p>}
      {current?.error && <p role="alert">{t('personalization.reportUnavailable')}</p>}
      {current?.data && <>
        {!current.data.items.length && <p>{t('personalization.noReports')}</p>}
        <ul className={styles.history}>{current.data.items.map(report => <li key={report.id}>
          <Link to={`/profile/reports/${report.id}`}>{t(report.kind === 'FINAL' ? 'personalization.finalReport' : report.kind === 'MIDTERM' ? 'personalization.midtermReport' : 'personalization.weeklyReport', { week: report.weekIndex })}</Link>
          <p>{report.coversFrom} – {report.coversTo} · {t(report.source === 'AI' ? 'personalization.reportAi' : 'personalization.reportNumbers')}</p>
        </li>)}</ul>
        <div className={styles.actions}>
          {page > 1 && <button onClick={() => move(goalId, page - 1)}>{t('personalization.previousPage')}</button>}
          {current.data.hasMore && <button onClick={() => move(goalId, page + 1)}>{t('personalization.nextPage')}</button>}
        </div>
      </>}
    </section></main>
  </div></div>;
}
