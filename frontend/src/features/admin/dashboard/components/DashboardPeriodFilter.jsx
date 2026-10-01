import { DASHBOARD_PERIODS } from '../utils/dashboardFormatters';
import styles from '../AdminDashboardPage.module.css';

export default function DashboardPeriodFilter({ value, onChange, disabled }) {
  return (
    <div className={styles.periodScroller}>
      <nav className={styles.periods} aria-label="Dashboard period">
        {DASHBOARD_PERIODS.map(period => (
          <button
            type="button"
            className={value === period.value ? styles.active : ''}
            aria-pressed={value === period.value}
            disabled={disabled}
            key={period.value}
            onClick={() => onChange(period.value)}
          >
            {period.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
