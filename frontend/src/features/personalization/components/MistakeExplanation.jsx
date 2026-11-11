import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLoader from '../../../components/common/PageLoader.jsx';
import { personalizationApi } from '../services/personalizationApi';
import styles from './MistakeExplanation.module.css';

export default function MistakeExplanation({ attemptId, questionKey }) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || i18n.language).startsWith('vi') ? 'vi' : 'en';
  const key = `${attemptId}:${questionKey}:${locale}`;
  const region = useId();
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestKey = `${key}:${retry}`;
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    personalizationApi.getMistakeExplanation(attemptId, questionKey, locale)
      .then(data => { if (active) setState({ key: requestKey, data }); })
      .catch(() => { if (active) setState({ key: requestKey, error: true }); });
    return () => { active = false; };
  }, [open, requestKey, attemptId, questionKey, locale]);
  const current = state?.key === requestKey ? state : null;
  const data = current?.data;
  return <section className={styles.panel}>
    <button type="button" aria-expanded={open} aria-controls={region} onClick={() => { if (!open) setState(null); setOpen(value => !value); }}>
      {t('personalization.explain.open')}
    </button>
    {open && <div id={region} className={styles.body}>
      {(!current || current.loading) && <PageLoader compact />}
      {current?.error && <div role="alert"><p>{t('personalization.explain.error')}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)}>{t('personalization.explain.retry')}</button></div>}
      {data && <>
        {data.status === 'FALLBACK' && <p className={styles.notice} role="status">{t(`personalization.explain.${data.notice === 'EXPLAIN_LIMIT_REACHED' ? 'limit' : data.notice === 'EXPLAIN_UNAVAILABLE' ? 'unavailable' : 'fallback'}`)}</p>}
        <p>{data.explanation}</p>
        {data.ruleSummary && <><h4>{t('personalization.explain.rule')}</h4><p>{data.ruleSummary}</p></>}
        {data.tip && <><h4>{t('personalization.explain.tip')}</h4><p>{data.tip}</p></>}
        {data.sources?.length > 0 && <><h4>{t('personalization.explain.sources')}</h4><ul>
          {data.sources.map(source => <li key={source.chunkId}>
            {typeof source.url === 'string' && /^https:\/\//i.test(source.url)
              ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
              : <strong>{source.title}</strong>}
            <p>{source.excerpt}</p>
          </li>)}
        </ul></>}
      </>}
    </div>}
  </section>;
}
