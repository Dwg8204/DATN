import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';
import { splitFormattedPassage } from '../../../../admin/reading/utils/richPassage';
import styles from './Part1GapFilling.module.css';

const Part1GapFilling = ({ data, isPractice = false }) => {
  const { answers, handleAnswerChange, renderAnswerReveal } = useContext(ReadingTestContext);
  if (!data) return null;

  const parts = splitFormattedPassage(data);
  const questions = [...(data.questions || [])].sort((a, b) => a.position - b.position);

  return (
    <div className={`${styles.part} ${isPractice ? styles.practiceLayout : styles.examLayout}`}>
      <div className={styles.passageWrap}>
        <h2 className={styles.panelTitle}>Reading passage</h2>
        <div className={styles.passage}>
          {parts.map((part, index) => {
            if (!part.gap) return <span key={index} className={styles.passageText} dangerouslySetInnerHTML={{ __html: part.html }} />;

            const position = part.gap;
            const question = questions.find((item) => item.position === position);
            if (!question) return null;

            return (
              <span key={index} id={`question-${position}`} className={styles.answerGap}>
                <AnswerSelect
                  className={styles.answerSelect}
                  value={answers[question.id] || ''}
                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                  options={question.options}
                  placeholder={`Question ${position}`}
                  ariaLabel={`Answer for gap ${position}`}
                />
                <span className={styles.answerReveal}>{renderAnswerReveal?.(question.id, { inline: isPractice })}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Part1GapFilling;
