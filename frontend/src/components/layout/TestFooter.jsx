import React, { useEffect, useRef } from 'react';
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
  const questionListRef = useRef(null);
  const questionNodeRefs = useRef(new Map());
  const validQuestions = questions.filter(
    (question) => (
      question?.id !== undefined
      && question?.id !== null
      && String(question.id).trim() !== ''
    ),
  );

  useEffect(() => {
    const list = questionListRef.current;
    const activeNode = questionNodeRefs.current.get(String(currentPageQuestionIds[0]));
    if (!list || !activeNode) return;

    const targetLeft = activeNode.offsetLeft - ((list.clientWidth - activeNode.offsetWidth) / 2);
    list.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [currentPageQuestionIds]);

  return (
    <div className={styles.testFooter}>
      <div className={styles.leftSection}>
        <div className={styles.partLabel}>{partLabel}</div>
        <div className={styles.questionList} ref={questionListRef}>
          {validQuestions.map((q) => {
            const isAnswered = answeredIds.includes(String(q.id));
            const isOnCurrentPage = currentPageQuestionIds.some((id) => String(id) === String(q.id));
            return (
              <div 
                key={q.id} 
                ref={(node) => {
                  if (node) questionNodeRefs.current.set(String(q.id), node);
                  else questionNodeRefs.current.delete(String(q.id));
                }}
                className={`
                  ${styles.questionNode} 
                  ${isAnswered ? styles.nodeAnswered : (isOnCurrentPage ? styles.nodeCurrentPage : '')}
                  ${isOnCurrentPage ? styles.nodeCurrentOutline : ''}
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
