import { useTranslation } from 'react-i18next';
import styles from './WritingAssessment.module.css';
import WritingFeedbackContext from './WritingFeedbackContext';

export function WritingCefr({ writing }) {
  const { t } = useTranslation();
  if (!writing || writing.scope !== 'FULL_SKILL') return null;
  return (
    <section className={styles.panel}>
      <h2>{t('writingAi.cefr')}</h2>
      {writing.cefr.level ? (
        <strong className={styles.level}>{writing.cefr.level}</strong>
      ) : (
        <p>{t('writingAi.insufficient')}</p>
      )}
      {writing.cefr.rationale && <p>{writing.cefr.rationale}</p>}
      {writing.cefr.limitations?.map((text, index) => (
        <p key={index}>{text}</p>
      ))}
      <small className={styles.muted}>{t('writingAi.estimated')}</small>
    </section>
  );
}

export default function WritingAiSummary({ writing, assisted }) {
  const { t } = useTranslation();
  if (!writing) return null;
  return (
    <section className={styles.panel}>
      <h2>{t('writingAi.aiSummary')}</h2>
      <p>{writing.summary.overallComment}</p>
      <WritingFeedbackContext writing={writing} assisted={assisted} />
      <div className={styles.grid}>
        {writing.summary.partSummaries.map((part) => (
          <article key={part.partNumber} className={styles.card}>
            <h3>Part {part.partNumber}</h3>
            <p>{part.comment}</p>
          </article>
        ))}
      </div>
      {!!writing.summary.priorities.length && (
        <>
          <h3>{t('writingAi.priorities')}</h3>
          <ul>
            {writing.summary.priorities.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
