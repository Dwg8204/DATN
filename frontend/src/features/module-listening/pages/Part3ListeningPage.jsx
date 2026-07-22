import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { savePartAnswers } from '../utils/listeningSessionStorage';
import { PART3_DATA } from '../data/part3MockData';
import styles from './Part3ListeningPage.module.css';

export default function Part3ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

  const [answers, setAnswers] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionSelect = (statementId, option) => {
    setAnswers(prev => ({
      ...prev,
      [statementId]: option
    }));
    setOpenDropdown(null);
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    savePartAnswers('part3', answers);
    setShowSubmitModal(false);
    if (isFullTest) {
      navigate(`/listening/test/part4?testId=${testId}&isFull=true`);
    } else {
      navigate(`/listening/result?testId=${testId}&isFull=false&part=3`);
    }
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const submitLabel = isFullTest ? 'Next Part' : 'Submit';

  // Treat Part 3 as a single question (ID 15) in the footer.
  const isAnswered = PART3_DATA.statements.every((stmt) => answers[stmt.id]);

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 3</div>
          <div className={styles.skillTitle}>Listening Test</div>
        </div>

        <div className={styles.instructionBlock}>
          <span className={styles.instructionTitle}>
            Question {PART3_DATA.id}<br />
          </span>
          <span className={styles.instructionText}>
            {PART3_DATA.context}
          </span>
        </div>

        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            <div className={styles.questionItem}>
              <div className={styles.questionText}>{PART3_DATA.subTitle}</div>

              <div className={styles.matchingList}>
                {PART3_DATA.statements.map((stmt) => {
                  const isOpen = openDropdown === stmt.id;
                  const selectedOption = answers[stmt.id];

                  return (
                    <div key={stmt.id} className={styles.matchItem}>
                      <span className={styles.statementText}>{stmt.text}</span>

                      <div className={styles.dropdownContainer}>
                        <div
                          className={`${styles.dropdownTrigger} ${selectedOption ? styles.hasValue : ''}`}
                          onClick={() => setOpenDropdown(isOpen ? null : stmt.id)}
                        >
                          {selectedOption ? (
                            <span>{selectedOption}</span>
                          ) : (
                            <span className={styles.dropdownPlaceholder}>Select opinion</span>
                          )}
                        </div>

                        {isOpen && (
                          <div className={styles.dropdownMenu} ref={dropdownRef}>
                            {PART3_DATA.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`${styles.dropdownItem} ${selectedOption === opt ? styles.dropdownItemSelected : ''}`}
                                onClick={() => handleOptionSelect(stmt.id, opt)}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
                  Playback speed: 1x
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TestFooter
        partLabel="Part 3"
        questions={[{ id: 15 }]}
        answeredIds={isAnswered ? ['15'] : []}
        currentPageQuestionIds={[15]}
        onQuestionClick={() => { }}
        onPrevClick={() => navigate(`/listening/test/part2?testId=${testId}&isFull=${isFullTest}`)}
        onNextClick={() => { }}
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
