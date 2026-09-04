export const LISTENING_PARTS = [
  { number: 1, title: 'Information recognition', summary: '13 short recordings with one multiple-choice question each.' },
  { number: 2, title: 'Information matching', summary: '4 speakers matched to 4 of 5 statements.' },
  { number: 3, title: 'Opinion matching', summary: '4 statements answered with Man, Woman or Both.' },
  { number: 4, title: 'Extended listening', summary: '2 recordings with 2 multiple-choice questions each.' },
];
const mcq = (id, options = 3) => ({ id, text: '', options: Array(options).fill(''), correctAnswer: 0 });
export function createListeningDraft(mode = 'full') {
  return { id: null, mode, details: { title: '', pictureUrl: '' }, parts: {
    1: { questions: Array.from({ length: 13 }, (_, i) => ({ ...mcq(i + 1), audioUrl: '' })) },
    2: { id: 14, instruction: 'Four people are talking. Match each speaker with the correct statement.', audioUrl: '', speakers: ['Speaker A','Speaker B','Speaker C','Speaker D'], options: Array(5).fill(''), answers: Array(4).fill('') },
    3: { id: 15, context: '', subTitle: 'Who expresses which opinion?', audioUrl: '', options: ['Man','Woman','Both'], statements: Array.from({ length: 4 }, (_, i) => ({ id: `15${String.fromCharCode(97+i)}`, text: '', answer: '' })) },
    4: { recordings: Array.from({ length: 2 }, (_, i) => ({ id: 16+i, audioUrl: '', context: '', subQuestions: Array.from({ length: 2 }, (_, j) => mcq(`${16+i}${String.fromCharCode(97+j)}`)) })) },
  }};
}
