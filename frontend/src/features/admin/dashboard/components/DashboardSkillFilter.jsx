import { useUiTranslation } from "../../../../i18n/useUiTranslation.jsx";
import { DASHBOARD_SKILLS } from '../utils/dashboardFormatters';
import styles from '../AdminDashboardPage.module.css';

export default function DashboardSkillFilter({ value, onChange }) {
  const ui = useUiTranslation();
  return (
    <div className={styles.skillScroller}>
      <nav className={styles.skillFilter} aria-label={ui("Chart skill")}>
        {DASHBOARD_SKILLS.map(skill => (
          <button type="button" key={skill.value} className={value === skill.value ? styles.skillActive : ''} aria-pressed={value === skill.value} onClick={() => onChange(skill.value)}>
            {ui(skill.label)}
          </button>
        ))}
      </nav>
    </div>
  );
}
