import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { personalizationApi } from '../services/personalizationApi';
import styles from './Personalization.module.css';

export default function WeeklyReportsCard() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  useEffect(() => {
    let active = true;
    personalizationApi.reports().then(data => { if (active) setReports(data.items.slice(0, 3)); }).catch(() => {});
    return () => { active = false; };
  }, []);
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
