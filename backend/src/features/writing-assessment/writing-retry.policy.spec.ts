import { isWritingInvalidOutput, writingAttemptLimit, writingRetryDelay } from './writing-retry.policy';

describe('Gemini Writing invalid-output retry limit', () => {
  it.each(['AI_INVALID_RESPONSE', 'AI_WRITING_EVIDENCE_INVALID', 'AI_RESPONSE_INCOMPLETE'])(
    'allows eight runs for %s even when immutable config permits only three', code => {
      expect(isWritingInvalidOutput(code)).toBe(true);
      expect(writingAttemptLimit(3, code)).toBe(8);
    },
  );
  it.each([1, 2, 4, 7])('uses short content retry delay on run %s without exponential increase', count => {
    expect(writingRetryDelay('AI_WRITING_EVIDENCE_INVALID', count, undefined, 0)).toBe(20000);
  });
  it('keeps provider Retry-After and transport-error exponential backoff', () => {
    expect(writingRetryDelay('AI_INVALID_RESPONSE', 4, 65000, 0)).toBe(65000);
    expect(writingRetryDelay('GEMINI_HTTP_503', 3, undefined, 0)).toBe(120000);
    expect(writingRetryDelay('GEMINI_HTTP_429', 3, 90000, 0)).toBe(90000);
  });
  it.each([null, 'GEMINI_HTTP_503', 'GROQ_DAILY_WAIT', 'WRITING_INPUT_CHANGED'])(
    'keeps configured limits for unrelated code %s', code => {
      expect(writingAttemptLimit(3, code)).toBe(3);
    },
  );
});
