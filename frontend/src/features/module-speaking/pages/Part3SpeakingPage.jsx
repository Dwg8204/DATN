import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MockAudioRecorder from '../../../components/shared/MockAudioRecorder/MockAudioRecorder';
import { getSpeakingTestParts } from '../services/speakingTestRepository';
import { saveSpeakingPartAnswers } from '../utils/speakingSessionStorage';
import styles from './Part3SpeakingPage.module.css';
import RichTextContent from '../../../components/common/RichTextContent';

const QUESTION_VISIBLE_DURATION = 10000;
const MAX_RECORD_TIME = 45;

export default function Part3SpeakingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';
  const partData = getSpeakingTestParts(testId).part3;
  const PART3_QUESTIONS = partData.questions;
  const [picture1, picture2] = partData.imageUrls;

  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [questionVisible, setQuestionVisible] = useState(true);
  const [questionPermanent, setQuestionPermanent] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(MAX_RECORD_TIME);
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef(null);
  const hideQuestionRef = useRef(null);
  const countdownRef = useRef(null);
  const totalPages = PART3_QUESTIONS.length;
  const currentQuestion = PART3_QUESTIONS[currentPage - 1];

  useEffect(() => {
    setQuestionVisible(true);
    setQuestionPermanent(false);
    setIsRecording(false);
    setIsFinished(false);
    setRecordingTimeLeft(MAX_RECORD_TIME);
    setCountdown(0);

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
    saveSpeakingPartAnswers('part3', answers);
    setShowSubmitModal(false);
    if (isFullTest) {
      navigate(`/speaking/test/part4?testId=${testId}&isFull=true`);
    } else {
      navigate(`/speaking/result?testId=${testId}&isFull=false&part=3`);
    }
  };

  const submitLabel = isFullTest ? 'Next Part' : 'Submit';
  const showQuestionText = questionVisible || questionPermanent;

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 3: Describe, compare and provide reasons and explanations</div>
        </div>

        <InstructionBlock title={`Question ${currentPage} of ${totalPages}`}>
          In this part, I'm going to ask you to compare two pictures.
          You will have 45 seconds to reply to each question. Begin speaking when you are ready.
        </InstructionBlock>

        <div className={styles.mainArea}>
          {/* Left column: question + 2 pictures side by side */}
          <div className={styles.leftCol}>
            <div className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <div className={styles.questionNumberBox}>
                  <span className={styles.questionNumber}>{currentQuestion.id}</span>
                </div>
                {showQuestionText ? (
                  <RichTextContent className={styles.questionText} value={currentQuestion.text}/>
                ) : (
                  <button className={styles.showQuestionBtn} onClick={handleShowQuestion}>
                    Show question
                  </button>
                )}
              </div>
            </div>

            <div className={styles.imagesRow}>
              <img src={picture1} alt="Reference 1" className={styles.pictureImg} />
              <img src={picture2} alt="Reference 2" className={styles.pictureImg} />
            </div>
          </div>

          {/* Right column: recorder */}
          <div className={styles.recorderSection}>
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
      </div>

      <TestFooter
        partLabel="Part 3"
        questions={PART3_QUESTIONS}
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
