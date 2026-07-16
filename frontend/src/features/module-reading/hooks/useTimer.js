import { useState, useEffect, useContext, useCallback } from 'react';
import { ReadingTestContext } from '../context/ReadingTestContext';
import { useNavigate } from 'react-router-dom';

export const useTimer = (initialTime, onTimeUp) => {
  const { timeLeft, setTimeLeft, isStarted } = useContext(ReadingTestContext);
  const navigate = useNavigate();

  useEffect(() => {
    let timerId;
    
    if (isStarted && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerId);
            if (onTimeUp) onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isStarted) {
       if (onTimeUp) onTimeUp();
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isStarted, timeLeft, setTimeLeft, onTimeUp]);

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeLeft,
    formattedTime: formatTime(timeLeft),
    isWarning: timeLeft <= 300 // 5 minutes warning
  };
};
