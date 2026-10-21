import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { personalizationApi } from '../services/personalizationApi';
import styles from './Personalization.module.css';

export default function PersonalCommentCard() {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    let timer;
    const load = async () => {
      try {
        const response = await personalizationApi.comment();
        if (!active) return;
        setResult(response);
        if (response.status === 'PENDING') timer = setTimeout(load, 15_000);
      } catch {
        if (active) setResult(null);
      }
    };
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  if (!result || !['PENDING', 'READY'].includes(result.status)) return null;
  const content = result.comment?.content;
  return <section className={styles.card} aria-busy={result.status === 'PENDING'}>
    <h2>{t('personalization.commentTitle')}</h2>
    {result.status === 'PENDING' ? <p role="status">{t('personalization.commentPending')}</p> : content && <>
      <p>{content.summary}</p>
      {content.strengths?.length > 0 && <><h3>{t('personalization.commentStrengths')}</h3><ul>{content.strengths.map((text, index) => <li key={index}>{text}</li>)}</ul></>}
      {content.focus?.length > 0 && <><h3>{t('personalization.commentFocus')}</h3><ul>{content.focus.map((text, index) => <li key={index}>{text}</li>)}</ul></>}
    </>}
  </section>;
}
