import { useContext } from 'react';
import AnswerSelect from '../../../../../components/common/AnswerSelect';
import { ReadingTestContext } from '../../../context/ReadingTestContext';
import styles from './Part4MatchHeading.module.css';

const Part4MatchHeading = ({ data }) => {
  const { answers, handleAnswerChange } = useContext(ReadingTestContext);
  if (!data) return null;

  const headingOptions = data.headings.map((heading) => ({ value: heading.id, label: heading.text }));

  return (
    <div className={styles.part}>
      <div className={styles.content}>
          <h2 className={styles.title}>{data.title || 'Mission to Mars'}</h2>
          <div className={styles.paragraphList}>
            {data.paragraphs.map((paragraph, index) => (
              <article key={paragraph.id} id={`question-${index + 18}`} className={styles.paragraphRow}>
                <span className={styles.paragraphNumber}>{index + 1}.</span>
                <div className={styles.answerField}>
                  <AnswerSelect
                    className={styles.answerSelect}
                    value={answers[paragraph.id] || ''}
                    onChange={(event) => handleAnswerChange(paragraph.id, event.target.value)}
                    options={headingOptions}
                    placeholder={`Question ${index + 18}`}
                    ariaLabel={`Heading for paragraph ${index + 1}`}
                  />
                </div>
                <p className={styles.paragraphText}>{paragraph.content}</p>
              </article>
            ))}
          </div>
      </div>
    </div>
  );
};

export default Part4MatchHeading;
