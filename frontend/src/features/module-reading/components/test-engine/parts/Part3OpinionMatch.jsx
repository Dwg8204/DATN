import { useUiTranslation } from "../../../../../i18n/useUiTranslation.jsx";
import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';
import styles from './Part3OpinionMatch.module.css';

const Part3OpinionMatch = ({ data }) => {
  const ui = useUiTranslation();
  const { answers, handleAnswerChange, renderAnswerReveal } = useContext(ReadingTestContext);
  if (!data) return null;

  return (
    <div className={styles.part}>
      <section className={styles.postsPanel} aria-labelledby="part3-posts-title">
        <h3 id="part3-posts-title" className={styles.panelTitle}>{ui("Posts")}</h3>
        <div className={styles.passage}>{data.passage}</div>
      </section>

      <section className={styles.questionsPanel} aria-labelledby="part3-questions-title">
        <h3 id="part3-questions-title" className={styles.panelTitle}>{ui("Questions")}</h3>
        <div className={styles.questionList}>
          {data.questions.map((question, index) => (
            <article key={question.id} id={`question-${index + 16}`} className={styles.questionRow}>
              <div className={styles.questionCopy}>
                <span className={styles.questionNumber}>{index + 16}</span>
                <p>{question.statement}</p>
              </div>
              <div className={styles.answerField}>
                <AnswerSelect
                  value={answers[question.id] || ''}
                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                  className={styles.answerSelect}
                  options={data.speakers || []}
                  placeholder={ui("Question {{value0}}", {value0:(index + 16)})}
                  ariaLabel={ui("Answer for question {{value0}}", {value0:(index + 16)})}
                />
                {renderAnswerReveal?.(question.id)}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Part3OpinionMatch;
