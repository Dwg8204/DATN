import { useEffect, useState } from 'react';
import { normalizeApiError } from '../../../services/apiError.js';
import { testAttemptsApi } from '../services/testAttemptsApi.js';

export function useAttemptResult(attemptId) {
  const [state, setState] = useState({ requestKey: null, data: null, error: '' });
  useEffect(() => {
    if (!attemptId) {
      return undefined;
    }
    const controller = new AbortController();
    testAttemptsApi.result(attemptId, controller.signal)
      .then(data => setState({ requestKey: attemptId, data, error: '' }))
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setState({ requestKey: attemptId, data: null,
          error: normalizeApiError(error, 'Unable to load the test result.').message });
      });
    return () => controller.abort();
  }, [attemptId]);
  if (!attemptId) return { data: null, loading: false, error: 'The test session is missing.' };
  return state.requestKey === attemptId
    ? { data: state.data, loading: false, error: state.error }
    : { data: null, loading: true, error: '' };
}

export function useAttemptPartResult(attemptId, partNumber) {
  const requestKey = attemptId && partNumber ? `${attemptId}:${partNumber}` : null;
  const [state, setState] = useState({ requestKey: null, data: null, error: '' });
  useEffect(() => {
    if (!attemptId || !partNumber) {
      return undefined;
    }
    const controller = new AbortController();
    testAttemptsApi.partResult(attemptId, partNumber, controller.signal)
      .then(data => setState({ requestKey, data, error: '' }))
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setState({ requestKey, data: null,
          error: normalizeApiError(error, 'Unable to load detailed answers.').message });
      });
    return () => controller.abort();
  }, [attemptId, partNumber, requestKey]);
  if (!requestKey) return { data: null, loading: false, error: '' };
  return state.requestKey === requestKey
    ? { data: state.data, loading: false, error: state.error }
    : { data: null, loading: true, error: '' };
}
