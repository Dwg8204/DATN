import { WritingTestContentService } from './writing-test-content.service';
import { CreateWritingTestDto } from '../dto/save-writing-test.dto';

const draft = (): CreateWritingTestDto => ({
  mode: 'full',
  details: { title: 'Aptis Writing Mock 1', pictureUrl: '' },
  parts: {
    1: { context: '<p>Club context</p>', questions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], sampleAnswers: ['A1', 'A2', 'A3', 'A4', 'A5'] },
    2: { instruction: 'Write 20–30 words', prompt: 'Why did you join?', sampleAnswer: 'A sample response.' },
    3: { context: 'Chat context', messages: ['M1', 'M2', 'M3'], sampleAnswers: ['S1', 'S2', 'S3'] },
    4: { context: 'Email context', informalPrompt: 'Write to a friend', informalSample: 'Hi there.', formalPrompt: 'Write to a manager', formalSample: 'Dear manager.' },
  },
});

describe('WritingTestContentService', () => {
  const service = new WritingTestContentService();

  it('validates and normalizes a full four-part test', () => {
    const test = service.normalize(draft());
    expect(() => service.assertDraftShape(test)).not.toThrow();
    expect(() => service.assertPublishable(test)).not.toThrow();
  });

  it('rejects missing response units and incomplete publishable content', () => {
    const input = draft();
    input.parts[1]!.questions = ['one'];
    const test = service.normalize(input);
    expect(() => service.assertDraftShape(test)).toThrow('Part 1 questions must contain exactly 5 entries.');
  });

  it('rejects non-Cloudinary cover URLs and removes unsafe rich text', () => {
    const input = draft();
    input.details.pictureUrl = 'https://example.com/cover.jpg';
    expect(() => service.normalize(input)).toThrow('Test covers must be uploaded to Cloudinary.');

    const safeInput = draft();
    safeInput.parts[2]!.prompt = '<p>Question</p><script>alert(1)</script>';
    expect(service.normalize(safeInput).parts[2]?.prompt).toContain('Question');
    expect(service.normalize(safeInput).parts[2]?.prompt).not.toContain('<script>');
  });

  it('does not expose sample answers in a learner-safe published payload', () => {
    const test = service.normalize(draft());
    const safe = service.learnerSafe({ ...test, id: 'test-id', status: 'PUBLISHED', version: 1 });
    expect(JSON.stringify(safe)).not.toContain('A sample response.');
    expect(JSON.stringify(safe)).not.toContain('Dear manager.');
    expect(safe).toHaveProperty('parts.1.context', '<p>Club context</p>');
    expect(safe).toHaveProperty('parts.1.questions', ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']);
  });
});
