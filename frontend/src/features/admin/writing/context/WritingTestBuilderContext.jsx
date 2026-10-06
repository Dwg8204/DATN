import { createContext, useContext } from 'react';

const WritingTestBuilderContext = createContext(null);

export function WritingTestBuilderProvider({ children, builder }) {
  const value = { ...builder,
    updateDetails: (field, next) => builder.setTest(test => ({ ...test, details: { ...test.details, [field]: next } })),
    updatePart: (part, field, next) => builder.setTest(test => ({ ...test,
      parts: { ...test.parts, [part]: { ...test.parts[part], [field]: next } } })),
  };
  return <WritingTestBuilderContext.Provider value={value}>{children}</WritingTestBuilderContext.Provider>;
}

export function useWritingTestBuilder() {
  const context = useContext(WritingTestBuilderContext);
  if (!context) throw new Error('useWritingTestBuilder must be used inside WritingTestBuilderProvider');
  return context;
}
