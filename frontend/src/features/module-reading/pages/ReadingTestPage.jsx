import React, { useEffect, useContext, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ReadingTestContext } from '../context/ReadingTestContext';
import TestFooter from '../../../components/layout/TestFooter';
import InstructionBlock from '../../../components/common/InstructionBlock';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { getReadingRemainingSeconds, getReadingDuration } from '../utils/readingSessionStorage';

import Part1GapFilling from '../components/test-engine/parts/Part1GapFilling';
import Part2TextCohesion from '../components/test-engine/parts/Part2TextCohesion';
import Part3OpinionMatch from '../components/test-engine/parts/Part3OpinionMatch';
import Part4MatchHeading from '../components/test-engine/parts/Part4MatchHeading';

import styles from './ReadingTestPage.module.css';

export default function ReadingTestPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'full';

  const { 
    testData, setTestData, 
    currentPart, setCurrentPart,
    setIsStarted, setTimeLeft,
    answers
  } = useContext(ReadingTestContext);

  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const data = await import('../services/mockData/testData.json');
        setTimeout(() => {
          setTestData(data.default || data);
          setIsStarted(true);
          
          let initialPart = 1;
          if (mode === 'part1') initialPart = 1;
          else if (mode === 'part2') initialPart = 2;
          else if (mode === 'part3') initialPart = 3;
          else if (mode === 'part4') initialPart = 4;
          
          setCurrentPart(initialPart);
          setLoading(false);
        }, 400);
      } catch (error) {
        console.error("Failed to load test data", error);
        setLoading(false);
      }
    };
    
    fetchTestData();

    return () => {
      setIsStarted(false);
    };
  }, [testId, setTestData, setIsStarted, setCurrentPart, mode]);

  // Dynamic automatic timeout submission
  useEffect(() => {
    const checkTimer = setInterval(() => {
      const remaining = getReadingRemainingSeconds();
      if (remaining === 0) {
        clearInterval(checkTimer);
        confirmSubmit();
      }
    }, 1000);
    return () => clearInterval(checkTimer);
  }, [answers, mode, testId]);

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const confirmSubmit = () => {
    const fakeSessionId = 'sess-' + Math.random().toString(36).substr(2, 9);
    const duration = getReadingDuration(mode);
    const timeLeft = getReadingRemainingSeconds();

    const sessionData = {
      testId: testId || 'apt-r-001',
      answers: answers,
      timeSpent: duration - timeLeft,
      mode: mode,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(fakeSessionId, JSON.stringify(sessionData));
    setShowSubmitModal(false);
    navigate(`/reading/result/${fakeSessionId}`);
  };

  const handleNextPart = () => {
    if (currentPart < 4) setCurrentPart(currentPart + 1);
  };
  
  const handlePrevPart = () => {
    if (currentPart > 1) setCurrentPart(currentPart - 1);
  };

  const handleFooterSubmit = () => {
    if (mode === 'full' && currentPart < 4) {
      handleNextPart();
    } else {
      handleSubmit();
    }
  };

  const renderCurrentPart = () => {
    switch (currentPart) {
      case 1: return <Part1GapFilling data={testData.part1} />;
      case 2: return <Part2TextCohesion data={testData.part2} />;
      case 3: return <Part3OpinionMatch data={testData.part3} />;
      case 4: return <Part4MatchHeading data={testData.part4} />;
      default: return <Part1GapFilling data={testData.part1} />;
    }
  };

  const getFooterData = () => {
    let footerQuestions = [];
    let currentQuestionIds = [];
    let answeredIds = [];

    if (currentPart === 1) {
      footerQuestions = [1, 2, 3, 4, 5].map(id => ({ id }));
      currentQuestionIds = [1, 2, 3, 4, 5];
      answeredIds = [1, 2, 3, 4, 5]
        .filter(idx => answers[`p1-q${idx}`])
        .map(String);
    } else if (currentPart === 2) {
      footerQuestions = [6, 7, 8, 9, 10].map(id => ({ id }));
      currentQuestionIds = [6, 7, 8, 9, 10];
      const part2Answers = [2, 3, 4, 5, 6].map(pos => {
        const sentenceId = Object.keys(answers).find(key => key.startsWith('s') && answers[key] === pos);
        return sentenceId ? true : false;
      });
      answeredIds = [6, 7, 8, 9, 10]
        .filter((_, idx) => part2Answers[idx])
        .map(String);
    } else if (currentPart === 3) {
      footerQuestions = [11, 12, 13, 14, 15, 16, 17].map(id => ({ id }));
      currentQuestionIds = [11, 12, 13, 14, 15, 16, 17];
      answeredIds = [11, 12, 13, 14, 15, 16, 17]
        .filter(id => answers[`p3-q${id - 10}`])
        .map(String);
    } else if (currentPart === 4) {
      footerQuestions = [18, 19, 20, 21, 22, 23, 24].map(id => ({ id }));
      currentQuestionIds = [18, 19, 20, 21, 22, 23, 24];
      answeredIds = [18, 19, 20, 21, 22, 23, 24]
        .filter(id => answers[`para${id - 17}`])
        .map(String);
    }

    return { footerQuestions, currentQuestionIds, answeredIds };
  };

  const getHeaderInfo = () => {
    switch (currentPart) {
      case 1:
        return {
          title: 'Part 1',
          skill: 'Reading Test',
          range: 'Questions 1-5',
          instruction: 'Read the short text. Choose a word from the list to complete the text. The first one is done for you.'
        };
      case 2:
        return {
          title: 'Part 2',
          skill: 'Reading Test',
          range: 'Questions 6-10',
          instruction: 'The sentences below are from a report. Put the sentences in the right order. The first sentence is done for you.'
        };
      case 3:
        return {
          title: 'Part 3',
          skill: 'Reading Test',
          range: 'Questions 11-17',
          instruction: 'Four people respond in the comments section of an online magazine article about advanced level tests. Read the texts and then answer the questions below.'
        };
      case 4:
        return {
          title: 'Part 4',
          skill: 'Reading Test',
          range: 'Questions 18-24',
          instruction: 'Read the passage quickly. Choose a heading for each numbered paragraph (1 - 7) from the drop-down box. There is one more heading than you need.'
        };
      default:
        return {
          title: 'Part 1',
          skill: 'Reading Test',
          range: 'Questions 1-5',
          instruction: 'Read the short text. Choose a word from the list to complete the text.'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A11D33]"></div>
      </div>
    );
  }

  const { footerQuestions, currentQuestionIds, answeredIds } = getFooterData();
  const headerInfo = getHeaderInfo();
  const submitLabel = (mode === 'full' && currentPart < 4) ? 'Next Part' : 'Submit';

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <div className={styles.headerBlock}>
          <div className={styles.partTitle}>{headerInfo.title}</div>
          <div className={styles.skillTitle}>{headerInfo.skill}</div>
        </div>

        <InstructionBlock title={headerInfo.range}>
          {headerInfo.instruction}
        </InstructionBlock>

        <div className={styles.mainArea}>
          {renderCurrentPart()}
        </div>
      </div>

      <TestFooter 
        partLabel={`Part ${currentPart}`}
        questions={footerQuestions}
        answeredIds={answeredIds}
        currentPageQuestionIds={currentQuestionIds}
        onQuestionClick={() => {}}
        onPrevClick={handlePrevPart}
        onNextClick={handleNextPart}
        onSubmitClick={handleFooterSubmit}
        submitLabel={submitLabel}
      />

      <SubmitModal 
        isOpen={showSubmitModal}
        onBack={() => setShowSubmitModal(false)}
        onNext={confirmSubmit}
      />
    </div>
  );
}
