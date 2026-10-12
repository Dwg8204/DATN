import { WritingInputBuilder } from './writing-input-builder.service';
import { writingFixture } from '../testing/writing.fixture';
import {
  defaultWritingWordLimits,
  explicitWritingWordLimit,
} from '../../writing-tests/policies/writing-word-limits';
import { writingInputHash } from '../repositories/writing-grading-jobs.repository';
import { WritingAiConfig } from '../writing-ai-config.service';
import { ConfigService } from '@nestjs/config';
import { WritingAssessmentValidator } from './writing-assessment-validator.service';

describe('Writing word limit contract and old jobs', () => {
  const builder = new WritingInputBuilder();
  it.each([1, 2, 3, 4])('passes snapshot guidance separately for every question in Part %s', (number) => {
    const { snapshot, answers } = writingFixture(number);
    const part = snapshot.parts[number as 1 | 2 | 3 | 4]!;
    Object.assign(part, { wordLimits: defaultWritingWordLimits(number) });
    const input = builder.build(snapshot, answers, 'PART', 'vi');
    expect(input.parts[0].questions.map((q) => [q.minimumWords, q.maximumWords, q.wordLimitPolicy])).toEqual(
      defaultWritingWordLimits(number).map((l) => [l.minimum, l.maximum, l.policy]),
    );
  });
  it('recognises an explicit old instruction, leaves unknown or conflicting limits null', () => {
    const { snapshot, answers } = writingFixture(2);
    Object.assign(snapshot.parts[2]!, { instruction: 'Write 20–30 words.' });
    expect(builder.build(snapshot, answers, 'PART', 'vi').parts[0].questions[0]).toMatchObject({
      minimumWords: 20,
      maximumWords: 30,
      wordLimitPolicy: 'required',
    });
    Object.assign(snapshot.parts[2]!, {
      instruction: 'Mention 20 visitors and 30 tickets.',
    });
    expect(builder.build(snapshot, answers, 'PART', 'vi').parts[0].questions[0].minimumWords).toBeNull();
    expect(explicitWritingWordLimit('Write 20-30 words. Write 40-50 words.')).toBeNull();
  });
  it('does not infer both email limits from a shared ambiguous context', () => {
    const { snapshot, answers } = writingFixture(4);
    Object.assign(snapshot.parts[4]!, {
      context: 'Write 40-50 words. Write 120-150 words.',
    });
    expect(
      builder.build(snapshot, answers, 'PART', 'vi').parts[0].questions.map((q) => q.minimumWords),
    ).toEqual([null, null]);
  });
  it.each([19, 20, 30, 31])('uses the server word count (%s) without changing Part CEFR', (count) => {
    const { input, result } = writingFixture(2);
    const q = input.parts[0].questions[0];
    q.minimumWords = 20;
    q.maximumWords = 30;
    q.wordCount = count;
    const output = new WritingAssessmentValidator().validate(result, input);
    expect(output.details.parts[0].questions[0].responseStatus).toBe(count < 20 ? 'TOO_SHORT' : 'ANSWERED');
    expect(output.cefr.level).toBeNull();
  });
  it('retains exactly the old v1 payload/hash even with an explicit instruction', () => {
    const { snapshot, answers } = writingFixture(2);
    Object.assign(snapshot.parts[2]!, { instruction: 'Write 20-30 words.' });
    const legacy = builder.build(snapshot, answers, 'PART', 'vi', [], 1);
    expect(legacy.rubricVersion).toBe('writing-rubric-v1');
    expect(legacy.parts[0].questions[0].minimumWords).toBeNull();
    expect(legacy.parts[0].questions[0]).not.toHaveProperty('maximumWords');
    const config = {
      ...new WritingAiConfig(new ConfigService()).snapshot('vi'),
      rubricVersion: 'writing-rubric-v1',
      promptVersion: 'writing-prompt-v1',
    };
    delete config.inputVersion;
    const expected = {
      scope: 'PART' as const,
      feedbackLocale: 'vi' as const,
      rubricVersion: 'writing-rubric-v1',
      assistance: { revealedKeys: [] },
      parts: [
        {
          partNumber: 2,
          context: '',
          instruction: 'Write 20-30 words.',
          questions: [
            {
              questionKey: 'p2:q1',
              prompt: 'Tell us about your last visit.',
              response: 'Yesterday I go to the club.',
              wordCount: 6,
              minimumWords: null,
              register: null,
            },
          ],
        },
      ],
    };
    expect(legacy).toEqual(expected);
    expect(writingInputHash(legacy, config)).toBe(writingInputHash(expected, config));
    expect(writingInputHash(legacy, config)).not.toBe(
      writingInputHash(builder.build(snapshot, answers, 'PART', 'vi'), config),
    );
  });
});
