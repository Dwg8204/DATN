import { useEffect, useState } from 'react';
import { getApiError } from '../../../../services/apiError';
import { grammarTestsApi } from '../services/grammarTestsApi';

const EMPTY = { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };

function displayStatus(status) {
  return status === 'PUBLISHED' ? 'Published' : status === 'DRAFT' ? 'Draft' : 'Archived';
}

export default function useAdminGrammarTests({ enabled, search, mode, status, page, pageSize }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ data: [], pagination: EMPTY, loading: false, error: '' });
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState(current => ({ ...current, loading: true, error: '' }));
      grammarTestsApi.listAdmin({ search, mode, status, page, pageSize, signal: controller.signal })
        .then(result => setState({
          data: (result.data ?? []).map(test => ({ ...test, status: displayStatus(test.status), details: true })),
          pagination: result.pagination ?? { ...EMPTY, page, pageSize },
          loading: false,
          error: '',
        }))
        .catch(error => {
          if (error.code !== 'ERR_CANCELED') setState(current => ({ ...current, data: [], loading: false, error: getApiError(error, 'Unable to load Grammar & Vocabulary tests.') }));
        });
    }, search?.trim() ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [enabled, mode, page, pageSize, revision, search, status]);
  return { ...state, reload: () => setRevision(value => value + 1) };
}

