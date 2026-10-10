import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import usePersistentBuilder from '../../shared-test-builder/usePersistentBuilder';
import BuilderDraftStatus from '../../shared-test-builder/BuilderDraftStatus';

const Context = createContext(null);
export const useListeningBuilder = () => {
  const value = useContext(Context);
  if (!value) throw new Error('useListeningBuilder must be used inside ListeningBuilderLayout');
  return value;
};

export default function ListeningBuilderLayout() {
  const builder = usePersistentBuilder('listening');
  const value = { ...builder,
    updateDetails: (field, next) => builder.setTest(test => ({ ...test, details: { ...test.details, [field]: next } })),
    updatePart: (number, next) => builder.setTest(test => ({ ...test, parts: { ...test.parts, [number]: next } })),
  };
  return <BuilderDraftStatus builder={builder}>
    <Context.Provider value={value}><Outlet /></Context.Provider>
  </BuilderDraftStatus>;
}
