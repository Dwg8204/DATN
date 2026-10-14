import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { DASHBOARD_PERIODS } from '../utils/dashboardFormatters';
import styles from '../AdminDashboardPage.module.css';

export default function DashboardPeriodFilter({ value, onChange, disabled }) {
  const ui = useUiTranslation();
  return (
    <div className={styles.periodScroller}>
      <nav className={styles.periods} aria-label={ui("Dashboard period")}>
        {DASHBOARD_PERIODS.map(period => (
          <button
            type="button"
            className={value === period.value ? styles.active : ''}
            aria-pressed={value === period.value}
            disabled={disabled}
            key={period.value}
            onClick={() => onChange(period.value)}
          >
            {ui(period.label)}
          </button>
        ))}
      </nav>
    </div>
  );
}
