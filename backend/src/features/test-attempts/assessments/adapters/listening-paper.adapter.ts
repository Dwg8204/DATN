import { ListeningQuestion, ListeningTestAggregate } from '../../../listening-tests/types/listening-test.type';
import { PaperAdapter } from './paper-adapter.type';

export const listeningPaperAdapter: PaperAdapter = snapshot => {
  const test = snapshot as unknown as ListeningTestAggregate;
  const parts: Record<string, unknown> = {};
  const items: ReturnType<PaperAdapter>['items'] = [];
  const choice = (question: ListeningQuestion, key: string, partNumber: number) => {
    const options = question.options.map((text, index) => ({ id: `o${index}`, text }));
    items.push({ key, partNumber, kind: 'CHOICE', optionIds: options.map(option => option.id),
      correctOptionId: `o${question.correctAnswer}`, points: 2, explanation: question.explanation });
    return { key, text: question.text, audioUrl: question.audioUrl, options };
  };
  if (test.parts[1]) {
    parts['1'] = { questions: test.parts[1].questions.map((question, index) => choice(question, `p1:q${index + 1}`, 1)) };
  }
  if (test.parts[2]) {
    const part = test.parts[2];
    const options = part.options.map((text, index) => ({ id: String.fromCharCode(65 + index), text }));
    parts['2'] = { instruction: part.instruction, audioUrl: part.audioUrl, options,
      speakers: part.speakers.map((name, index) => {
        const key = `p2:s${index + 1}`;
        items.push({ key, partNumber: 2, kind: 'MATCH', optionIds: options.map(option => option.id),
          correctOptionId: options[part.options.indexOf(part.answers[index])]?.id, points: 2,
          explanation: part.explanations?.[`speaker-${index}`] });
        return { key, name };
      }) };
  }
  if (test.parts[3]) {
    const part = test.parts[3];
    const options = part.options.map((text, index) => ({ id: `o${index}`, text }));
    parts['3'] = { context: part.context, subTitle: part.subTitle, audioUrl: part.audioUrl, options,
      statements: part.statements.map((statement, index) => {
        const key = `p3:s${index + 1}`;
        items.push({ key, partNumber: 3, kind: 'MATCH', optionIds: options.map(option => option.id),
          correctOptionId: options[part.options.indexOf(statement.answer)]?.id, points: 2,
          explanation: statement.explanation });
        return { key, text: statement.text };
      }) };
  }
  if (test.parts[4]) {
    let index = 0;
    parts['4'] = { recordings: test.parts[4].recordings.map(recording => ({
      id: recording.id, audioUrl: recording.audioUrl, context: recording.context,
      subQuestions: recording.subQuestions.map(question => choice(question, `p4:q${++index}`, 4)),
    })) };
  }
  return { parts, items };
};
