import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { WritingTestBuilderProvider } from '../context/WritingTestBuilderContext';
import { createWritingTestDraft } from '../data/writingBuilderInitialState';
import { writingTestsApi } from '../services/writingTestsApi';
import { getApiError } from '../../../../services/apiError';

function BuilderContent() {
  return <Outlet />;
}

export default function WritingBuilderLayout() {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [params] = useSearchParams();
  const requestedMode = ['part1', 'part2', 'part3', 'part4', 'full'].includes(params.get('mode')) ? params.get('mode') : 'full';
  const [state, setState] = useState(() => testId
    ? { test: null, loading: true, error: '' }
    : { test: createWritingTestDraft(requestedMode), loading: false, error: '' });
  useEffect(() => {
    if (!testId) {
      setState({ test: createWritingTestDraft(requestedMode), loading: false, error: '' });
      return undefined;
    }
    const controller = new AbortController();
    writingTestsApi.getAdmin(testId, controller.signal)
      .then(test => setState({ test, loading: false, error: '' }))
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setState({ test: null, loading: false, error: getApiError(error, 'Unable to load this Writing test.') });
      });
    return () => controller.abort();
  }, [requestedMode, testId]);
  if (state.loading) return <p style={{ padding: 24 }}>Loading Writing test…</p>;
  if (state.error || !state.test) return <section style={{ padding: 24 }}><p>{state.error || 'Writing test not found.'}</p><button onClick={() => navigate('/admin/tests')}>Back to Test Management</button></section>;
  const basePath = state.test.id ? `/admin/tests/writing/${state.test.id}/edit` : '/admin/tests/new/writing';
  return <WritingTestBuilderProvider key={state.test.id || `new-${requestedMode}`} initialTest={state.test} basePath={basePath}><BuilderContent /></WritingTestBuilderProvider>;
}
