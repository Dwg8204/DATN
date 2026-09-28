import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../services/apiError.js';
import { testAttemptsApi } from '../services/testAttemptsApi.js';
import { practiceAttemptsApi } from '../services/practiceAttemptsApi.js';

function ensureComponent(data, expectedComponent) {
  if (expectedComponent && data.component !== expectedComponent) throw new Error('This result belongs to another skill.');
  return data;
}

export function useAttemptResult(attemptId, expectedComponent) {
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const attemptsApi = isPractice ? practiceAttemptsApi : testAttemptsApi;
  const [state, setState] = useState({ requestKey: null, data: null, error: '' });
  useEffect(() => {
    if (!attemptId) {
      return undefined;
    }
    const controller = new AbortController();
    attemptsApi.result(attemptId, controller.signal)
      .then(data => setState({ requestKey: attemptId, data: ensureComponent(data, expectedComponent), error: '' }))
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setState({ requestKey: attemptId, data: null,
          error: normalizeApiError(error, 'Unable to load the test result.').message });
      });
    return () => controller.abort();
  }, [attemptId, attemptsApi, expectedComponent]);
  if (!attemptId) return { data: null, loading: false, error: 'The test session is missing.' };
  return state.requestKey === attemptId
    ? { data: state.data, loading: false, error: state.error }
    : { data: null, loading: true, error: '' };
}

export function useAttemptPartResult(attemptId, partNumber, expectedComponent) {
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const attemptsApi = isPractice ? practiceAttemptsApi : testAttemptsApi;
  const requestKey = attemptId && partNumber ? `${attemptId}:${partNumber}` : null;
  const [state, setState] = useState({ requestKey: null, data: null, error: '' });
  useEffect(() => {
    if (!attemptId || !partNumber) {
      return undefined;
    }
    const controller = new AbortController();
    attemptsApi.partResult(attemptId, partNumber, controller.signal)
      .then(data => setState({ requestKey, data: ensureComponent(data, expectedComponent), error: '' }))
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setState({ requestKey, data: null,
          error: normalizeApiError(error, 'Unable to load detailed answers.').message });
      });
    return () => controller.abort();
  }, [attemptId, attemptsApi, expectedComponent, partNumber, requestKey]);
  if (!requestKey) return { data: null, loading: false, error: '' };
  return state.requestKey === requestKey
    ? { data: state.data, loading: false, error: state.error }
    : { data: null, loading: true, error: '' };
}
