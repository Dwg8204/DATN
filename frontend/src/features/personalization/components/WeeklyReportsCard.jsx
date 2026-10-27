import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Personalization.module.css';

export default function WeeklyReportsCard({reports = []}) {
  const { t } = useTranslation();
  if (!reports.length) return null;
  return <section className={styles.card}>
    <h2>{t('personalization.recentReports')}</h2>
    <ul className={styles.history}>{reports.map(report => <li key={report.id}>
      <Link to={`/profile/reports/${report.id}`}>{t(report.kind === 'FINAL' ? 'personalization.finalReport' : report.kind === 'MIDTERM' ? 'personalization.midtermReport' : 'personalization.weeklyReport', { week: report.weekIndex })}</Link>
      <span className={styles.muted}> — {report.coversFrom} – {report.coversTo}</span>
    </li>)}</ul>
    <Link to="/profile/reports">{t('personalization.reportsTitle')}</Link>
  </section>;
}
