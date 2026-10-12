import { useTranslation } from 'react-i18next';
import { FindingList } from './WritingPartFeedback';
import styles from './WritingAssessment.module.css';

export default function WritingQuestionFeedback({ feedback }) {
  const { t } = useTranslation();
  if (!feedback) return null;
  return (
    <section className={styles.panel}>
      <h3>{t('writingAi.questionFeedback')}</h3>
      <p>{feedback.comment}</p>
      <div className={styles.criteria}>
        {feedback.criteria.map((criterion) => (
          <details key={criterion.criterion}>
            <summary>
              {t(`writingAi.${criterion.criterion}`)} · {t(`writingAi.${criterion.judgment}`)}
            </summary>
            <p>{criterion.comment}</p>
            {criterion.evidenceQuotes.map((quote, index) => (
              <blockquote key={index} className={styles.quote}>
                {quote}
              </blockquote>
            ))}
          </details>
        ))}
      </div>
      <FindingList title={t('writingAi.strengths')} findings={feedback.strengths} />
      <FindingList title={t('writingAi.weaknesses')} findings={feedback.weaknesses} />
      {!!feedback.corrections.length && (
        <>
          <h4>{t('writingAi.corrections')}</h4>
          {feedback.corrections.map((correction, index) => (
            <article className={styles.card} key={index}>
              <span className={styles.badge}>
                {t(`writingAi.${correction.kind}`)} · {t(`writingAi.${correction.criterion}`)}
              </span>
              <small>{t('writingAi.original')}</small>
              <blockquote className={styles.quote}>{correction.original}</blockquote>
              <small>{t('writingAi.replacement')}</small>
              <p className={styles.replacement}>{correction.replacement}</p>
              <p>{correction.explanation}</p>
            </article>
          ))}
        </>
      )}
      {!!feedback.taskIssues.length && (
        <div>
          <h4>{t('writingAi.taskIssues')}</h4>
          <ul>
            {feedback.taskIssues.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      )}
      {!!feedback.suggestions.length && (
        <div>
          <h4>{t('writingAi.suggestions')}</h4>
          <ul>
            {feedback.suggestions.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
