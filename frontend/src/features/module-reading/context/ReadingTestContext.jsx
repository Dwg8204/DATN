import { createContext, useState, useEffect } from 'react';

export const ReadingTestContext = createContext(null);

export const ReadingTestProvider = ({ children }) => {
  const [testData, setTestData] = useState(null);
  const [currentPart, setCurrentPart] = useState(1);
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
  
  const value = {
    testData,
    setTestData,
    currentPart,
    setCurrentPart,
    answers,
    handleAnswerChange,
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
