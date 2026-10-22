import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import api from '../../../services/api';
import { useAssessmentPolling } from '../../test-attempts/hooks/useAssessmentPolling';
import { referenceAssessmentsApi, selectAssessmentApi } from '../../test-attempts/services/referenceAssessmentsApi.js';

export function useWritingAssessmentPolling(attemptId) {
  const [params] = useSearchParams();
  const practice = params.get('practice') === 'true';
  const provider=params.get('model')==='groq'?'groq':'gemini';
  const attemptsApi = selectAssessmentApi(practice ? practiceAttemptsApi : testAttemptsApi,provider);
  const polling = useAssessmentPolling(attemptId, attemptsApi, 'WRITING', practice);
  const { refresh } = polling;
  const retryKey=`${attemptId}:${practice}:${provider}`;
  const [retryStates,setRetryStates]=useState({});
  const retryState=retryStates[retryKey] ?? {};
  const retrying=!!retryState.retrying;
  const retryError=retryState.error ?? '';
  const runKey=retryState.runKey ?? 0;
  const retry = useCallback(async () => {
    if (retrying) return;
    setRetryStates(previous=>({...previous,[retryKey]:{...previous[retryKey],retrying:true,error:''}}));
    try {
      if(provider==='groq') await referenceAssessmentsApi.retry(attemptId);
      else await api.post(
        `/${practice ? 'practice-attempts' : 'test-attempts'}/${attemptId}/assessment/retry`,
        {},
        { notifyOnError: false },
      );
      setRetryStates(previous=>({...previous,[retryKey]:{...previous[retryKey],runKey:(previous[retryKey]?.runKey ?? 0)+1}}));
      refresh();
    } catch {
      setRetryStates(previous=>({...previous,[retryKey]:{...previous[retryKey],error:'writingAi.retryError'}}));
    } finally {
      setRetryStates(previous=>({...previous,[retryKey]:{...previous[retryKey],retrying:false}}));
    }
  }, [attemptId, practice, provider, refresh, retrying, retryKey]);
  return { ...polling, retry, retrying, retryError, runKey, attemptId };
}
