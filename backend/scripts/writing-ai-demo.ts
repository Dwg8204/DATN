import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from '../src/common/ai/providers/gemini.provider';
import { WritingAiConfig } from '../src/features/writing-assessment/writing-ai-config.service';
import { WritingInputBuilder } from '../src/features/writing-assessment/services/writing-input-builder.service';
import { WritingAssessmentValidator } from '../src/features/writing-assessment/services/writing-assessment-validator.service';
import { WritingAssessmentService } from '../src/features/writing-assessment/services/writing-assessment.service';
import { writingFixture } from '../src/features/writing-assessment/testing/writing.fixture';
import { Answers } from '../src/features/test-attempts/types/attempt.type';
import { AiError } from '../src/common/ai/ai-error';

async function main() {
  const configService = new ConfigService(process.env);
  const config = new WritingAiConfig(configService);
  config.assertReady();
  const full = process.argv.includes('--full');
  const { snapshot } = writingFixture(full ? undefined : 2);
  const answers: Answers = {
    'p1:q1': { kind: 'TEXT', text: 'Alex.' },
    'p1:q2': { kind: 'TEXT', text: 'In a small town.' },
    'p1:q3': { kind: 'TEXT', text: 'Twenty-five.' },
    'p1:q4': { kind: 'TEXT', text: 'Reading books.' },
    'p1:q5': { kind: 'TEXT', text: 'I am a student.' },
    'p2:q1': {
      kind: 'TEXT',
      text: 'Last weekend I visited the club with a friend. We talked about our favourite books and met several new members. I enjoyed the friendly atmosphere.',
    },
    'p3:q1': {
      kind: 'TEXT',
      text: 'I enjoy reading because it helps me relax after work. I especially like stories about different cultures, and I would like to discuss them with other people.',
    },
    'p3:q2': {
      kind: 'TEXT',
      text: 'I can come on Saturday afternoons because I finish work early. Next week I am going to bring a book that I have just finished reading.',
    },
    'p3:q3': {
      kind: 'TEXT',
      text: 'We could organise a small book exchange. Each member could bring one book and explain why they liked it. This would help everyone discover something new.',
    },
    'p4:q1': {
      kind: 'TEXT',
      text: 'Hi Sam, I just heard that the club is closed this weekend. It is disappointing because I was looking forward to our meeting. Shall we meet at the library instead? We could talk about the book there. Let me know what you think. See you soon, Alex',
    },
    'p4:q2': {
      kind: 'TEXT',
      text: 'Dear Manager, I am writing about the closure of the club this weekend. I understand that unexpected problems can occur, but the short notice has caused some inconvenience. Several members had already made travel arrangements for the meeting. Could you please explain the reason for the closure and let us know when the club will reopen? I would also appreciate information about an alternative meeting place. In future, it would be helpful to send an email to members as soon as a change is confirmed. This would allow us to adjust our plans. Thank you for considering these suggestions. I look forward to hearing from you. Yours sincerely, Alex',
    },
  };
  const input = new WritingInputBuilder().build(snapshot, answers, full ? 'FULL_SKILL' : 'PART', 'vi');
  const assessor = new WritingAssessmentService(
    new GeminiProvider(configService),
    new WritingAssessmentValidator(),
  );
  const start = Date.now();
  const result = await assessor.assess(input, config.snapshot('vi'));
  console.log(
    JSON.stringify({
      status: 'OK',
      scope: result.scope,
      parts: result.details.parts.length,
      questions: result.details.parts.reduce((sum, part) => sum + part.questions.length, 0),
      cefr: result.cefr.level,
      elapsedMs: Date.now() - start,
    }),
  );
}
main().catch((error) => {
  console.error(
    error instanceof AiError
      ? `${error.code}${error.validationRule ? ':' + error.validationRule : ''}`
      : 'WRITING_DEMO_FAILED',
  );
  process.exitCode = 1;
});
