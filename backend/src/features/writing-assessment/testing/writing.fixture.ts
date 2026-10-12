import { Answers } from '../../test-attempts/types/attempt.type';
import { WritingInputBuilder } from '../services/writing-input-builder.service';
import { WritingAssessmentService } from '../services/writing-assessment.service';
import { WritingAssessmentValidator } from '../services/writing-assessment-validator.service';
import { AiProvider } from '../../../common/ai/ai-provider.interface';
import { WritingAssessment } from '../contracts/writing-assessment-output';

export function writingFixture(partNumber?: number) {
  const parts = {
    1: {
      context: 'Join a club',
      questions: ['Name?', 'Where?', 'Age?', 'Hobby?', 'Job?'],
      sampleAnswers: [],
    },
    2: {
      instruction: 'Describe a visit.',
      prompt: 'Tell us about your last visit.',
      sampleAnswer: 'SECRET SAMPLE',
    },
    3: {
      context: 'Reply to these messages.',
      messages: ['Why?', 'When?', 'How?'],
      sampleAnswers: [],
    },
    4: {
      context: 'The club is closed.',
      informalPrompt: 'Write to your friend.',
      formalPrompt: 'Write to the manager.',
      informalSample: '',
      formalSample: '',
    },
  };
  const snapshot = {
    mode: partNumber ? `part${partNumber}` : 'full',
    details: { title: 'Writing fixture' },
    parts: partNumber ? { [partNumber]: parts[partNumber as keyof typeof parts] } : parts,
  };
  const blankInput = new WritingInputBuilder().build(snapshot, {}, partNumber ? 'PART' : 'FULL_SKILL', 'vi');
  const answers: Answers = Object.fromEntries(
    blankInput.parts.flatMap((part) =>
      part.questions.map((question) => [
        question.questionKey,
        { kind: 'TEXT', text: 'Yesterday I go to the club.' },
      ]),
    ),
  );
  const input = new WritingInputBuilder().build(snapshot, answers, blankInput.scope, 'vi');
  const blank = new WritingAssessmentService({} as AiProvider, new WritingAssessmentValidator()).blank(
    blankInput,
  );
  const result: WritingAssessment = {
    ...blank,
    details: {
      parts: blank.details.parts.map((part) => ({
        ...part,
        questions: part.questions.map((question) => ({
          ...question,
          responseStatus: 'ANSWERED',
          criteria: question.criteria.map((criterion) => ({
            ...criterion,
            judgment: 'ADEQUATE',
            evidenceQuotes: ['Yesterday I go to the club.'],
          })),
          taskIssues: [],
          corrections: [
            {
              kind: 'ERROR',
              criterion: 'GRAMMAR',
              original: 'I go',
              replacement: 'I went',
              explanation: 'Dùng thì quá khứ.',
            },
          ],
          suggestedRevision: 'Yesterday I went to the club.',
        })),
      })),
    },
  };
  if (!partNumber)
    result.cefr = {
      level: 'B1',
      status: 'ESTIMATED',
      reason: null,
      rationale: 'Diễn đạt được các ý quen thuộc.',
      evidence: [
        {
          questionKey: 'p2:q1',
          quote: 'Yesterday',
          explanation: 'Mốc thời gian.',
        },
        {
          questionKey: 'p4:q1',
          quote: 'the club',
          explanation: 'Nội dung liên quan.',
        },
      ],
      limitations: [],
    };
  return { snapshot, answers, input, result };
}
