import i18n from './index.js';
import en from './locales/en.json' with { type: 'json' };
import vi from './locales/vi.json' with { type: 'json' };
import { createUiLookup, translateUiText, translateUiErrorText } from './uiLookup.js';

export const uiLookup = createUiLookup(en, vi);
export const translateUi = (text, values) => translateUiText(uiLookup, i18n.t.bind(i18n), text, values);
translateUi.error = text => translateUiErrorText(uiLookup, i18n.t.bind(i18n), text);
export const uiLocale = () => i18n.language === 'vi' ? 'vi-VN' : 'en-GB';
