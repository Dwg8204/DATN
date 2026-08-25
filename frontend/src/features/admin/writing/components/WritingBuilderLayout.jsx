import { Outlet } from 'react-router-dom';
import { WritingTestBuilderProvider } from '../context/WritingTestBuilderContext';

function BuilderContent() {
  return <Outlet />;
}

export default function WritingBuilderLayout() { return <WritingTestBuilderProvider><BuilderContent /></WritingTestBuilderProvider>; }
