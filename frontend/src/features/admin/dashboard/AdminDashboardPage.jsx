import DashboardActivityChart from './components/DashboardActivityChart';
import DashboardMetricCard from './components/DashboardMetricCard';
import DashboardPeriodFilter from './components/DashboardPeriodFilter';
import useAdminDashboard from './hooks/useAdminDashboard';
import { formatGeneratedAt } from './utils/dashboardFormatters';
import styles from './AdminDashboardPage.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const DASHBOARD_QUERY_SCHEMA = {
  period: queryParam.enum(['this-year', '12-months', '6-months', '30-days', 'week', '24-hours'], '12-months'),
  testSkill: { ...queryParam.enum(['ALL', 'READING', 'LISTENING', 'WRITING', 'GRAMMAR_VOCAB', 'SPEAKING'], 'ALL'), param: 'testsSkill' },
  activitySkill: { ...queryParam.enum(['ALL', 'READING', 'LISTENING', 'WRITING', 'GRAMMAR_VOCAB', 'SPEAKING'], 'ALL'), param: 'activitySkill' },
};

function DashboardSkeleton() {
  return (
    <div className={styles.skeletonGrid} aria-label="Loading dashboard" role="status">
      <div className={styles.skeletonCard} />
      <div className={styles.skeletonCard} />
      <div className={styles.skeletonChart} />
      <div className={styles.skeletonChart} />
    </div>
  );
}

export default function AdminDashboardPage() {
  const [urlState, setUrlState] = useUrlQueryState(DASHBOARD_QUERY_SCHEMA);
  const { period, testSkill, activitySkill } = urlState;
  const setPeriod = value => setUrlState({ period: value });
  const setTestSkill = value => setUrlState({ testSkill: value });
  const setActivitySkill = value => setUrlState({ activitySkill: value });
  const { data, loading, error, retry } = useAdminDashboard(period);

  return (
    <div className={styles.page} aria-busy={loading}>
      <div className={styles.toolbar}>
        <DashboardPeriodFilter value={period} onChange={setPeriod} />
        {data && <span className={styles.updatedAt}>Updated {formatGeneratedAt(data.generatedAt)} (UTC+7)</span>}
      </div>

      {loading && !data ? <DashboardSkeleton /> : null}
      {error && !data ? (
        <section className={styles.errorState} role="alert">
          <strong>Dashboard data could not be loaded.</strong>
          <span>{error}</span>
          <button type="button" onClick={retry}>Try again</button>
        </section>
      ) : null}

      {data ? (
        <>
          {error && <div className={styles.refreshError} role="status">The latest refresh failed. Showing the previous data. <button type="button" onClick={retry}>Try again</button></div>}
          <section className={styles.metricGrid}>
            <DashboardMetricCard id="learners" title="Active Learners" metric={data.metrics.activeLearners} />
            <DashboardMetricCard id="users" title="New Users" metric={data.metrics.newUsers} />
          </section>
          <DashboardActivityChart title="Tests Created" data={data.series.testsCreated} skill={testSkill} onSkillChange={setTestSkill} />
          <DashboardActivityChart title="Test Activity" data={data.series.testActivity} skill={activitySkill} onSkillChange={setActivitySkill} />
        </>
      ) : null}
    </div>
  );
}
