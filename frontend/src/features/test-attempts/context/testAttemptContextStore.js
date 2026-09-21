import { createContext, useContext } from 'react';

export const TestAttemptContext = createContext(null);

export function useTestAttempt() {
  const value = useContext(TestAttemptContext);
  if (!value) throw new Error('useTestAttempt must be used inside TestAttemptProvider.');
  return value;
}
