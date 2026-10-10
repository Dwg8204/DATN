import { createContext, useContext } from 'react';

const GrammarTestBuilderContext = createContext(null);

export function GrammarTestBuilderProvider({ children, builder }) {
  const value = { ...builder,
    updateDetails: (field, next) => builder.setTest(test => ({ ...test, details: { ...test.details, [field]: next } })),
    updatePart: (part, next) => builder.setTest(test => ({ ...test, parts: { ...test.parts, [part]: next } })),
  };
  return <GrammarTestBuilderContext.Provider value={value}>{children}</GrammarTestBuilderContext.Provider>;
}

export function useGrammarTestBuilder() {
  const value = useContext(GrammarTestBuilderContext);
  if (!value) throw new Error('Grammar builder context is missing');
  return value;
}
