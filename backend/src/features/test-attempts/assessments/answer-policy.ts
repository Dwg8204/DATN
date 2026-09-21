import { ApplicationError } from '../../../common/errors/application.error';
import { Answer, Answers, AssessableItem } from '../types/attempt.type';

const MAX_CHANGES = 150;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_TOTAL_ANSWERS_BYTES = 256 * 1024;

export function applyAnswerChanges(current: Answers, changes: Record<string, Answer | null>, items: AssessableItem[]): Answers {
  if (Object.keys(changes).length > MAX_CHANGES || Buffer.byteLength(JSON.stringify(changes), 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new ApplicationError('ATTEMPT_ANSWERS_TOO_LARGE', 'Too many answers in one request.', 413);
  }
  const known = new Map(items.map(item => [item.key, item]));
  const next = { ...current };
  for (const [key, answer] of Object.entries(changes)) {
    const item = known.get(key);
    if (!item) throw new ApplicationError('ATTEMPT_UNKNOWN_QUESTION', `Question ${key} does not belong to this test.`, 422);
    if (answer === null) { delete next[key]; continue; }
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) || answer.kind !== item.kind) {
      throw new ApplicationError('ATTEMPT_INVALID_ANSWER', `Answer for ${key} has the wrong format.`, 422);
    }
    if (item.kind === 'CHOICE' || item.kind === 'MATCH') {
      if ((answer.kind !== 'CHOICE' && answer.kind !== 'MATCH') ||
          typeof answer.optionId !== 'string' || !item.optionIds?.includes(answer.optionId) ||
          Object.keys(answer).some(field => field !== 'kind' && field !== 'optionId')) {
        throw new ApplicationError('ATTEMPT_INVALID_ANSWER', `Select a valid answer for ${key}.`, 422);
      }
      next[key] = { kind: item.kind, optionId: answer.optionId };
    } else if (item.kind === 'TEXT') {
      if (answer.kind !== 'TEXT' || typeof answer.text !== 'string' || answer.text.length > 20_000 ||
          Object.keys(answer).some(field => field !== 'kind' && field !== 'text')) {
        throw new ApplicationError('ATTEMPT_INVALID_ANSWER', `Text answer for ${key} is invalid.`, 422);
      }
      next[key] = { kind: 'TEXT', text: answer.text };
    } else {
      throw new ApplicationError('ATTEMPT_AUDIO_UNAVAILABLE', 'Audio answers require a verified upload.', 422);
    }
  }
  if (Buffer.byteLength(JSON.stringify(next), 'utf8') > MAX_TOTAL_ANSWERS_BYTES) {
    throw new ApplicationError('ATTEMPT_ANSWERS_TOO_LARGE', 'Saved answers exceed the allowed size.', 413);
  }
  return next;
}
