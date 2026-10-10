import { createContext, useContext } from 'react';

export const TestAttemptContext = createContext(null);
export const AttemptTimerContext = createContext(null);

export function useTestAttempt() {
  const value = useContext(TestAttemptContext);
  if (!value) throw new Error('useTestAttempt must be used inside TestAttemptProvider.');
  return value;
}

export function useAttemptTimer() {
  return useContext(AttemptTimerContext);
}
