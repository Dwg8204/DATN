import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import styles from './ListeningTestTakingPage.module.css';

export default function ListeningTestTakingPage() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const totalQuestions = 17;

  // Determine current part based on question number
  let currentPart = 1;
  let partLabel = 'Part 1';
  let instruction = 'Listen to the recording and choose the correct answer (A, B or C) for each question.';
  
  if (currentQuestion <= 13) {
    currentPart = 1;
    partLabel = 'Part 1';
    instruction = 'Listen to the recording and choose the correct answer (A, B or C) for each question.';
  } else if (currentQuestion === 14) {
    currentPart = 2;
    partLabel = 'Part 2';
    instruction = 'Match each speaker (A–D) with the correct statement.';
  } else if (currentQuestion === 15) {
    currentPart = 3;
    partLabel = 'Part 3';
    instruction = 'Listen and choose whether that opinion belongs to Man, Woman, or Both.';
  } else {
    currentPart = 4;
    partLabel = 'Part 4';
    instruction = 'Listen and choose the correct answer to the question.';
  }

  const handleNext = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitClick = () => {
    setShowSubmitModal(true);
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    navigate('/listening/overview');
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>{partLabel}</div>
          <div className={styles.skillTitle}>Listening Test</div>
        </div>

        <div className={styles.instructionBlock}>
          <span className={styles.instructionTitle}>
            Question {currentQuestion} of {totalQuestions}<br />
          </span>
          <span className={styles.instructionText}>
            {instruction}
          </span>
        </div>

        <div className={styles.mainArea}>
          {/* Left Column: Questions */}
          <div className={styles.questionSection}>
            {currentPart === 1 && (
              <div className={styles.questionItem}>
                <div className={styles.questionHeader}>
                  <div className={styles.questionNumberBox}>
                    <span className={styles.questionNumber}>{currentQuestion}</span>
                  </div>
                  <div className={styles.questionText}>A doctor's secretary calls about a change to an appointment. What is changing?</div>
                </div>
                <div className={styles.optionsList}>
                  {['The date', 'The time', 'The place'].map((opt, idx) => (
                    <div key={idx} className={styles.optionItem}>
                      <button className={styles.optionBtn}>{String.fromCharCode(65 + idx)}</button>
                      <div className={styles.optionText}>{opt}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {currentPart === 2 && (
              <div className={styles.questionItem}>
                <div className={styles.questionText}>Four people are talking about science. Complete the sentences below.</div>
                <div className={styles.matchingList}>
                  {['Speaker A', 'Speaker B', 'Speaker C', 'Speaker D'].map((speaker, idx) => (
                    <div key={idx} className={styles.matchItem}>
                      <span className={styles.speakerText}>{speaker} ...</span>
                      <select className={styles.matchSelect}>
                        <option>Select statement</option>
                        <option>now enjoys science</option>
                        <option>found science boring</option>
                        <option>wants to be a scientist</option>
                        <option>thinks science is hard</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentPart === 3 && (
              <div className={styles.questionItem}>
                <div className={styles.questionText}>Listen to two parents discussing the issue of children’s health. Read the opinions below and decide whose opinion matches the statements: the man, the woman, or both the man and the woman. You can listen to the discussion twice.</div>
                
                <div className={styles.questionText} style={{ marginTop: '24px' }}>Who expresses which opinion?</div>
                <div className={styles.matchingList}>
                  {[
                    'Parents should better manage their children’s diets.', 
                    'Parents should support their child’s interest in sport.', 
                    'Quiet time can promote children’s concentration abilities.', 
                    'Excessive sleep can be bad for young people.'
                  ].map((statement, idx) => (
                    <div key={idx} className={styles.matchItem}>
                      <span className={styles.statementText}>{statement}</span>
                      <select className={styles.matchSelect}>
                        <option>Select opinion</option>
                        <option>Man</option>
                        <option>Woman</option>
                        <option>Both</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentPart === 4 && (
              <div className={styles.questionItem}>
                <div className={styles.questionText}>Listen to a city planner talk at a press conference about a new transport plan and answer the questions below.</div>
                
                <div className={styles.multipleChoiceGroup}>
                  <div className={styles.questionSubText}>What is his opinion of the plan overall?</div>
                  <div className={styles.radioOptionsList}>
                    {[
                      'It is very similar to previous community projects in the same area.',
                      'It was prepared without proper consultation with the community.',
                      'It does not represent the opinions of the whole community.'
                    ].map((opt, idx) => (
                      <div key={idx} className={styles.radioOptionItem}>
                        <div className={styles.radioCircle}></div>
                        <div className={styles.radioOptionText}>{opt}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.multipleChoiceGroup} style={{ marginTop: '32px' }}>
                  <div className={styles.questionSubText}>What is his opinion of the role of the media?</div>
                  <div className={styles.radioOptionsList}>
                    {[
                      'He is critical of the media’s reporting of the plan.',
                      'He is surprised by the media’s interest in the plan.',
                      'He is confused by the media’s reaction to the plan.'
                    ].map((opt, idx) => (
                      <div key={idx} className={styles.radioOptionItem}>
                        <div className={styles.radioCircle}></div>
                        <div className={styles.radioOptionText}>{opt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Audio Player */}
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
        partLabel={partLabel} 
        questionCount={totalQuestions} 
        activeQuestion={currentQuestion}
        onQuestionClick={(q) => setCurrentQuestion(q)}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
        onSubmitClick={handleSubmitClick}
      />
      <SubmitModal 
        isOpen={showSubmitModal} 
        onBack={handleCloseSubmit} 
        onNext={handleConfirmSubmit} 
      />
    </div>
  );
}
