import { ReadingTestContentService } from './reading-test-content.service';
import { ReadingTestAggregate } from '../types/reading-test.type';

const valid = (): ReadingTestAggregate => ({
  mode: 'full', purpose: 'EXAM', details: { title: 'Reading full test' },
  parts: {
    1: {
      passage: 'Start [1] then [2] continue [3] across [4] until [5] the end.',
      questions: Array.from({ length: 5 }, (_, index) => ({
        position: index + 1, options: ['one', 'two', 'three'], answer: 'one', explanation: '',
      })),
    },
    2: {
      title: 'A coherent report',
      sentences: Array.from({ length: 6 }, (_, index) => ({ id: `s${index + 1}`, content: `Sentence ${index + 1}`, correctPosition: index + 1 })),
    },
    3: {
      speakers: ['A', 'B', 'C', 'D'], posts: ['Post A', 'Post B', 'Post C', 'Post D'],
      questions: Array.from({ length: 7 }, (_, index) => ({ statement: `Statement ${index + 1}`, answer: ['A', 'B', 'C', 'D'][index % 4] })),
    },
    4: {
      title: 'Long text',
      paragraphs: Array.from({ length: 7 }, (_, index) => ({ id: `p${index + 1}`, content: `Paragraph ${index + 1}` })),
      headings: Array.from({ length: 7 }, (_, index) => ({ id: `h${index + 1}`, text: `Heading ${index + 1}`, correctParagraph: `p${index + 1}` })),
    },
  },
});

describe('ReadingTestContentService', () => {
  const service = new ReadingTestContentService();

  it('persists a partial draft without weakening publication validation', () => {
    const test = valid();
    test.parts[1].passage = '';
    test.parts[1].questions[0].answer = '';
    expect(() => service.assertDraftShape(test)).not.toThrow();
    expect(() => service.assertPublishable(test)).toThrow();
  });

  it('rejects malformed draft collections before saving', () => {
    const test = valid();
    test.parts[2].sentences = null;
    expect(() => service.assertDraftShape(test)).toThrow('invalid draft structure');
  });

  it('accepts the fixed Aptis Reading structure with seven Part 4 headings', () => {
    expect(() => service.assertPublishable(valid())).not.toThrow();
  });

  it('rejects an exam record that contains only one part', () => {
    const test = valid();
    test.mode = 'part1';
    expect(() => service.assertDraftShape(test)).toThrow('Exam tests must contain the full skill.');
  });

  it('rejects a Part 1 answer that is not one of its three options', () => {
    const test = valid();
    test.parts[1].questions[0].answer = 'four';
    expect(() => service.assertPublishable(test)).toThrow('Reading Part 1 is incomplete.');
  });

  it('rejects duplicate Part 4 paragraph matches instead of accepting a distractor', () => {
    const test = valid();
    test.parts[4].headings[6].correctParagraph = 'p1';
    expect(() => service.assertPublishable(test)).toThrow('Reading Part 4 is incomplete.');
  });
});
