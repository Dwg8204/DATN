import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MockAudioRecorder from '../../../components/shared/MockAudioRecorder/MockAudioRecorder';
import { getSpeakingTestParts } from '../services/speakingTestRepository';
import { saveSpeakingPartAnswers } from '../utils/speakingSessionStorage';
import styles from './Part1SpeakingPage.module.css';

const QUESTION_VISIBLE_DURATION = 10000; // 10 seconds
const MAX_RECORD_TIME = 30; // seconds

export default function Part1SpeakingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';
  const PART1_QUESTIONS = getSpeakingTestParts(testId).part1.questions;

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Question visibility
  const [questionVisible, setQuestionVisible] = useState(true);
  const [questionPermanent, setQuestionPermanent] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(MAX_RECORD_TIME);
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef(null);
  const hideQuestionRef = useRef(null);
  const countdownRef = useRef(null);

  const totalPages = PART1_QUESTIONS.length;
  const currentQuestion = PART1_QUESTIONS[currentPage - 1];

  // Reset everything when question changes
  useEffect(() => {
    setQuestionVisible(true);
    setQuestionPermanent(false);
    setIsRecording(false);
    setIsFinished(false);
    setRecordingTimeLeft(MAX_RECORD_TIME);
    setCountdown(0);

    // Auto-hide question after 10 seconds
    hideQuestionRef.current = setTimeout(() => {
      setQuestionPermanent(pinned => {
        if (!pinned) setQuestionVisible(false);
        return pinned;
      });
      setCountdown(3);
    }, QUESTION_VISIBLE_DURATION);

    return () => {
      clearTimeout(hideQuestionRef.current);
      clearInterval(timerRef.current);
      clearTimeout(countdownRef.current);
    };
  }, [currentPage]);

  // Handle 3s countdown
  useEffect(() => {
    if (countdown > 0 && !isRecording && !isFinished) {
      countdownRef.current = setTimeout(() => {
        if (countdown === 1) {
            handleStartRecord();
        } else {
            setCountdown(c => c - 1);
        }
      }, 1000);
    }
    return () => clearTimeout(countdownRef.current);
  }, [countdown, isRecording, isFinished]);

  // Countdown timer when recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRecording(false);
            setIsFinished(true);
            setAnswers(a => ({ ...a, [currentQuestion.id]: 'recorded' }));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, currentQuestion.id]);

  const handleStartRecord = () => {
    setIsRecording(true);
    setIsFinished(false);
    setRecordingTimeLeft(MAX_RECORD_TIME);
    setCountdown(0);
  };

  const handleStopRecord = () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsFinished(true);
    setAnswers(a => ({ ...a, [currentQuestion.id]: 'recorded' }));
  };

  const handleShowQuestion = () => {
    setQuestionVisible(true);
    setQuestionPermanent(true);
    clearTimeout(hideQuestionRef.current);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleSubmit = () => setShowSubmitModal(true);

  const handleConfirmSubmit = () => {
    saveSpeakingPartAnswers('part1', answers);
    setShowSubmitModal(false);
    if (isFullTest) {
      navigate(`/speaking/test/part2?testId=${testId}&isFull=true`);
    } else {
      navigate(`/speaking/result?testId=${testId}&isFull=false&part=1`);
    }
  };

  const submitLabel = isFullTest ? 'Next Part' : 'Submit';
  const showQuestionText = questionVisible || questionPermanent;

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        {/* Header — part title only, no red skill label */}
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 1: Sentence comprehension</div>
        </div>

        <InstructionBlock title={`Question ${currentPage} of ${totalPages}`}>
          In this part, I'm going to ask you three short questions about yourself and your interests.
          You will have 30 seconds to reply to each question. Begin speaking when you are ready.
        </InstructionBlock>

        {/* Question card */}
        <div className={styles.questionCard}>
          <div className={styles.questionHeader}>
            <div className={styles.questionNumberBox}>
              <span className={styles.questionNumber}>{currentQuestion.id}</span>
            </div>
            {showQuestionText ? (
              <div className={styles.questionText}>{currentQuestion.text}</div>
            ) : (
              <button className={styles.showQuestionBtn} onClick={handleShowQuestion}>
                Show question
              </button>
            )}
          </div>
        </div>

        {/* Recorder — full width, centered below question */}
        <div className={styles.recorderWrapper}>
          <MockAudioRecorder
            isRecording={isRecording}
            isFinished={isFinished}
            timeLeft={recordingTimeLeft}
            maxTime={MAX_RECORD_TIME}
            onStartRecord={handleStartRecord}
            onStopRecord={handleStopRecord}
            countdownBeforeStart={countdown}
          />
        </div>
      </div>

      <TestFooter
        partLabel="Part 1"
        questions={PART1_QUESTIONS}
        answeredIds={Object.keys(answers)}
        currentPageQuestionIds={[currentQuestion.id]}
        onQuestionClick={(qId) => setCurrentPage(qId)}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
        onSubmitClick={handleSubmit}
        submitLabel={submitLabel}
        hasPrev={currentPage > 1}
        hasNext={currentPage < totalPages}
      />

      <SubmitModal
        isOpen={showSubmitModal}
        onBack={() => setShowSubmitModal(false)}
        onNext={handleConfirmSubmit}
      />
    </div>
  );
}
