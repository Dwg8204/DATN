import React from 'react';
import styles from './TestFooter.module.css';

export default function TestFooter({ 
  partLabel = 'Part 1', 
  questionCount = 10,
  activeQuestion = 1,
  onQuestionClick,
  onPrevClick,
  onNextClick,
  onSubmitClick
}) {
  const questions = Array.from({ length: questionCount }, (_, i) => i + 1);

  return (
    <div className={styles.testFooter}>
      <div className={styles.leftSection}>
        <div className={styles.partLabel}>{partLabel}</div>
        <div className={styles.questionList}>
          {questions.map((qNum) => (
            <div 
              key={qNum} 
              className={`${styles.questionNode} ${activeQuestion === qNum ? styles.questionNodeActive : ''}`}
              onClick={() => onQuestionClick && onQuestionClick(qNum)}
            >
              <span className={styles.questionNodeText}>{qNum}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.rightSection}>
        <div className={styles.navArrows}>
          <button className={`${styles.arrowBtn} ${styles.arrowBtnPrev}`} onClick={onPrevClick}>
            <div className={styles.arrowIconWrap}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
          <button className={`${styles.arrowBtn} ${styles.arrowBtnNext}`} onClick={onNextClick}>
            <div className={styles.arrowIconWrap}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
        <button className={styles.submitBtn} onClick={onSubmitClick}>
          <span className={styles.submitBtnText}>Submit</span>
        </button>
      </div>
    </div>
  );
}
