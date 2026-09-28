import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { createReadingDraft } from '../data/readingTestModel';
import { readingTestsApi } from '../services/readingTestsApi';
const Context = createContext(null);
export const useReadingBuilder = () => useContext(Context);
export default function ReadingBuilderLayout() {
  const {
    testId
  } = useParams();
  const [params] = useSearchParams();
  const requestedMode = ['part1', 'part2', 'part3', 'part4'].includes(params.get('mode')) ? params.get('mode') : 'full';
  const requestedPurpose = params.get('purpose') === 'PRACTICE' ? 'PRACTICE' : 'EXAM';
  const [test, setTest] = useState(() => testId ? null : createReadingDraft(requestedPurpose === 'EXAM' ? 'full' : requestedMode, requestedPurpose));
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    if (!testId) return undefined;
    let active = true;
    readingTestsApi.getOne(testId).then(value => { if (active) setTest(value); })
      .catch(() => { if (active) setLoadError('Unable to load this Reading test.'); });
    return () => { active = false; };
  }, [testId]);
  if (loadError) return <p>{loadError} Return to Test Management.</p>;
  if (!test) return <p>Loading Reading test…</p>;
  const basePath = testId ? `/admin/tests/reading/${testId}/edit` : '/admin/tests/new/reading';
  return <Context.Provider value={{
    test,
    setTest,
    basePath
  }}><Outlet /></Context.Provider>;
}
