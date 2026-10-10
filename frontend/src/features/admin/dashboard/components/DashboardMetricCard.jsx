import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { formatCount } from '../utils/dashboardFormatters';
import styles from '../AdminDashboardPage.module.css';

export default function DashboardMetricCard({ id, title, metric }) {
  const changeClass = metric.changePercent > 0
    ? styles.positive
    : metric.changePercent < 0 ? styles.negative : styles.neutral;
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <div>
          <h2>{title}</h2>
          <div className={styles.metricValueRow}>
            <strong>{formatCount(metric.value)}</strong>
            <span className={changeClass}>{metric.changeLabel}</span>
          </div>
        </div>
        <span className={styles.comparisonHint}>vs previous period</span>
      </div>
      <div className={styles.metricChart}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs><linearGradient id={`metric-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e51d2a" stopOpacity=".3"/><stop offset="1" stopColor="#e51d2a" stopOpacity="0"/></linearGradient></defs>
            <CartesianGrid stroke="#f0f0f0" vertical={false}/>
            <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} tick={{ fontSize: 10, fill: '#777' }}/>
            <Tooltip formatter={value => [formatCount(value), title]} labelStyle={{ color: '#222' }}/>
            <Area type="monotone" dataKey="value" stroke="#e51d2a" fill={`url(#metric-${id})`} strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
