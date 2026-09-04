export const countWords = value => (value || '').trim().split(/\s+/u).filter(Boolean).length;

export const withinTextLimit = (value, maxWords) =>
  countWords(value) <= maxWords && value.length <= maxWords * 40;
