import { useCallback, useEffect, useState } from 'react';
import { getApiError } from '../../../../services/apiError';
import { adminDashboardApi } from '../services/adminDashboardApi';

export default function useAdminDashboard(period) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ data: null, loadedPeriod: null, loading: true, error: '' });

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setRevision(value => value + 1);
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState(current => ({ ...current, loading: true, error: '' }));
    adminDashboardApi.get(period, controller.signal)
      .then(data => setState({ data, loadedPeriod: period, loading: false, error: '' }))
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') {
          setState(current => ({
            ...current,
            loading: false,
            error: getApiError(error, 'Unable to load dashboard data.'),
          }));
        }
      });
    return () => controller.abort();
  }, [period, revision]);

  const retry = useCallback(() => setRevision(value => value + 1), []);
  return { ...state, data: state.loadedPeriod === period ? state.data : null, retry };
}
