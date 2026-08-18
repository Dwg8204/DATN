import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TestFooter from '../../../components/layout/TestFooter';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import InstructionBlock from '../../../components/common/InstructionBlock';
import MockAudioRecorder from '../../../components/shared/MockAudioRecorder/MockAudioRecorder';
import { PART4_QUESTIONS } from '../data/part4SpeakingMockData';
import { saveSpeakingPartAnswers } from '../utils/speakingSessionStorage';
import { resizeImage } from '../../../utils/resizeImage';
import picture3 from '../assets/picture3.webp';
import styles from './Part4SpeakingPage.module.css';

const INITIAL_DURATION = 10; // 10 seconds
const THINKING_DURATION = 60; // 60 seconds
const MAX_RECORD_TIME = 120; // 120 seconds (2 minutes)

export default function Part4SpeakingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || '1';
  const isFullTest = searchParams.get('isFull') === 'true';

  const [answers, setAnswers] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Phases: 'initial', 'thinking', 'recording', 'finished'
  const [phase, setPhase] = useState('initial');
  
  // Timer for the current phase
  const [timeLeft, setTimeLeft] = useState(INITIAL_DURATION);
  
  // For the recorder component
  const [isRecording, setIsRecording] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const timerRef = useRef(null);
  const imageSectionRef = useRef(null);
  
  const [resizedPictureUrl, setResizedPictureUrl] = useState(picture3);

  useEffect(() => {
    let isMounted = true;
    
    const handleResizeImg = async () => {
      if (!imageSectionRef.current) return;
      const { offsetWidth, offsetHeight } = imageSectionRef.current;
      if (offsetWidth === 0 || offsetHeight === 0) return;
      
      try {
        const blob = await resizeImage(picture3, offsetWidth, offsetHeight);
        if (isMounted) {
          setResizedPictureUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.error("Failed to resize image:", err);
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

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handlePhaseTransition();
          return 0; // will be updated by transition
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]); // Re-bind when phase changes

  const handlePhaseTransition = () => {
    setPhase(currentPhase => {
      if (currentPhase === 'initial') {
        setTimeLeft(THINKING_DURATION);
        return 'thinking';
      }
      if (currentPhase === 'thinking') {
        setTimeLeft(MAX_RECORD_TIME);
        setIsRecording(true);
        return 'recording';
      }
      if (currentPhase === 'recording') {
        clearInterval(timerRef.current);
        setIsRecording(false);
        setIsFinished(true);
        setAnswers({ 'all': 'recorded' });
        return 'finished';
      }
      return currentPhase;
    });
  };

  const handleStartRecord = () => {
    // If user clicks record during thinking phase, skip to recording
    if (phase === 'thinking') {
      setPhase('recording');
      setTimeLeft(MAX_RECORD_TIME);
      setIsRecording(true);
    }
  };

  const handleStopRecord = () => {
    if (phase === 'recording') {
      setPhase('finished');
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsFinished(true);
      setAnswers({ 'all': 'recorded' });
    }
  };

  const handleSubmit = () => setShowSubmitModal(true);

  const handleConfirmSubmit = () => {
    saveSpeakingPartAnswers('part4', answers);
    setShowSubmitModal(false);
    navigate(`/speaking/result?testId=${testId}&isFull=${isFullTest}`);
  };

  const submitLabel = 'Submit Test';

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>Part 4: Speak on a given topic</div>
        </div>

        <InstructionBlock title={`Question 1 of 1`}>
          In this part, you will have 1 minute to prepare and 2 minutes to speak on a topic.
          Read the questions carefully. You can start recording early if you are ready.
        </InstructionBlock>

        {phase === 'thinking' && (
          <div className={styles.thinkingBanner}>
            Preparation time remaining: <span className={styles.thinkingTime}>00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        )}

        <div className={styles.mainArea}>
          {/* Left column: question + picture */}
          <div className={styles.leftCol}>
            <div className={styles.questionCard}>
              {PART4_QUESTIONS.map((q, idx) => (
                <div key={q.id} className={styles.questionHeader}>
                  <div className={styles.questionNumberBox}>
                    <span className={styles.questionNumber}>{idx + 1}</span>
                  </div>
                  <div className={styles.questionText}>{q.text}</div>
                </div>
              ))}
            </div>
            
            <div className={styles.imageSection} ref={imageSectionRef}>
              <img src={resizedPictureUrl} alt="Reference" className={styles.pictureImg} />
            </div>
          </div>

          {/* Right column: recorder */}

          <div className={styles.recorderSection}>
            <MockAudioRecorder
              isRecording={isRecording}
              isFinished={isFinished}
              timeLeft={phase === 'recording' ? timeLeft : MAX_RECORD_TIME}
              maxTime={MAX_RECORD_TIME}
              onStartRecord={handleStartRecord}
              onStopRecord={handleStopRecord}
            />
          </div>
        </div>
      </div>

      <TestFooter
        partLabel="Part 4"
        questions={[{id: 1}]}
        answeredIds={Object.keys(answers).length > 0 ? ['1'] : []}
        currentPageQuestionIds={['1']}
        onQuestionClick={() => {}}
        onPrevClick={() => {}}
        onNextClick={() => {}}
        onSubmitClick={handleSubmit}
        submitLabel={submitLabel}
        hasPrev={false}
        hasNext={false}
      />

      <SubmitModal
        isOpen={showSubmitModal}
        onBack={() => setShowSubmitModal(false)}
        onNext={handleConfirmSubmit}
      />
    </div>
  );
}
