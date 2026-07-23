import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { savePartAnswers } from '../utils/listeningSessionStorage';
import { PART3_DATA } from '../data/part3MockData';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import styles from './Part3ListeningPage.module.css';

export default function Part3ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

  const [answers, setAnswers] = useState(() => {
    const allAnswers = JSON.parse(sessionStorage.getItem('listening_p3_answers') || '{}');
    return allAnswers;
  });
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
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [statementId]: option
      };
      savePartAnswers('part3', newAnswers);
      return newAnswers;
    });
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
            <AudioPlayer src={PART3_DATA.audioUrl} maxPlays={2} />
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
