import { GrammarTestAggregate } from '../../../grammar-tests/types/grammar-test.type';
import { PaperAdapter } from './paper-adapter.type';

export const grammarPaperAdapter: PaperAdapter = snapshot => {
  const test = snapshot as unknown as GrammarTestAggregate;
  const parts: Record<string, unknown> = {};
  const items: ReturnType<PaperAdapter>['items'] = [];
  if (test.parts[1]) {
    parts['1'] = { instruction: test.parts[1].instruction, questions: test.parts[1].questions.map(question => {
      const key = `p1:q${question.id}`;
      const options = question.options.map((text, index) => ({ id: `o${index}`, text }));
      items.push({ key, partNumber: 1, kind: 'CHOICE', optionIds: options.map(option => option.id),
        correctOptionId: `o${question.correctAnswer}`, points: 1, explanation: question.explanation });
      return { key, text: question.text, options };
    }) };
  }
  if (test.parts[2]) {
    parts['2'] = { sets: test.parts[2].sets.map(set => {
      const options = set.options.map(option => ({ id: option.label, text: option.text }));
      return { setId: set.setId, instruction: set.instruction, options,
        targetWords: set.targetWords.map(target => {
          const key = `p2:q${target.id}`;
          items.push({ key, partNumber: 2, kind: 'MATCH', optionIds: options.map(option => option.id),
            correctOptionId: target.correctAnswer, points: 1, explanation: target.explanation });
          return { key, word: target.word };
        }) };
    }) };
  }
  return { parts, items };
};
