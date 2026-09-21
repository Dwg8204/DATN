import { WritingTestAggregate } from '../../../writing-tests/types/writing-test.type';
import { PaperAdapter } from './paper-adapter.type';

export const writingPaperAdapter: PaperAdapter = snapshot => {
  const test = snapshot as unknown as WritingTestAggregate;
  const parts: Record<string, unknown> = {};
  const items: ReturnType<PaperAdapter>['items'] = [];
  const add = (key: string, partNumber: number, sampleAnswer?: string) =>
    items.push({ key, partNumber, kind: 'TEXT', points: 0, sampleAnswer });
  if (test.parts[1]) {
    const part = test.parts[1];
    parts['1'] = { context: part.context, questions: part.questions.map((text, index) => {
      const key = `p1:q${index + 1}`; add(key, 1, part.sampleAnswers?.[index]); return { key, text };
    }) };
  }
  if (test.parts[2]) {
    const part = test.parts[2];
    add('p2:q1', 2, part.sampleAnswer);
    parts['2'] = { instruction: part.instruction, prompt: part.prompt, key: 'p2:q1' };
  }
  if (test.parts[3]) {
    const part = test.parts[3];
    parts['3'] = { context: part.context, messages: part.messages.map((text, index) => {
      const key = `p3:q${index + 1}`; add(key, 3, part.sampleAnswers?.[index]); return { key, text };
    }) };
  }
  if (test.parts[4]) {
    const part = test.parts[4];
    add('p4:q1', 4, part.informalSample);
    add('p4:q2', 4, part.formalSample);
    parts['4'] = { context: part.context, informalPrompt: part.informalPrompt, informalKey: 'p4:q1',
      formalPrompt: part.formalPrompt, formalKey: 'p4:q2' };
  }
  return { parts, items };
};
