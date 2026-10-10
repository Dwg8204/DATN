import { createContext, useCallback, useState } from 'react';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import { part2PlacementChanges } from '../utils/part2Placement.js';

export const ReadingTestContext = createContext(null);
const READING_TEST_QUERY_SCHEMA = { currentPart: { ...queryParam.positiveInt(1, 4), param: 'part' } };

export const ReadingTestProvider = ({ children }) => {
  const [testData, setTestData] = useState(null);
  const [urlState, setUrlState] = useUrlQueryState(READING_TEST_QUERY_SCHEMA);
  const { currentPart } = urlState;
  const setCurrentPart = useCallback(next => setUrlState(current => ({ currentPart: typeof next === 'function' ? next(current.currentPart) : next })), [setUrlState]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(35 * 60); // 35 phút
  const [isStarted, setIsStarted] = useState(false);
  
  // Hàm chọn đáp án
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  const handleSentencePlacement = (sentenceId, position, sentences) => {
    setAnswers(previous => ({ ...previous, ...part2PlacementChanges(sentences, previous, sentenceId, position) }));
  };
  
  const value = {
    testData,
    setTestData,
    currentPart,
    setCurrentPart,
    answers,
    handleAnswerChange,
    handleSentencePlacement,
    timeLeft,
    setTimeLeft,
    isStarted,
    setIsStarted,
  };

  return (
    <ReadingTestContext.Provider value={value}>
      {children}
    </ReadingTestContext.Provider>
  );
};
