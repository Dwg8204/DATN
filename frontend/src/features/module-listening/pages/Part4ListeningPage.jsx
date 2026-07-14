import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { savePartAnswers } from '../utils/listeningSessionStorage';
import { PART4_QUESTIONS } from '../data/part4MockData';
import styles from './Part4ListeningPage.module.css';

export default function Part4ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

  const [answers, setAnswers] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
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

  const submitLabel = 'Submit';

  const questionIds = PART4_QUESTIONS.map(q => q.id);

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 4</div>
          <div className={styles.skillTitle}>Listening Test</div>
        </div>

        <div className={styles.instructionBlock}>
          <span className={styles.instructionTitle}>
            Questions {questionIds.join('-')}<br />
          </span>
          <span className={styles.instructionText}>
            Listen and choose the correct answer to the question.
          </span>
        </div>

        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
              <div className={styles.questionContext}>{PART4_QUESTIONS[0].context}</div>
              
              {PART4_QUESTIONS.map((q) => (
                <div key={q.id} className={styles.multipleChoiceGroup}>
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

          <div className={styles.audioSection}>
            <div className={styles.audioMock}>
              <div className={styles.audioPlaceholder}>
                <img src="https://placehold.co/600x250?text=Audio+Visualizer" alt="Audio Visualizer" className={styles.audioImage} />
              </div>
              <div className={styles.audioControlsRow}>
                <div className={styles.audioTime}>00:30 / 08:30</div>
                <div className={styles.volumeGroup}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <div className={styles.volumeTrack}>
                    <div className={styles.volumeFill}></div>
                  </div>
                </div>
                <div className={styles.playbackControls}>
                  <button className={styles.rewindBtn}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>
                  <button className={styles.playBtn}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <button className={styles.forwardBtn}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11V9a4 4 0 0 0-4-4H3" />
                      <polyline points="17 23 21 19 17 15" />
                      <path d="M3 13v2a4 4 0 0 0 4 4h14" />
                    </svg>
                  </button>
                </div>
                <div className={styles.speedControl}>
                  Tốc độ phát: 1x
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TestFooter 
        partLabel="Part 4" 
        questions={PART4_QUESTIONS}
        answeredIds={Object.keys(answers)}
        currentPageQuestionIds={questionIds}
        onQuestionClick={() => {}}
        onPrevClick={() => navigate(`/listening/test/part3?testId=${testId}&isFull=${isFullTest}`)}
        onNextClick={() => {}}
        onSubmitClick={handleSubmit}
        submitLabel={submitLabel}
      />

      <SubmitModal 
        isOpen={showSubmitModal} 
        onBack={handleCloseSubmit} 
        onNext={handleConfirmSubmit} 
      />
    </div>
  );
}
