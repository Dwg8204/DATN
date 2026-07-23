import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { savePartAnswers } from '../utils/listeningSessionStorage';
import { PART4_QUESTIONS } from '../data/part4MockData';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import styles from './Part4ListeningPage.module.css';

export default function Part4ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

  const [answers, setAnswers] = useState(() => {
    const allAnswers = JSON.parse(sessionStorage.getItem('listening_p4_answers') || '{}');
    return allAnswers;
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [currentMainIdx, setCurrentMainIdx] = useState(0);

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: optionIndex
      };
      savePartAnswers('part4', newAnswers);
      return newAnswers;
    });
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    savePartAnswers('part4', answers);
    setShowSubmitModal(false);
    navigate(`/listening/result?testId=${testId}&isFull=${isFullTest}${!isFullTest ? '&part=4' : ''}`);
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const currentMainQ = PART4_QUESTIONS[currentMainIdx];
  const allQuestionIds = PART4_QUESTIONS.flatMap(q => q.subQuestions.map(sq => sq.id));
  const currentPageIds = currentMainQ.subQuestions.map(sq => sq.id);

  const handleNext = () => {
    if (currentMainIdx < PART4_QUESTIONS.length - 1) {
      setCurrentMainIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentMainIdx > 0) {
      setCurrentMainIdx(prev => prev - 1);
    } else {
      navigate(`/listening/test/part3?testId=${testId}&isFull=${isFullTest}`);
    }
  };

  const handleQuestionClick = (qId) => {
    const mainIdx = PART4_QUESTIONS.findIndex(mainQ => mainQ.subQuestions.some(sq => sq.id === qId));
    if (mainIdx !== -1) {
      setCurrentMainIdx(mainIdx);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 4</div>
          <div className={styles.skillTitle}>Listening Test</div>
        </div>

        <div className={styles.instructionBlock}>
          <span className={styles.instructionTitle}>
            Questions {allQuestionIds.join(', ')}<br />
          </span>
          <span className={styles.instructionText}>
            Listen and choose the correct answer to the question.
          </span>
        </div>

        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
                <div className={styles.multipleChoiceGroup} style={{ marginBottom: '40px' }}>
                  <div className={styles.questionContext} style={{ marginBottom: '16px', fontWeight: 'bold' }}>{currentMainQ.context}</div>
                  
                  {currentMainQ.subQuestions.map((q) => (
                    <div key={q.id} style={{ marginBottom: '24px' }}>
                      <div className={styles.questionHeader}>
                        <div className={styles.questionNumberBox}>
                          <span className={styles.questionNumber}>{q.id}</span>
                        </div>
                        <div className={styles.questionSubText}>{q.text}</div>
                      </div>
                      
                      <div className={styles.radioOptionsList}>
                        {q.options.map((opt, idx) => {
                          const isSelected = answers[q.id] === idx;
                          return (
                            <div 
                              key={idx} 
                              className={styles.radioOptionItem}
                              onClick={() => handleOptionSelect(q.id, idx)}
                            >
                              <div className={`${styles.radioCircle} ${isSelected ? styles.radioCircleSelected : ''}`}>
                                {isSelected && <div className={styles.radioCircleInner}></div>}
                              </div>
                              <div className={styles.radioOptionText}>{opt}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          <div className={styles.audioSection}>
            <AudioPlayer key={currentMainQ.id} src={currentMainQ.audioUrl} maxPlays={2} />
          </div>
        </div>
      </div>

      <TestFooter 
        partLabel="Part 4" 
        questions={PART4_QUESTIONS.flatMap(q => q.subQuestions)}
        answeredIds={Object.keys(answers)}
        currentPageQuestionIds={currentPageIds}
        onQuestionClick={handleQuestionClick}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
        onSubmitClick={handleSubmit}
        submitLabel="Submit"
        hideNext={currentMainIdx === PART4_QUESTIONS.length - 1}
      />

      <SubmitModal 
        isOpen={showSubmitModal} 
        onBack={handleCloseSubmit} 
        onNext={handleConfirmSubmit} 
      />
    </div>
  );
}
