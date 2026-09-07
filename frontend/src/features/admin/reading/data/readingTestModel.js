export const READING_PARTS = [{
  number: 1,
  title: 'Gap filling',
  summary: 'A short text with 5 gaps and 3 options per gap.'
}, {
  number: 2,
  title: 'Text cohesion',
  summary: 'An opening sentence and 5 sentences to arrange.'
}, {
  number: 3,
  title: 'Opinion matching',
  summary: '4 speakers and 7 statements.'
}, {
  number: 4,
  title: 'Heading matching',
  summary: '7 paragraphs and 7 headings.'
}];
export function createReadingDraft(mode = 'full') {
  return {
    mode,
    details: {
      title: '',
      pictureUrl: ''
    },
    part1: {
      passage: '',
      passageHtml: '',
      passageVersion: 2,
      questions: Array.from({
        length: 5
      }, (_, i) => ({
        id: `p1-q${i + 1}`,
        position: i + 1,
        options: ['', '', ''],
        answer: ''
      }))
    },
    part2: {
      title: '',
      sentences: Array.from({
        length: 6
      }, (_, i) => ({
        id: `s${i + 1}`,
        content: '',
        correctPosition: i + 1
      }))
    },
    part3: {
      speakers: ['A', 'B', 'C', 'D'],
      posts: ['', '', '', ''],
      passage: '',
      questions: Array.from({
        length: 7
      }, (_, i) => ({
        id: `p3-q${i + 1}`,
        statement: '',
        answer: ''
      }))
    },
    part4: {
      title: '',
      paragraphs: Array.from({
        length: 7
      }, (_, i) => ({
        id: `para${i + 1}`,
        label: `Paragraph ${String.fromCharCode(65 + i)}`,
        content: ''
      })),
      headings: Array.from({
        length: 7
      }, (_, i) => ({
        id: `h${i + 1}`,
        text: '',
        correctParagraph: ''
      }))
    }
  };
}
