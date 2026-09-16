/** Return the first actionable message from a form's nested validation result. */
export function getFirstValidationError(errors) {
  if (typeof errors === 'string') return errors;
  if (!errors || typeof errors !== 'object') return '';
  for (const value of Object.values(errors)) {
    const message = getFirstValidationError(value);
    if (message) return message;
  }
  return '';
}
