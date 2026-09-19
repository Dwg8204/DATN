import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MultipleChoice from '../../../components/common/MultipleChoice';
import { savePartAnswers } from '../utils/listeningSessionStorage';
import { getListeningTestParts } from '../services/listeningTestRepository';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import styles from './Part1ListeningPage.module.css';

export default function Part1ListeningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getListeningTestParts(testId, controller.signal)
      .then(data => {
        setQuestions(data.part1.map((q, idx) => ({ ...q, displayLabel: idx + 1 })));
        setLoading(false);
      })
      .catch(err => {
        if (err.code !== 'ERR_CANCELED') {
          console.error('Failed to load part 1', err);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [testId]);

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState(() => {
    const allAnswers = JSON.parse(sessionStorage.getItem('listening_p1_answers') || '{}');
    return allAnswers;
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Part 1 displays one question per page to match the original design.
  const itemsPerPage = 1;
  const totalPages = Math.ceil(questions.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuestions = questions.slice(startIndex, startIndex + itemsPerPage);
  const currentPageQuestionIds = currentQuestions.map(q => q.id);

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: optionIndex
      };
      savePartAnswers('part1', newAnswers);
      return newAnswers;
    });
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
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading test...</div>
      ) : (
        <>
          <div className={styles.headerBlock}>
            <div className={styles.partTitle}>Part 1</div>
            <div className={styles.skillTitle}>Listening Test</div>
          </div>

          <InstructionBlock title={`Question ${startIndex + 1} of ${questions.length}`}>
            Listen to the recording and choose the correct answer (A, B or C) for each question.
          </InstructionBlock>

          <div className={styles.mainArea}>
            <div className={styles.questionSection}>
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className={styles.questionItem}>
                  <div className={styles.questionHeader}>
                    <div className={styles.questionNumberBox}>
                      <span className={styles.questionNumber}>{startIndex + idx + 1}</span>
                    </div>
                    <div className={styles.questionText}>{q.text}</div>
                  </div>
                  <MultipleChoice
                    name={`listening-question-${q.id}`}
                    options={q.options}
                    value={answers[q.id]}
                    onChange={(optionIndex) => handleOptionSelect(q.id, optionIndex)}
                  />
                </div>
              ))}
            </div>

            {/* Right Column: Audio Player */}
            <div className={styles.audioSection}>
              <AudioPlayer key={currentQuestions[0]?.id} src={currentQuestions[0]?.audioUrl} maxPlays={2} allowSkip={!isFullTest} />
            </div>
          </div>
        </>
      )}
      </div>

      {!loading && (
        <TestFooter
          partLabel="Part 1"
          questions={questions}
          answeredIds={Object.keys(answers)}
          currentPageQuestionIds={currentPageQuestionIds}
          onQuestionClick={(qId) => {
            const idx = questions.findIndex(q => q.id === qId);
            if (idx !== -1) setCurrentPage(Math.floor(idx / itemsPerPage) + 1);
          }}
          onPrevClick={handlePrev}
          onNextClick={handleNext}
          onSubmitClick={handleSubmit}
          submitLabel={submitLabel}
          hasPrev={currentPage > 1}
          hasNext={currentPage < totalPages}
        />
      )}

      <SubmitModal
        isOpen={showSubmitModal}
        onBack={handleCloseSubmit}
        onNext={handleConfirmSubmit}
      />
    </div>
  );
}
