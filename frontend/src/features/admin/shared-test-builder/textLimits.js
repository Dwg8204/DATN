import { countRichTextWords, richTextToPlainText } from '../../../components/common/richText.js';

export const countWords = value => countRichTextWords(value);

export const withinTextLimit = (value, maxWords) =>
  countWords(value) <= maxWords && richTextToPlainText(value).length <= maxWords * 40;
