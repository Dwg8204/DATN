export const WRITING_ANSWER_LIMITS = Object.freeze({
  part1: 250,
  part2: 4_000,
  part3: 4_000,
  part4: 8_000,
});

export const writingAnswerCharacterLimit = (part, index = 0) =>
  part === 'part4' && index === 0 ? 4_000 : WRITING_ANSWER_LIMITS[part] ?? 4_000;

export function wouldExceedAnswerLimit(value, selectionStart, selectionEnd, insertedText, limit) {
  return value.length - (selectionEnd - selectionStart) + insertedText.length > limit;
}
