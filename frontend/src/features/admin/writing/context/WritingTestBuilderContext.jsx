import { createContext, useContext, useMemo, useReducer } from 'react';
import { INITIAL_WRITING_TEST } from '../data/writingBuilderInitialState';

const WritingTestBuilderContext = createContext(null);

function reducer(state, action) {
  if (action.type === 'UPDATE_DETAILS') return { ...state, details: { ...state.details, [action.field]: action.value } };
  if (action.type === 'UPDATE_PART') return { ...state, parts: { ...state.parts, [action.part]: { ...state.parts[action.part], [action.field]: action.value } } };
  if (action.type === 'RESET') return INITIAL_WRITING_TEST;
  return state;
}

export function WritingTestBuilderProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_WRITING_TEST);
  const value = useMemo(() => ({
    test: state,
    updateDetails: (field, value) => dispatch({ type: 'UPDATE_DETAILS', field, value }),
    updatePart: (part, field, value) => dispatch({ type: 'UPDATE_PART', part, field, value }),
    reset: () => dispatch({ type: 'RESET' }),
  }), [state]);
  return <WritingTestBuilderContext.Provider value={value}>{children}</WritingTestBuilderContext.Provider>;
}

export function useWritingTestBuilder() {
  const context = useContext(WritingTestBuilderContext);
  if (!context) throw new Error('useWritingTestBuilder must be used inside WritingTestBuilderProvider');
  return context;
}
