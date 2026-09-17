import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { createWritingTestDraft } from '../data/writingBuilderInitialState';
import { writingTestsApi } from '../services/writingTestsApi';

const WritingTestBuilderContext = createContext(null);

function reducer(state, action) {
  if (action.type === 'UPDATE_DETAILS') return { ...state, details: { ...state.details, [action.field]: action.value } };
  if (action.type === 'UPDATE_PART') return { ...state, parts: { ...state.parts, [action.part]: { ...state.parts[action.part], [action.field]: action.value } } };
  if (action.type === 'REPLACE') return action.test;
  if (action.type === 'RESET') return createWritingTestDraft(state.mode);
  return state;
}

export function WritingTestBuilderProvider({ children, initialTest, basePath }) {
  const [state, dispatch] = useReducer(reducer, initialTest || createWritingTestDraft());
  const saveDraft = useCallback(async (candidate = state) => {
    const saved = candidate.id ? await writingTestsApi.update(candidate) : await writingTestsApi.create(candidate);
    dispatch({ type: 'REPLACE', test: saved });
    return saved;
  }, [state]);
  const value = useMemo(() => ({
    test: state,
    updateDetails: (field, value) => dispatch({ type: 'UPDATE_DETAILS', field, value }),
    updatePart: (part, field, value) => dispatch({ type: 'UPDATE_PART', part, field, value }),
    replaceTest: test => dispatch({ type: 'REPLACE', test }),
    saveDraft,
    reset: () => dispatch({ type: 'RESET' }),
    basePath: state.id ? `/admin/tests/writing/${state.id}/edit` : basePath,
  }), [state, basePath, saveDraft]);
  return <WritingTestBuilderContext.Provider value={value}>{children}</WritingTestBuilderContext.Provider>;
}

export function useWritingTestBuilder() {
  const context = useContext(WritingTestBuilderContext);
  if (!context) throw new Error('useWritingTestBuilder must be used inside WritingTestBuilderProvider');
  return context;
}
