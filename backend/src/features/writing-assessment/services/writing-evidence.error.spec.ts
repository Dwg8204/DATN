import { WritingAssessmentValidator } from './writing-assessment-validator.service';
import { WritingEvidenceError } from './writing-evidence.error';
import { writingFixture } from '../testing/writing.fixture';

describe('Safe Writing evidence diagnostics', () => {
  const validator = new WritingAssessmentValidator();
  it.each(['criterion', 'correction', 'finding', 'cefr'])(
    'identifies a bad %s quote without including learner text', target => {
      const { input, result } = writingFixture();
      const question = result.details.parts[3].questions[0];
      const secret = 'PRIVATE_WRONG_QUOTE';
      let path: string;
      if (target === 'criterion') {
        question.criteria[1].evidenceQuotes = [secret];
        path = 'details.parts[3].questions[0].criteria[1].evidenceQuotes[0]';
      } else if (target === 'correction') {
        question.corrections[0].original = secret;
        path = 'details.parts[3].questions[0].corrections[0].original';
      } else if (target === 'finding') {
        result.details.parts[3].strengths = [{ criterion: 'GRAMMAR', comment: 'Nhận xét.', evidence: [{ questionKey: 'p4:q1', quote: secret }] }];
        path = 'details.parts[3].strengths[0].evidence[0].quote';
      } else {
        result.cefr.evidence = [{ questionKey: 'p4:q1', quote: secret, explanation: 'Nhận xét.' }];
        path = 'cefr.evidence[0].quote';
      }
      let failure: WritingEvidenceError | undefined;
      try { validator.validate(result, input); } catch (error) { failure = error as WritingEvidenceError; }
      expect(failure).toBeInstanceOf(WritingEvidenceError);
      expect(failure?.validationRule).toBe('QUOTE_NOT_IN_RESPONSE');
      expect(failure?.location).toMatchObject({ path, questionKey: 'p4:q1' });
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect(JSON.stringify(failure)).not.toContain('Yesterday');
    },
  );
  it('redacts untrusted identifiers and control characters', () => {
    const failure = new WritingEvidenceError('QUOTE_NOT_IN_RESPONSE', {
      path: 'private\ncontent', questionKey: 'private\ncontent', criterion: 'private\ncontent',
    });
    expect(failure.location).toEqual({ path: 'redacted', questionKey: undefined, criterion: undefined });
  });
});
