import { Outlet } from 'react-router-dom';
import { WritingTestBuilderProvider } from '../context/WritingTestBuilderContext';
import usePersistentBuilder from '../../shared-test-builder/usePersistentBuilder';
import BuilderDraftStatus from '../../shared-test-builder/BuilderDraftStatus';

export default function WritingBuilderLayout() {
  const builder = usePersistentBuilder('writing');
  return <BuilderDraftStatus builder={builder}>
    <WritingTestBuilderProvider builder={builder}><Outlet /></WritingTestBuilderProvider>
  </BuilderDraftStatus>;
}
