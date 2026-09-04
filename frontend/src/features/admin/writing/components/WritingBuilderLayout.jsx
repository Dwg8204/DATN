import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { WritingTestBuilderProvider } from '../context/WritingTestBuilderContext';
import { createWritingTestDraft } from '../data/writingBuilderInitialState';
import { getStoredWritingTest } from '../data/writingTestStorage';

function BuilderContent() {
  return <Outlet />;
}

export default function WritingBuilderLayout() {
  const { testId } = useParams();
  const [params] = useSearchParams();
  const requestedMode = ['part1', 'part2', 'part3', 'part4', 'full'].includes(params.get('mode')) ? params.get('mode') : 'full';
  const existingTest = testId ? getStoredWritingTest(testId) : null;
  const initialTest = existingTest || createWritingTestDraft(requestedMode);
  const basePath = existingTest ? `/admin/tests/writing/${testId}/edit` : '/admin/tests/new/writing';
  return <WritingTestBuilderProvider initialTest={initialTest} basePath={basePath}><BuilderContent /></WritingTestBuilderProvider>;
}
