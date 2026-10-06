import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import usePersistentBuilder from '../../shared-test-builder/usePersistentBuilder';
import BuilderDraftStatus from '../../shared-test-builder/BuilderDraftStatus';

const Context = createContext(null);
export const useReadingBuilder = () => useContext(Context);

export default function ReadingBuilderLayout() {
  const builder = usePersistentBuilder('reading');
  return <BuilderDraftStatus builder={builder}>
    <Context.Provider value={builder}><Outlet /></Context.Provider>
  </BuilderDraftStatus>;
}
