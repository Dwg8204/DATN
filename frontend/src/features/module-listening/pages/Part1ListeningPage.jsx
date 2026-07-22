import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { savePartAnswers, saveTestMeta } from '../utils/listeningSessionStorage';
import { PART1_QUESTIONS } from '../data/part1MockData';
import styles from './Part1ListeningPage.module.css';

export default function Part1ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    saveTestMeta(testId);
  }, [testId]);

  // Part 1 displays one question per page to match the original design.
  const itemsPerPage = 1;
  const totalPages = Math.ceil(PART1_QUESTIONS.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuestions = PART1_QUESTIONS.slice(startIndex, startIndex + itemsPerPage);
  const currentPageQuestionIds = currentQuestions.map(q => q.id);

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    savePartAnswers('part1', answers);
    setShowSubmitModal(false);
    if (isFullTest) {
      navigate(`/listening/test/part2?testId=${testId}&isFull=true`);
    } else {
      navigate(`/listening/result?testId=${testId}&isFull=false&part=1`);
    }
  };

  const handleCloseSubmit = () => {
    setShowSubmitModal(false);
  };

  const submitLabel = isFullTest ? 'Next Part' : 'Submit';

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 1</div>
          <div className={styles.skillTitle}>Listening Test</div>
        </div>

        <div className={styles.instructionBlock}>
          <span className={styles.instructionTitle}>
            Question {startIndex + 1} of {PART1_QUESTIONS.length}<br />
          </span>
          <span className={styles.instructionText}>
            Listen to the recording and choose the correct answer (A, B or C) for each question.
          </span>
        </div>

        <div className={styles.mainArea}>
          <div className={styles.questionSection}>
            {currentQuestions.map(q => (
              <div key={q.id} className={styles.questionItem}>
                <div className={styles.questionHeader}>
                  <div className={styles.questionNumberBox}>
                    <span className={styles.questionNumber}>{q.id}</span>
                  </div>
                  <div className={styles.questionText}>{q.text}</div>
                </div>
                <div className={styles.optionsList}>
                  {q.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={styles.optionItem}
                      onClick={() => handleOptionSelect(q.id, idx)}
                    >
                      <button className={`${styles.optionBtn} ${answers[q.id] === idx ? styles.optionBtnSelected : ''}`}>
                        {String.fromCharCode(65 + idx)}
                      </button>
                      <div className={styles.optionText}>{opt}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
        partLabel="Part 1"
        questions={PART1_QUESTIONS}
        answeredIds={Object.keys(answers)}
        currentPageQuestionIds={currentPageQuestionIds}
        onQuestionClick={(qId) => setCurrentPage(qId)}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
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
