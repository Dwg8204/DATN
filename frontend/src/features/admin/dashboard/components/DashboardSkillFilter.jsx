import { DASHBOARD_SKILLS } from '../utils/dashboardFormatters';
import styles from '../AdminDashboardPage.module.css';

export default function DashboardSkillFilter({ value, onChange }) {
  return (
    <div className={styles.skillScroller}>
      <nav className={styles.skillFilter} aria-label="Chart skill">
        {DASHBOARD_SKILLS.map(skill => (
          <button type="button" key={skill.value} className={value === skill.value ? styles.skillActive : ''} aria-pressed={value === skill.value} onClick={() => onChange(skill.value)}>
            {skill.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
