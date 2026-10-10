import { useEffect, useState } from 'react';
import { getApiError } from '../../../../services/apiError';
import { adminUsersApi } from '../services/adminUsersApi';

const EMPTY_PAGINATION = { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 };

export default function useManagedUsers({ role, search, page, pageSize }) {
  const [state, setState] = useState({
    users: [],
    pagination: { ...EMPTY_PAGINATION, page, pageSize },
    loading: true,
    error: '',
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const delay = search.trim() ? 300 : 0;
    setState(current => ({ ...current, users: [], loading: true, error: '' }));

    const timer = window.setTimeout(async () => {
      try {
        const result = await adminUsersApi.list({ role, search, page, pageSize, signal: controller.signal });
        setState({ users: result.data ?? [], pagination: result.pagination ?? EMPTY_PAGINATION, loading: false, error: '' });
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        setState(current => ({
          ...current,
          loading: false,
          error: getApiError(error, 'Unable to load accounts. Please try again.'),
        }));
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [role, search, page, pageSize, revision]);

  return {
    ...state,
    reload: () => setRevision(value => value + 1),
  };
}
