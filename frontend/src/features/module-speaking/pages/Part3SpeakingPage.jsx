import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MockAudioRecorder from '../../../components/shared/MockAudioRecorder/MockAudioRecorder';
import { PART3_QUESTIONS } from '../data/part3SpeakingMockData';
import { saveSpeakingPartAnswers } from '../utils/speakingSessionStorage';
import { resizeImage } from '../../../utils/resizeImage';
import picture1 from '../assets/picture.webp';
import picture2 from '../assets/picture2.webp';
import styles from './Part3SpeakingPage.module.css';

const QUESTION_VISIBLE_DURATION = 10000;
const MAX_RECORD_TIME = 45;

export default function Part3SpeakingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

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
  const imagesRowRef = useRef(null);

  const [resizedPic1, setResizedPic1] = useState(picture1);
  const [resizedPic2, setResizedPic2] = useState(picture2);

  useEffect(() => {
    let isMounted = true;
    
    const handleResizeImg = async () => {
      if (!imagesRowRef.current) return;
      const totalWidth = imagesRowRef.current.offsetWidth;
      const height = imagesRowRef.current.offsetHeight;
      if (totalWidth === 0 || height === 0) return;
      
      const widthPerImage = (totalWidth - 12) / 2;
      
      try {
        const [blob1, blob2] = await Promise.all([
          resizeImage(picture1, widthPerImage, height),
          resizeImage(picture2, widthPerImage, height)
        ]);
        if (isMounted) {
          setResizedPic1(URL.createObjectURL(blob1));
          setResizedPic2(URL.createObjectURL(blob2));
        }
      } catch (err) {
        console.error("Failed to resize images:", err);
      }
    };

    const timer = setTimeout(handleResizeImg, 100);
    window.addEventListener('resize', handleResizeImg);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener('resize', handleResizeImg);
    };
  }, []);

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
                  <div className={styles.questionText}>{currentQuestion.text}</div>
                ) : (
                  <button className={styles.showQuestionBtn} onClick={handleShowQuestion}>
                    Show question
                  </button>
                )}
              </div>
            </div>

            <div className={styles.imagesRow} ref={imagesRowRef}>
              <img src={resizedPic1} alt="Reference 1" className={styles.pictureImg} />
              <img src={resizedPic2} alt="Reference 2" className={styles.pictureImg} />
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
