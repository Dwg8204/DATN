const translate = (text, values = {}) => typeof text === 'string'
  ? text.replace(/\{\{(\w+)\}\}/g, (match, name) => values[name] ?? match) : text;
translate.error = translate;

export function withUiTranslationMocks(requireMock) {
  return name => name.includes('useUiTranslation') ? {
    __esModule: true,
    useUiTranslation: () => translate,
    translateUi: translate,
    UiText: ({ text, values }) => translate(text, values),
  } : requireMock(name);
}
