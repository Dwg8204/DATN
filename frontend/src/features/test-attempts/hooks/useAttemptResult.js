import { useAssessmentPolling } from './useAssessmentPolling.js';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../services/apiError.js';
import { testAttemptsApi } from '../services/testAttemptsApi.js';
import { practiceAttemptsApi } from '../services/practiceAttemptsApi.js';
import { selectAssessmentApi } from '../services/referenceAssessmentsApi.js';

function ensureComponent(data, expectedComponent) {
  if (expectedComponent && data.component !== expectedComponent) throw new Error('This result belongs to another skill.');
  return data;
}

export function useAttemptResult(attemptId, expectedComponent) {
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const model=['WRITING','SPEAKING'].includes(expectedComponent)?searchParams.get('model'):null;
  const attemptsApi = selectAssessmentApi(isPractice ? practiceAttemptsApi : testAttemptsApi,model);
  return useAssessmentPolling(attemptId, attemptsApi, expectedComponent, isPractice, expectedComponent === 'SPEAKING');
}

export function useAttemptPartResult(attemptId, partNumber, expectedComponent, refreshKey = 0) {
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const model=['WRITING','SPEAKING'].includes(expectedComponent)?searchParams.get('model'):null;
  const attemptsApi = selectAssessmentApi(isPractice ? practiceAttemptsApi : testAttemptsApi,model);
  const validPart=Number.isInteger(Number(partNumber)) && Number(partNumber)>=1 && Number(partNumber)<=4;
  const requestKey = attemptId && validPart ? `${attemptId}:${partNumber}:${refreshKey}:${attemptsApi.assessmentProvider ?? 'gemini'}` : null;
  const [state, setState] = useState({ requestKey: null, data: null, error: '' });
  useEffect(() => {
    if (!requestKey) {
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
