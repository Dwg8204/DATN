import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import api from '../../../services/api';
import { useAssessmentPolling } from '../../test-attempts/hooks/useAssessmentPolling';

export function useWritingAssessmentPolling(attemptId) {
  const [params] = useSearchParams();
  const practice = params.get('practice') === 'true';
  const attemptsApi = practice ? practiceAttemptsApi : testAttemptsApi;
  const polling = useAssessmentPolling(attemptId, attemptsApi, 'WRITING', practice);
  const { refresh } = polling;
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [runKey, setRunKey] = useState(0);
  const retry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    setRetryError('');
    try {
      await api.post(
        `/${practice ? 'practice-attempts' : 'test-attempts'}/${attemptId}/assessment/retry`,
        {},
        { notifyOnError: false },
      );
      setRunKey(value => value + 1);
      refresh();
    } catch {
      setRetryError('writingAi.retryError');
    } finally {
      setRetrying(false);
    }
  }, [attemptId, practice, refresh, retrying]);
  return { ...polling, retry, retrying, retryError, runKey, attemptId };
}
