import { Outlet } from 'react-router-dom';
import { GrammarTestBuilderProvider } from '../context/GrammarTestBuilderContext';
import usePersistentBuilder from '../../shared-test-builder/usePersistentBuilder';
import BuilderDraftStatus from '../../shared-test-builder/BuilderDraftStatus';

export default function GrammarBuilderLayout() {
  const builder = usePersistentBuilder('grammar');
  return <BuilderDraftStatus builder={builder}>
    <GrammarTestBuilderProvider builder={builder}><Outlet /></GrammarTestBuilderProvider>
  </BuilderDraftStatus>;
}
