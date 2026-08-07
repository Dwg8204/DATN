import { NavLink, useLocation } from 'react-router-dom';
import styles from './SkillSubNavigation.module.css';

const skillNavigationConfigs = [
  {
    skillKey: 'grammar-vocab',
    label: 'Grammar & Vocabulary',
    routes: ['/grammar-vocab/overview', '/grammar-vocab/tests'],
    items: [
      { label: 'Overview', to: '/grammar-vocab/overview' },
      { label: 'Practice Tests', to: '/grammar-vocab/tests' },
    ],
  },
];

export default function SkillSubNavigation() {
  const { pathname } = useLocation();
  const config = skillNavigationConfigs.find(({ routes }) =>
    routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  );

  if (!config) return null;

  return (
    <nav className={styles.navigation} aria-label={`${config.label} navigation`}>
      <span className={styles.skillName}>{config.label}</span>
      <div className={styles.tabs}>
        {config.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
