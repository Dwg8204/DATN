import { ReadingTestAggregate } from '../../../reading-tests/types/reading-test.type';
import { PaperAdapter } from './paper-adapter.type';

export const readingPaperAdapter: PaperAdapter = snapshot => {
  const test = snapshot as unknown as ReadingTestAggregate;
  const parts: Record<string, unknown> = {};
  const items: ReturnType<PaperAdapter>['items'] = [];

  const p1 = test.parts['1'];
  if (p1) {
    const questions = p1.questions.map((question: any, index: number) => {
      const key = `p1:q${index + 1}`;
      const options = question.options.map((text: string, optionIndex: number) => ({ id: `o${optionIndex}`, text }));
      const correct = Math.max(0, question.options.findIndex((text: string) => text === question.answer));
      items.push({ key, partNumber: 1, kind: 'CHOICE', optionIds: options.map((option: any) => option.id),
        correctOptionId: options[correct].id, points: 1, explanation: question.explanation });
      return { key, position: question.position ?? index + 1, options };
    });
    parts['1'] = { passage: p1.passage, passageHtml: p1.passageHtml, passageVersion: p1.passageVersion, questions };
  }

  const p2 = test.parts['2'];
  if (p2) {
    const sourceTexts = Array.isArray(p2.texts) ? p2.texts : [{ id: 'p2-text1', title: p2.title, sentences: p2.sentences }];
    let questionIndex = 0;
    const texts = sourceTexts.map((text: any, textIndex: number) => {
      const sentences = [...text.sentences].sort((a: any, b: any) => a.correctPosition - b.correctPosition);
      const options = sentences.slice(1).map((sentence: any) => ({ id: sentence.id, text: sentence.content }));
      const positions = sentences.slice(1).map((sentence: any, index: number) => {
        questionIndex += 1;
        const key = `p2:q${questionIndex}`;
        items.push({ key, partNumber: 2, kind: 'MATCH', optionIds: options.map((option: any) => option.id),
          correctOptionId: sentence.id, points: 1, explanation: sentence.explanation });
        return { key, position: index + 2 };
      });
      return { id: text.id || `p2-text${textIndex + 1}`, title: text.title,
        openingSentence: sentences[0]?.content ?? '', options, positions };
    });
    parts['2'] = { texts };
  }

  const p3 = test.parts['3'];
  if (p3) {
    const speakers = p3.speakers.map((name: string, index: number) => ({ id: `speaker${index + 1}`, name, post: p3.posts[index] }));
    const questions = p3.questions.map((question: any, index: number) => {
      const key = `p3:q${index + 1}`;
      const correct = speakers.find((speaker: any) => speaker.name === question.answer)?.id;
      items.push({ key, partNumber: 3, kind: 'MATCH', optionIds: speakers.map((speaker: any) => speaker.id),
        correctOptionId: correct, points: 1, explanation: question.explanation });
      return { key, statement: question.statement };
    });
    parts['3'] = { speakers, questions };
  }

  const p4 = test.parts['4'];
  if (p4) {
    const headings = p4.headings.map((heading: any) => ({ id: heading.id, text: heading.text }));
    const paragraphs = p4.paragraphs.map((paragraph: any, index: number) => {
      const key = `p4:q${index + 1}`;
      const correct = p4.headings.find((heading: any) => heading.correctParagraph === paragraph.id);
      items.push({ key, partNumber: 4, kind: 'MATCH', optionIds: headings.map((heading: any) => heading.id),
        correctOptionId: correct?.id, points: 1, explanation: correct?.explanation });
      return { key, id: paragraph.id, label: paragraph.label, content: paragraph.content };
    });
    parts['4'] = { title: p4.title, headings, paragraphs };
  }
  return { parts, items };
};
