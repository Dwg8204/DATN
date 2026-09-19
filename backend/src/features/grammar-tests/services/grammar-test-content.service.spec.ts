import { GrammarTestContentService } from './grammar-test-content.service';
import { GrammarTestAggregate } from '../types/grammar-test.type';

function completeTest(): GrammarTestAggregate {
  const letters = 'ABCDEFGHIJ'.split('');
  return {
    mode: 'full',
    details: { title: 'Grammar Mock Test' },
    parts: {
      1: {
        instruction: '<p>Choose one answer.</p>',
        questions: Array.from({ length: 25 }, (_, index) => ({
          id: index + 1,
          text: `<p>Grammar question ${index + 1}</p>`,
          options: [`answer ${index + 1} A`, `answer ${index + 1} B`, `answer ${index + 1} C`],
          correctAnswer: index % 3,
          explanation: '<p>Explanation</p>',
        })),
      },
      2: {
        sets: Array.from({ length: 5 }, (_, setIndex) => ({
          setId: setIndex + 1,
          instruction: '<p>Match the words.</p>',
          targetWords: Array.from({ length: 5 }, (_, targetIndex) => ({
            id: 26 + setIndex * 5 + targetIndex,
            word: `target-${setIndex}-${targetIndex}`,
            correctAnswer: letters[targetIndex],
          })),
          options: letters.map((label, optionIndex) => ({ label, text: `option-${setIndex}-${optionIndex}` })),
        })),
      },
    },
  };
}

describe('GrammarTestContentService', () => {
  const service = new GrammarTestContentService();

  it('sanitizes rich text and discards unused parts', () => {
    const source = completeTest();
    source.mode = 'part1';
    source.parts[1]!.instruction = '<script>alert(1)</script><p>Safe</p>';
    const normalized = service.normalize(source);
    expect(normalized.parts[1]?.instruction).toBe('<p>Safe</p>');
    expect(normalized.parts[2]).toBeUndefined();
  });

  it('accepts the complete Aptis Grammar and Vocabulary structure', () => {
    expect(() => service.assertPublishable(service.normalize(completeTest()))).not.toThrow();
  });

  it('rejects a duplicate answer within a vocabulary set', () => {
    const source = completeTest();
    source.parts[2]!.sets[0].options[1].text = source.parts[2]!.sets[0].options[0].text;
    expect(() => service.assertPublishable(service.normalize(source))).toThrow('answer-bank words must be different');
  });

  it('allows incomplete text in a structurally valid draft', () => {
    const draft = completeTest();
    draft.parts[1]!.questions[0].text = '';
    expect(() => service.assertDraftShape(service.normalize(draft))).not.toThrow();
  });

  it('removes correct answers and explanations from learner delivery', () => {
    const safe = service.learnerSafe(completeTest()) as { parts: Record<number, { questions?: unknown[]; sets?: unknown[] }> };
    expect(safe.parts[1].questions?.[0]).not.toHaveProperty('correctAnswer');
    expect(safe.parts[1].questions?.[0]).not.toHaveProperty('explanation');
    expect((safe.parts[2].sets?.[0] as { targetWords: unknown[] }).targetWords[0]).not.toHaveProperty('correctAnswer');
  });

  it('only accepts Cloudinary HTTPS cover URLs', () => {
    const source = completeTest();
    source.details.pictureUrl = 'data:image/png;base64,abc';
    expect(() => service.normalize(source)).toThrow('Cloudinary');
  });

  it('rejects overflow rather than silently discarding questions', () => {
    const source = completeTest();
    source.parts[1]!.questions.push({ ...source.parts[1]!.questions[0], id: 26 });
    expect(() => service.normalize(source)).toThrow('exactly 25 questions');
  });

  it('handles unused cover metadata and rejects invisible question text', () => {
    const source = completeTest();
    source.details.cover = {
      url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      publicId: 123 as unknown as string,
    };
    source.parts[1]!.questions[0].text = '<p>&nbsp;&#160;</p>';
    const normalized = service.normalize(source);
    expect(normalized.details.cover).toEqual({ url: source.details.cover.url });
    expect(() => service.assertPublishable(normalized)).toThrow('question content is required');
  });
});
