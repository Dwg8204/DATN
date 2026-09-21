import { useCallback, useEffect, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { GrammarTestBuilderProvider } from '../context/GrammarTestBuilderContext';
import { createGrammarTestDraft } from '../data/grammarTestData';
import { grammarTestsApi } from '../services/grammarTestsApi';
import { getApiError } from '../../../../services/apiError';

export default function GrammarBuilderLayout() {
  const { testId } = useParams();
  const [params] = useSearchParams();
  const mode = ['part1', 'part2', 'full'].includes(params.get('mode')) ? params.get('mode') : 'full';
  const [state, setState] = useState(() => testId
    ? { test: null, loading: true, error: '' }
    : { test: createGrammarTestDraft(mode), loading: false, error: '' });

  useEffect(() => {
    if (!testId) {
      setState({ test: createGrammarTestDraft(mode), loading: false, error: '' });
      return undefined;
    }
    const controller = new AbortController();
    setState({ test: null, loading: true, error: '' });
    grammarTestsApi.getAdmin(testId, controller.signal)
      .then(test => setState({ test, loading: false, error: '' }))
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setState({ test: null, loading: false, error: getApiError(error, 'Unable to load this test.') });
      });
    return () => controller.abort();
  }, [mode, testId]);

  const syncPersistedTest = useCallback(test => setState({ test, loading: false, error: '' }), []);

  if (state.loading) return <div style={{ padding: 32 }}>Loading Grammar &amp; Vocabulary test…</div>;
  if (state.error || !state.test) return <div style={{ padding: 32 }}><h2>Test not found</h2><p>{state.error || 'This test is unavailable.'}</p></div>;
  const basePath = testId ? `/admin/tests/grammar/${testId}/edit` : '/admin/tests/new/grammar';
  return <GrammarTestBuilderProvider key={testId || mode} initialTest={state.test} basePath={basePath} onTestChange={syncPersistedTest}><Outlet /></GrammarTestBuilderProvider>;
}
