import React, { useEffect, useContext, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ReadingTestContext } from '../context/ReadingTestContext';
import TestFooter from '../../../components/layout/TestFooter';
import InstructionBlock from '../../../components/common/InstructionBlock';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal';
import { getReadingRemainingSeconds, getReadingDuration } from '../utils/readingSessionStorage';
import { saveHistoryEntry } from '../../../utils/historyStorage';

import Part1GapFilling from '../components/test-engine/parts/Part1GapFilling';
import Part2TextCohesion from '../components/test-engine/parts/Part2TextCohesion';
import Part3OpinionMatch from '../components/test-engine/parts/Part3OpinionMatch';
import Part4MatchHeading from '../components/test-engine/parts/Part4MatchHeading';

import styles from './ReadingTestPage.module.css';
import {loadReadingTest} from '../services/readingTestRepository';
import { useToast } from '../../../context/ToastContext';
import DataLoadError from '../../../components/common/DataLoadError';
import { getPart2Texts } from '../utils/part2Texts';

export default function ReadingTestPage() {
  const { showError } = useToast();
  const { testId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasPartParam = searchParams.has('part');
  const mode = searchParams.get('mode') || 'full';

  const { 
    testData, setTestData, 
    currentPart, setCurrentPart,
    setIsStarted, setTimeLeft,
    answers
  } = useContext(ReadingTestContext);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchTestData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await loadReadingTest(testId);
        if (cancelled) return;
          setTestData(data);
          setIsStarted(true);
          
          let initialPart = 1;
          if (mode === 'part1') initialPart = 1;
          else if (mode === 'part2') initialPart = 2;
          else if (mode === 'part3') initialPart = 3;
          else if (mode === 'part4') initialPart = 4;
          
          if (!hasPartParam) setCurrentPart(initialPart);
          setLoading(false);
      } catch {
        if (cancelled) return;
        const message = 'We could not load this Reading test. Please refresh the page and try again.';
        setLoadError(message);
        setIsStarted(false);
        showError(message);
        setLoading(false);
      }
    };
    
    fetchTestData();

    return () => {
      cancelled = true;
      setIsStarted(false);
    };
  }, [hasPartParam, mode, setCurrentPart, setIsStarted, setTestData, showError, testId]);

  // Dynamic automatic timeout submission
  useEffect(() => {
    if (loading || loadError || !testData) return;
    const checkTimer = setInterval(() => {
      const remaining = getReadingRemainingSeconds();
      if (remaining === 0) {
        clearInterval(checkTimer);
        confirmSubmit();
      }
    }, 1000);
    return () => clearInterval(checkTimer);
  }, [answers, mode, testId, loading, loadError, testData]);

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const confirmSubmit = () => {
    const fakeSessionId = 'sess-' + Math.random().toString(36).substr(2, 9);
    const duration = getReadingDuration(mode);
    const timeLeft = getReadingRemainingSeconds();
    const historyId = `hist_${Date.now()}_${fakeSessionId}`;

    const sessionData = {
      testSnapshot: testData,
      testId: testId || 'apt-r-001',
      answers: answers,
      timeSpent: duration - timeLeft,
      mode: mode,
      timestamp: new Date().toISOString(),
      historyId
    };
    try {
      localStorage.setItem(fakeSessionId, JSON.stringify(sessionData));
    } catch {
      showError('Your answers could not be saved on this browser. Free some browser storage and submit again. Keep this page open to avoid losing your work.');
      return;
    }

    // Save draft history entry (missing correct/wrong scores)
    saveHistoryEntry({
      id: historyId,
      skill: 'reading',
      testId: String(sessionData.testId),
      testName: `Aptis Reading Test ${sessionData.testId}`,
      mode: mode,
      submittedAt: sessionData.timestamp,
      timeSpent: 'Pending...',
      correct: 0,
      wrong: 0,
      skipped: 0,
      total: 0,
      partScores: [],
      reviewUrl: `/reading/result/${fakeSessionId}`
    });

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
      const gapSentences = getPart2Texts(testData.part2).flatMap(text => text.sentences.filter(sentence => sentence.correctPosition > 1));
      footerQuestions = gapSentences.map((_, index) => ({ id: index + 6 }));
      currentQuestionIds = footerQuestions.map(question => question.id);
      answeredIds = currentQuestionIds
        .filter((_, index) => answers[gapSentences[index].id])
        .map(String);
    } else if (currentPart === 3) {
      footerQuestions = [16, 17, 18, 19, 20, 21, 22].map(id => ({ id }));
      currentQuestionIds = [16, 17, 18, 19, 20, 21, 22];
      answeredIds = currentQuestionIds
        .filter(id => answers[`p3-q${id - 15}`])
        .map(String);
    } else if (currentPart === 4) {
      footerQuestions = [23, 24, 25, 26, 27, 28, 29].map(id => ({ id }));
      currentQuestionIds = [23, 24, 25, 26, 27, 28, 29];
      answeredIds = currentQuestionIds
        .filter(id => answers[`para${id - 22}`])
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
          range: 'Questions 6-15',
          instruction: 'Arrange the sentences in each of the two texts. The first sentence of each text is done for you.'
        };
      case 3:
        return {
          title: 'Part 3',
          skill: 'Reading Test',
          range: 'Questions 16-22',
          instruction: 'Four people respond in the comments section of an online magazine article about advanced level tests. Read the texts and then answer the questions below.'
        };
      case 4:
        return {
          title: 'Part 4',
          skill: 'Reading Test',
          range: 'Questions 23-29',
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

  if (loadError || !testData) {
    return <DataLoadError title="Reading test is unavailable" message={loadError || 'This test could not be found. Please return to the test list.'} />;
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
        onQuestionClick={(questionId) => {
          const element = document.getElementById(`question-${questionId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-yellow-100');
            setTimeout(() => {
              element.classList.remove('bg-yellow-100');
            }, 1500);
          }
        }}
        onPrevClick={handlePrevPart}
        onNextClick={handleNextPart}
        onSubmitClick={handleFooterSubmit}
        submitLabel={submitLabel}
        hasPrev={currentPart > 1}
        hasNext={currentPart < 4}
      />

      <SubmitModal 
        isOpen={showSubmitModal}
        onBack={() => setShowSubmitModal(false)}
        onNext={confirmSubmit}
      />
    </div>
  );
}
