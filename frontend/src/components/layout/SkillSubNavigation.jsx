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
    pathPrefix: '/reading',
    label: 'Reading',
    items: [
      { label: 'Reading Overview', to: '/reading' },
      { label: 'Reading Test', to: '/reading/tests' },
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
  {
    pathPrefix: '/speaking',
    label: 'Speaking',
    items: [
      { label: 'Speaking Overview', to: '/speaking/overview' },
      { label: 'Speaking Feed', to: '/speaking/feed' },
      { label: 'Speaking Test', to: '/speaking/tests' },
    ],
  },
  {
    pathPrefix: '/dictation',
    label: 'Dictation',
    items: [
      { label: 'Dictation Practice', to: '/dictation', mode: 'dictation' },
      { label: 'Flashcard', to: '/dictation?mode=flashcard', mode: 'flashcard' },
      { label: 'Vocabulary Notebook', to: '/dictation?mode=notebook', mode: 'notebook' },
    ],
  },
];

export default function SkillSubNavigation() {
  const { pathname, search } = useLocation();
  const navigation = skillNavigation.find(({ pathPrefix }) => pathname.startsWith(pathPrefix));
  const requestedMode = new URLSearchParams(search).get('mode');
  const dictationMode = ['flashcard', 'notebook'].includes(requestedMode) ? requestedMode : 'dictation';

  if (!navigation) return null;

  return (
    <nav className={styles.navigation} aria-label={`${navigation.label} navigation`}>
      {navigation.items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/reading'}
          className={({ isActive }) => `${styles.link} ${navigation.pathPrefix === '/dictation' ? dictationMode === item.mode ? styles.active : '' : isActive ? styles.active : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
