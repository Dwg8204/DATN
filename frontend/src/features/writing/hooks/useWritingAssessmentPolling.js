import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../services/apiError';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import api from '../../../services/api';

export function useWritingAssessmentPolling(attemptId) {
  const [params] = useSearchParams();
  const practice = params.get('practice') === 'true';
  const attemptsApi = practice ? practiceAttemptsApi : testAttemptsApi;
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: '' });
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const key = `${attemptId}:${practice}`;
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  useEffect(() => {
    if (!attemptId) return undefined;
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer;
    let pending = false;
    let lastData;
    let count = 0;
    const read = async () => {
      if (pending || controller.signal.aborted || document.hidden) return;
      pending = true;
      try {
        const data = await attemptsApi.result(attemptId, controller.signal);
        if (controller.signal.aborted) return;
        if (data.component !== 'WRITING') throw new Error('This result belongs to another skill.');
        lastData = data;
        setState({ key, data, error: '' });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((previous) =>
          previous.key === key && previous.data
            ? previous
            : {
                key,
                data: null,
                error: normalizeApiError(error, 'Unable to load the Writing result.').message,
              },
        );
      } finally {
        pending = false;
        if (
          !controller.signal.aborted &&
          Date.now() - startedAt < 120000 &&
          (!lastData ||
            (['QUEUED', 'PROCESSING'].includes(lastData.gradingStatus) &&
              lastData.assessment?.enabled !== false))
        ) {
          timer = window.setTimeout(read, Math.min(10000, 3000 + count++ * 1000));
        }
      }
    };
    const visible = () => {
      window.clearTimeout(timer);
      if (!document.hidden) void read();
    };
    document.addEventListener('visibilitychange', visible);
    void read();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [attemptId, attemptsApi, key, refreshKey]);
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
      refresh();
    } catch {
      setRetryError('writingAi.retryError');
    } finally {
      setRetrying(false);
    }
  }, [attemptId, practice, refresh, retrying]);
  return {
    data: state.key === key ? state.data : null,
    loading: !!attemptId && state.key !== key,
    error: !attemptId ? 'The test session is missing.' : state.key === key ? state.error : '',
    refresh,
    retry,
    retrying,
    retryError,
  };
}
