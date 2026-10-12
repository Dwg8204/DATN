import { WritingAssessmentValidator } from './writing-assessment-validator.service';
import { WritingInputBuilder } from './writing-input-builder.service';
import { writingFixture } from '../testing/writing.fixture';

describe('Writing assessment contract and evidence', () => {
  const validator = new WritingAssessmentValidator();
  it('normalizes empty TASK evidence placeholders but rejects empty language evidence', () => {
    const { input, result } = writingFixture(2);
    const part = result.details.parts[0];
    part.weaknesses = [{ criterion: 'TASK', comment: 'Missing requested detail.', evidence: [{ questionKey: 'p2:q1', quote: '' }] }];
    expect(validator.validate(result, input).details.parts[0].weaknesses[0].evidence).toEqual([]);
    part.weaknesses = [{ criterion: 'GRAMMAR', comment: 'Incorrect tense.', evidence: [{ questionKey: 'p2:q1', quote: '' }] }];
    expect(() => validator.validate(result, input)).toThrow('AI_INVALID_RESPONSE');
  });
  it.each(['', '   \n\t'])('rejects empty required feedback (%j) throughout the contract', (empty) => {
    const paths = [
      'summary.overallComment',
      'summary.partSummaries.0.comment',
      'summary.priorities.0',
      'details.parts.0.overview',
      'details.parts.0.suggestions.0',
      'details.parts.0.questions.0.comment',
      'details.parts.0.questions.0.criteria.0.comment',
      'details.parts.0.questions.0.corrections.0.explanation',
      'details.parts.0.questions.0.suggestedRevision',
    ];
    for (const path of paths) {
      const { input, result } = writingFixture(2);
      const keys = path.split('.');
      const parent = keys
        .slice(0, -1)
        .reduce<Record<string, unknown>>(
          (row, key) => row[key] as Record<string, unknown>,
          result as unknown as Record<string, unknown>,
        );
      parent[keys.at(-1)!] = empty;
      expect(() => validator.validate(result, input)).toThrow('AI_INVALID_RESPONSE');
    }
  });
  it('allows no corrections or weaknesses on a good response and nullable revision', () => {
    const { input, result } = writingFixture(2);
    const question = result.details.parts[0].questions[0];
    question.corrections = [];
    question.weaknesses = [];
    question.suggestedRevision = null;
    expect(() => validator.validate(result, input)).not.toThrow();
  });
  it('requires evidence for language findings but allows missing-task feedback without quotes', () => {
    const { input, result } = writingFixture(2);
    const question = result.details.parts[0].questions[0];
    question.weaknesses = [{ criterion: 'GRAMMAR', comment: 'Sai thì động từ.', evidence: [] }];
    expect(() => validator.validate(result, input)).toThrow('AI_WRITING_EVIDENCE_INVALID');
    question.weaknesses[0].evidence = [{ questionKey: 'p2:q1', quote: 'I go' }];
    expect(() => validator.validate(result, input)).not.toThrow();
    question.weaknesses = [{ criterion: 'TASK', comment: 'Chưa trả lời đủ yêu cầu.', evidence: [] }];
    expect(() => validator.validate(result, input)).not.toThrow();
  });
  it('allows only TASK weaknesses for a blank question in a partially answered Full test', () => {
    const { input, result } = writingFixture();
    input.parts[0].questions[0].response = '';
    input.parts[0].questions[0].wordCount = 0;
    const question = result.details.parts[0].questions[0];
    question.responseStatus = 'BLANK';
    question.corrections = [];
    question.suggestedRevision = null;
    question.criteria = question.criteria.map((row) => ({
      ...row,
      judgment: row.criterion === 'TASK' ? 'NEEDS_IMPROVEMENT' : 'NOT_ASSESSABLE',
      evidenceQuotes: [],
    }));
    question.weaknesses = [{ criterion: 'TASK', comment: 'Chưa trả lời câu hỏi.', evidence: [] }];
    expect(() => validator.validate(result, input)).not.toThrow();
    question.weaknesses = [{ criterion: 'GRAMMAR', comment: 'Sai thì động từ.', evidence: [] }];
    expect(() => validator.validate(result, input)).toThrow('AI_WRITING_EVIDENCE_INVALID');
  });
  it.each([undefined, 1, 2, 3, 4])('accepts complete output for full/part %s', (part) => {
    const { input, result } = writingFixture(part);
    expect(validator.validate(result, input)).toBe(result);
  });
  it('rejects invented quotations, duplicated keys, missing criteria and wrong locale', () => {
    for (const mutation of [
      (result: ReturnType<typeof writingFixture>['result']) => {
        result.details.parts[0].questions[0].corrections[0].original = 'invented sentence';
      },
      (result: ReturnType<typeof writingFixture>['result']) => {
        result.details.parts[0].questions[1].questionKey = 'p1:q1';
      },
      (result: ReturnType<typeof writingFixture>['result']) => {
        result.details.parts[0].questions[0].criteria.pop();
      },
      (result: ReturnType<typeof writingFixture>['result']) => {
        result.feedbackLocale = 'en';
      },
    ]) {
      const { input, result } = writingFixture();
      mutation(result);
      expect(() => validator.validate(result, input)).toThrow();
    }
  });
  it('rejects CEFR in a Part result', () => {
    const { input, result } = writingFixture(4);
    result.cefr.level = 'B2';
    expect(() => validator.validate(result, input)).toThrow();
  });
  it('maps six named provider criteria to the stable array and normalizes Part CEFR metadata', () => {
    const { input, result } = writingFixture(2);
    result.cefr.rationale = 'Bài luyện chỉ gồm một Part.';
    result.cefr.limitations = ['Chưa đánh giá CEFR.'];
    const transport = JSON.parse(JSON.stringify(result));
    transport.details.parts[0].questions[0].criteria = Object.fromEntries(
      result.details.parts[0].questions[0].criteria.map(({ criterion, ...details }) => [criterion, details]),
    );
    const output = validator.validate(transport, input);
    expect(output.details.parts[0].questions[0].criteria).toHaveLength(6);
    expect(output.cefr).toMatchObject({
      level: null,
      rationale: null,
      limitations: [],
    });
  });
  it('uses server word count rather than a model TOO_SHORT guess without a task minimum', () => {
    const { input, result } = writingFixture(2);
    result.details.parts[0].questions[0].responseStatus = 'TOO_SHORT';
    expect(validator.validate(result, input).details.parts[0].questions[0].responseStatus).toBe('ANSWERED');
  });
  it('declines whole-test CEFR when a substantial Part is blank', () => {
    const { snapshot, answers, result } = writingFixture();
    answers['p2:q1'] = { kind: 'TEXT', text: '' };
    const input = new WritingInputBuilder().build(snapshot, answers, 'FULL_SKILL', 'vi');
    const question = result.details.parts[1].questions[0];
    question.responseStatus = 'BLANK';
    question.corrections = [];
    question.suggestedRevision = null;
    question.criteria = question.criteria.map((row) => ({
      ...row,
      judgment: row.criterion === 'TASK' ? 'NEEDS_IMPROVEMENT' : 'NOT_ASSESSABLE',
      evidenceQuotes: [],
    }));
    result.cefr.evidence = [
      { questionKey: 'p3:q1', quote: 'Yesterday', explanation: 'Evidence' },
      { questionKey: 'p4:q1', quote: 'Yesterday', explanation: 'Evidence' },
    ];
    expect(validator.validate(result, input).cefr.level).toBeNull();
  });
  it('sends only task data and never teacher samples or account metadata', () => {
    const { input } = writingFixture();
    expect(input.parts.flatMap((part) => part.questions)).toHaveLength(11);
    expect(JSON.stringify(input)).not.toContain('SECRET SAMPLE');
    expect(input.parts[3].questions.map((question) => question.register)).toEqual(['informal', 'formal']);
  });
});
