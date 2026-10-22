import { useCallback, useEffect, useState } from 'react';
import { normalizeApiError } from '../../../services/apiError.js';

export function useAssessmentPolling(attemptId, api, component, practice = false, poll = true) {
  const key = `${attemptId}:${component}:${practice}:${api.assessmentProvider ?? 'gemini'}`;
  const [state, setState] = useState({ key: null, data: null, error: '', paused: false });
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  useEffect(() => {
    if (!attemptId) return undefined;
    const controller = new AbortController();
    let timer, pending = false, stopped = false, count = 0;
    let started = Date.now(), deadline = started + 300000;
    const read = async () => {
      if (pending || stopped || controller.signal.aborted || document.hidden) return;
      pending = true;
      let again = false;
      try {
        const data = await api.result(attemptId, controller.signal);
        if (controller.signal.aborted) return;
        if (component && data.component !== component) throw new Error('This result belongs to another skill.');
        setState({ key, data, error: '', paused: false });
        const retryAt = Date.parse(data.assessment?.nextRetryAt ?? '');
        if (Number.isFinite(retryAt)) deadline = Math.max(deadline, Math.min(started + 1800000, retryAt + 300000));
        again = poll && ['QUEUED', 'PROCESSING'].includes(data.gradingStatus) && data.assessment?.enabled !== false;
      } catch (error) {
        if (controller.signal.aborted) return;
        setState(previous => ({ key, data: previous.key === key ? previous.data : null,
          error: normalizeApiError(error, 'Không thể kiểm tra kết quả. Hãy kiểm tra kết nối và thử lại.').message, paused: false }));
        again = poll;
      } finally {
        pending = false;
        if (controller.signal.aborted) return;
        if (again && Date.now() < deadline) timer = window.setTimeout(read, Math.min(10000, 3000 + count++ * 1000));
        else {
          stopped = true;
          if (again) setState(previous => ({ ...previous, paused: true }));
        }
      }
    };
    const visible = () => {
      window.clearTimeout(timer);
      if (!document.hidden) {
        stopped = false; started = Date.now(); deadline = started + 300000;
        void read();
      }
    };
    document.addEventListener('visibilitychange', visible);
    void read();
    return () => { controller.abort(); window.clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
  }, [attemptId, api, component, key, poll, refreshKey]);
  return { data: state.key === key ? state.data : null, loading: !!attemptId && state.key !== key,
    error: !attemptId ? 'The test session is missing.' : state.key === key ? state.error : '',
    paused: state.key === key && state.paused, refresh };
}
