import { SpeakingTestAggregate } from '../types/speaking-test.type';
import { SpeakingTestContentService } from './speaking-test-content.service';

const validPart4 = (): SpeakingTestAggregate => ({
  mode: 'part4',
  purpose: 'PRACTICE',
  details: { title: 'Speaking practice' },
  parts: {
    4: {
      topic: 'Technology',
      imageUrl: 'https://example.com/topic.jpg',
      questions: [
        { id: 'p4-1', text: 'Describe the topic.' },
        { id: 'p4-2', text: 'What are its benefits?' },
        { id: 'p4-3', text: 'What could happen next?' },
      ],
      sampleAnswer: 'Technology can improve access to education.',
      explanation: 'Give a balanced opinion and support it with examples.',
    },
  },
});

describe('SpeakingTestContentService', () => {
  const service = new SpeakingTestContentService();

  it('saves blank prompts and an unselected image as a draft only', () => {
    const test = validPart4();
    test.parts[4]!.questions[0].text = '';
    test.parts[4]!.imageUrl = '';
    expect(() => service.assertDraftShape(test)).not.toThrow();
    expect(() => service.assertPublishable(test)).toThrow();
  });

  it('rejects malformed question arrays while saving a draft', () => {
    const test = validPart4();
    test.parts[4]!.questions = [];
    expect(() => service.assertDraftShape(test)).toThrow('invalid draft structure');
  });

  it('keeps optional answer guidance in the authoring aggregate', () => {
    const test = validPart4();
    expect(() => service.assertPublishable(test)).not.toThrow();
    expect(test.parts[4]?.sampleAnswer).toContain('education');
  });

  it('removes sample answers and guidance from the learner-facing test', () => {
    const safe = service.learnerSafe(validPart4());
    expect(safe.parts[4]?.sampleAnswer).toBeUndefined();
    expect(safe.parts[4]?.explanation).toBeUndefined();
  });

  it('rejects an exam record that does not contain the full skill', () => {
    const test = validPart4();
    test.purpose = 'EXAM';
    expect(() => service.assertDraftShape(test)).toThrow('Exam tests must contain the full skill.');
  });
});
