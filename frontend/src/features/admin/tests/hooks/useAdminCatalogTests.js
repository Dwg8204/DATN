import { useEffect, useState } from 'react';
import { getApiError } from '../../../../services/apiError.js';

const EMPTY = { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
const statusLabel = value => value === 'PUBLISHED' ? 'Published' : value === 'DRAFT' ? 'Draft' : 'Archived';

export default function useAdminCatalogTests({ enabled, api, label, search, mode, purpose, status, page, pageSize }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ data: [], pagination: EMPTY, loading: false, error: '' });
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState(current => ({ ...current, loading: true, error: '' }));
      api.list({ search, mode, purpose, status, page, pageSize, signal: controller.signal })
        .then(result => {
          const rows = result.tests ?? result.data ?? [];
          const totalItems = result.total ?? result.pagination?.totalItems ?? rows.length;
          setState({ data: rows.map(test => ({ ...test, status: statusLabel(test.status), details: test.status !== 'ARCHIVED' })),
            pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) }, loading: false, error: '' });
        }).catch(error => {
          if (error.code !== 'ERR_CANCELED') setState({ data: [], pagination: EMPTY, loading: false,
            error: getApiError(error, `Unable to load ${label} tests.`) });
        });
    }, search?.trim() ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [api, enabled, label, mode, page, pageSize, purpose, revision, search, status]);
  return { ...state, reload: () => setRevision(value => value + 1) };
}
