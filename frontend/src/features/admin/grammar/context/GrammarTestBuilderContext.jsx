import { createContext, useContext, useMemo, useReducer } from 'react';
import { createGrammarTestDraft } from '../data/grammarTestData';

const GrammarTestBuilderContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'REPLACE':
      return action.test;
    case 'UPDATE_DETAILS':
      return { ...state, details: { ...state.details, [action.field]: action.value } };
    case 'UPDATE_PART':
      return { ...state, parts: { ...state.parts, [action.part]: action.value } };
    default:
      return state;
  }
}

export function GrammarTestBuilderProvider({ children, initialTest, basePath }) {
  const [test, dispatch] = useReducer(reducer, initialTest || createGrammarTestDraft());
  const value = useMemo(() => ({
    test,
    basePath,
    replaceTest: nextTest => dispatch({ type: 'REPLACE', test: nextTest }),
    updateDetails: (field, nextValue) => dispatch({ type: 'UPDATE_DETAILS', field, value: nextValue }),
    updatePart: (part, nextValue) => dispatch({ type: 'UPDATE_PART', part, value: nextValue }),
  }), [test, basePath]);

  return <GrammarTestBuilderContext.Provider value={value}>{children}</GrammarTestBuilderContext.Provider>;
}

export function useGrammarTestBuilder() {
  const value = useContext(GrammarTestBuilderContext);
  if (!value) throw new Error('Grammar builder context is missing');
  return value;
}
