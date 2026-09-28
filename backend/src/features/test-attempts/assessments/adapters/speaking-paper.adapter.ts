import { SpeakingTestAggregate } from '../../../speaking-tests/types/speaking-test.type';
import { PaperAdapter } from './paper-adapter.type';

/**
 * Converts the immutable Speaking snapshot into the same question contract used
 * by the shared exam/practice attempt flow. Part 4 has one recording covering
 * all three prompts, matching the Aptis delivery flow.
 */
export const speakingPaperAdapter: PaperAdapter = snapshot => {
  const test = snapshot as unknown as SpeakingTestAggregate;
  const parts: Record<string, unknown> = {};
  const items: ReturnType<PaperAdapter>['items'] = [];
  const addRecording = (key: string, partNumber: number, sampleAnswer?: string, explanation?: string) => {
    items.push({ key, partNumber, kind: 'AUDIO', points: 0, sampleAnswer, explanation });
  };

  if (test.parts[1]) {
    const questions = test.parts[1].questions.map((question, index) => {
      const key = `p1:q${index + 1}`;
      addRecording(key, 1, question.sampleAnswer, question.explanation);
      return { key, text: question.text };
    });
    parts['1'] = { questions };
  }
  if (test.parts[2]) {
    const part = test.parts[2];
    const questions = part.questions.map((question, index) => {
      const key = `p2:q${index + 1}`;
      addRecording(key, 2, question.sampleAnswer, question.explanation);
      return { key, text: question.text };
    });
    parts['2'] = { imageUrl: part.imageUrl, questions };
  }
  if (test.parts[3]) {
    const part = test.parts[3];
    const questions = part.questions.map((question, index) => {
      const key = `p3:q${index + 1}`;
      addRecording(key, 3, question.sampleAnswer, question.explanation);
      return { key, text: question.text };
    });
    parts['3'] = { imageUrls: part.imageUrls, questions };
  }
  if (test.parts[4]) {
    const part = test.parts[4];
    const key = 'p4:q1';
    addRecording(key, 4, part.sampleAnswer, part.explanation);
    parts['4'] = {
      topic: part.topic,
      imageUrl: part.imageUrl,
      questions: part.questions.map(question => ({ text: question.text })),
      responseKey: key,
    };
  }
  return { parts, items };
};
