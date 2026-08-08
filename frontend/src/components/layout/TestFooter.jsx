import React from 'react';
import styles from './TestFooter.module.css';

export default function TestFooter({ 
  partLabel = 'Part 1', 
  questions = [],
  answeredIds = [],
  currentPageQuestionIds = [],
  onQuestionClick,
  onPrevClick,
  onNextClick,
  onSubmitClick,
  submitLabel = 'Submit',
  hasPrev = true,
  hasNext = true,
  hideNext = false, // backward compatibility with Part4
}) {
  const validQuestions = questions.filter(
    (question) => (
      question?.id !== undefined
      && question?.id !== null
      && String(question.id).trim() !== ''
    ),
  );

  return (
    <div className={styles.testFooter}>
      <div className={styles.leftSection}>
        <div className={styles.partLabel}>{partLabel}</div>
        <div className={styles.questionList}>
          {validQuestions.map((q) => {
            const isAnswered = answeredIds.includes(String(q.id));
            const isOnCurrentPage = currentPageQuestionIds.includes(q.id);
            return (
              <div 
                key={q.id} 
                className={`
                  ${styles.questionNode} 
                  ${isOnCurrentPage ? styles.nodeCurrentPage : ''}
                  ${isAnswered && !isOnCurrentPage ? styles.nodeAnswered : ''}
                `}
                onClick={() => onQuestionClick && onQuestionClick(q.id)}
              >
                <span className={styles.questionNodeText}>{q.id}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className={styles.rightSection}>
        <div className={styles.navArrows}>
          <button 
            className={`${styles.arrowBtn} ${styles.arrowBtnPrev} ${!hasPrev ? styles.arrowBtnDisabled : ''}`} 
            onClick={hasPrev ? onPrevClick : undefined}
          >
            <div className={styles.arrowIconWrap}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
          <button 
            className={`${styles.arrowBtn} ${styles.arrowBtnNext} ${!hasNext ? styles.arrowBtnDisabled : ''}`} 
            onClick={hasNext ? onNextClick : undefined}
          >
            <div className={styles.arrowIconWrap}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
        <button className={styles.submitBtn} onClick={onSubmitClick}>
          <span className={styles.submitBtnText}>{submitLabel}</span>
        </button>
      </div>
    </div>
  );
}
