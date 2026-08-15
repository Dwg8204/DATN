import { NavLink, useLocation } from 'react-router-dom';
import styles from './SkillSubNavigation.module.css';

const skillNavigation = [
  {
    pathPrefix: '/writing',
    label: 'Writing',
    items: [
      { label: 'Writing Overview', to: '/writing/overview' },
      { label: 'Writing Test', to: '/writing/tests' },
    ],
  },
  {
    pathPrefix: '/grammar-vocab',
    label: 'Grammar & Vocabulary',
    items: [
      { label: 'Grammar & Vocab Overview', to: '/grammar-vocab/overview' },
      { label: 'Grammar & Vocab Test', to: '/grammar-vocab/tests' },
    ],
  },
  {
    pathPrefix: '/listening',
    label: 'Listening',
    items: [
      { label: 'Listening Overview', to: '/listening/overview' },
      { label: 'Listening Feed', to: '/listening/feed' },
      { label: 'Listening Test', to: '/listening/tests' },
    ],
  },
];

export default function SkillSubNavigation() {
  const { pathname } = useLocation();
  const navigation = skillNavigation.find(({ pathPrefix }) => pathname.startsWith(pathPrefix));

  if (!navigation) return null;

  return (
    <nav className={styles.navigation} aria-label={`${navigation.label} navigation`}>
      {navigation.items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
