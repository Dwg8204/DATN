import { useTranslation } from 'react-i18next';
import styles from './WritingAssessment.module.css';

export function FindingList({ title, findings }) {
  if (!findings?.length) return null;
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {findings.map((finding, index) => (
          <li key={index}>
            {finding.comment}
            {finding.evidence?.map((evidence, quoteIndex) => (
              <blockquote className={styles.quote} key={quoteIndex}>
                {evidence.quote}
              </blockquote>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
export default function WritingPartFeedback({ part }) {
  const { t } = useTranslation();
  if (!part) return null;
  return (
    <section className={styles.panel}>
      <h2>
        {t('writingAi.partFeedback')} · Part {part.partNumber}
      </h2>
      <p>{part.overview}</p>
      <FindingList title={t('writingAi.strengths')} findings={part.strengths} />
      <FindingList title={t('writingAi.weaknesses')} findings={part.weaknesses} />
      {!!part.suggestions.length && (
        <div>
          <h4>{t('writingAi.suggestions')}</h4>
          <ul>
            {part.suggestions.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
