import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardSkillFilter from './DashboardSkillFilter';
import { DASHBOARD_SKILLS, formatCount, SKILL_COLORS } from '../utils/dashboardFormatters';
import styles from '../AdminDashboardPage.module.css';

export default function DashboardActivityChart({ title, data, skill, onSkillChange }) {
  const visibleSkills = DASHBOARD_SKILLS.filter(item => item.value !== 'ALL' && (skill === 'ALL' || skill === item.value));
  const hasData = data.some(point => visibleSkills.some(item => Number(point[item.value]) > 0));
  return (
    <article className={styles.chartPanel}>
      <header className={styles.chartHeader}>
        <div><h2>{title}</h2><p>Activity grouped by the selected period</p></div>
        <DashboardSkillFilter value={skill} onChange={onSkillChange}/>
      </header>
      <div className={styles.chartScroller}>
        <div className={styles.largeChart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e9e9e9" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666' }} axisLine={{ stroke: '#d7d7d7' }} tickLine={false} minTickGap={16}/>
              <YAxis allowDecimals={false} width={42} tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(value, name) => [formatCount(value), name]}/>
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }}/>
              {visibleSkills.map(item => <Bar key={item.value} dataKey={item.value} name={item.label} fill={SKILL_COLORS[item.value]} radius={[3,3,0,0]} maxBarSize={32}/>)}
            </BarChart>
          </ResponsiveContainer>
          {!hasData && <div className={styles.emptyChart}>No activity in this period.</div>}
        </div>
      </div>
    </article>
  );
}
