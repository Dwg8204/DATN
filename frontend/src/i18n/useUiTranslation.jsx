import { useTranslation } from 'react-i18next';
import { translateUi } from './translateUi.js';
export { translateUi } from './translateUi.js';

export function useUiTranslation() {
  // Subscribe to language changes while keeping callback identity stable for existing effects.
  useTranslation();
  return translateUi;
}

export function UiText({ text, values }) {
  const ui = useUiTranslation();
  return ui(text, values);
}
