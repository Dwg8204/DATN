import { useTranslation } from 'react-i18next';
import styles from './SkillResources.module.css';

const base = 'https://www.britishcouncil.org';
const sources = {
  reading: ['/exam/aptis/practice-material/reading-test', 'Reading'],
  listening: ['/exam/aptis/practice-materials/listening-aptis-test', 'Listening'],
  speaking: ['/exam/aptis/take-test/speaking-video', 'Speaking'],
  writing: ['/exam/aptis/take-test/writing-video', 'Writing'],
  'grammar-vocab': ['/exam/aptis/practice-materials/grammar-vocabulary', 'Grammar & Vocabulary'],
};

export function SkillSource({ skill }) {
  const { t } = useTranslation();
  const [path, name] = sources[skill];
  return <p className={styles.source}>{t('skillResources.source')}: <a href={base + path} target="_blank" rel="noopener noreferrer">British Council – Aptis {name}</a></p>;
}

export default function SkillResources({ skill }) {
  const { t } = useTranslation();
  const [path, name] = sources[skill];
  const resources = [
    { key: 'format', href: base + path },
    { key: 'practice', href: 'https://www.britishcouncil.vn/sites/default/files/aptis_esol_general_practice_tests.pdf' },
    { key: 'guide', href: base + '/sites/default/files/aptis_candidate_guide_2020_a4_final.pdf' },
    { key: 'preparation', href: base + '/exam/english/aptis/prepare-general' },
  ];
  return <>
    <section className={styles.section}>
      <h2>{t('skillResources.documents', { skill: name })}</h2>
      <div className={styles.documents}>{resources.map(item => <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer">{t(`skillResources.${item.key}`, { skill: name })}</a>)}</div>
    </section>
    <section className={styles.section}>
      <h2>{t('skillResources.popular')}</h2>
      <div className={styles.cards}>{resources.map(item => <a className={styles.card} key={item.key} href={item.href} target="_blank" rel="noopener noreferrer">
        <span className={styles.publisher}>British Council</span>
        <strong>{t(`skillResources.${item.key}`, { skill: name })}</strong>
        <span className={styles.open}>{t('skillResources.open')} <span aria-hidden="true">↗</span></span>
      </a>)}</div>
    </section>
  </>;
}
