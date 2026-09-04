import { createContext, useContext, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { createReadingDraft } from '../data/readingTestModel';
import { getStoredReadingTest } from '../data/readingTestStorage';
const Context = createContext(null);
export const useReadingBuilder = () => useContext(Context);
export default function ReadingBuilderLayout() {
  const {
    testId
  } = useParams();
  const [params] = useSearchParams();
  const [initial] = useState(() => testId ? getStoredReadingTest(testId) : createReadingDraft(['part1', 'part2', 'part3', 'part4'].includes(params.get('mode')) ? params.get('mode') : 'full'));
  const [test, setTest] = useState(initial);
  if (!test) return <p>Test not found. Return to Test Management.</p>;
  const basePath = testId ? `/admin/tests/reading/${testId}/edit` : '/admin/tests/new/reading';
  return <Context.Provider value={{
    test,
    setTest,
    basePath
  }}><Outlet /></Context.Provider>;
}
