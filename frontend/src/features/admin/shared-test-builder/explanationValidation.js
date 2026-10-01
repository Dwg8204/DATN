import { withinTextLimit } from './textLimits.js';

export const EXPLANATION_WORD_LIMIT = 300;

export function validateExplanation(value) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || !withinTextLimit(value, EXPLANATION_WORD_LIMIT)) {
    return `Explanation must contain at most ${EXPLANATION_WORD_LIMIT} words.`;
  }
  return '';
}

// Supports question objects and keyed explanation maps without skill-specific schemas.
export function validateExplanations(node) {
  if (!node || typeof node !== 'object') return '';
  if (Object.hasOwn(node, 'explanation')) {
    const error = validateExplanation(node.explanation);
    if (error) return error;
  }
  if (node.explanations && typeof node.explanations === 'object') {
    for (const value of Object.values(node.explanations)) {
      const error = validateExplanation(value);
      if (error) return error;
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'explanation' || key === 'explanations') continue;
    const error = validateExplanations(value);
    if (error) return error;
  }
  return '';
}
