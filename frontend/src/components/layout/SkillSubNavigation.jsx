import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SKILL_NAVIGATION, skillMenuItems } from '../../config/skillNavigation';
import styles from './SkillSubNavigation.module.css';

const auxiliaryNavigation = [{
    pathPrefix: '/dictation',
    label: 'Dictation',
    items: [
      { labelKey: 'common.practice', to: '/dictation', mode: 'dictation' },
      { labelKey: 'nav.flashcard', to: '/dictation?mode=flashcard', mode: 'flashcard' },
      { labelKey: 'nav.vocabularyNotebook', to: '/dictation?mode=notebook', mode: 'notebook' },
    ],
  }];

export default function SkillSubNavigation() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const skill = SKILL_NAVIGATION.find(({ pathPrefix }) => pathname.startsWith(pathPrefix));
  const navigation = skill
    ? { ...skill, label: t(`nav.${skill.key}`), items: skillMenuItems(skill, t) }
    : auxiliaryNavigation.find(({ pathPrefix }) => pathname.startsWith(pathPrefix));
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
          {item.labelKey ? t(item.labelKey) : item.label}
        </NavLink>
      ))}
    </nav>
  );
}
