const letters = 'ABCDEFGHIJ'.split('');
const grammarQuestions = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, text: index < 3 ? ['She ___ to work every day.', 'If I ___ more time, I would travel.', 'They have lived here ___ 2020.'][index] : '', options: index < 3 ? [['goes', 'go', 'going'], ['have', 'had', 'will have'], ['for', 'since', 'from']][index] : ['', '', ''], correctAnswer: index < 3 ? [0, 1, 1][index] : 0 }));
const vocabularySets = Array.from({ length: 5 }, (_, setIndex) => ({ setId: setIndex + 1, instruction: 'Select a word from the answer bank that has the same or a very similar meaning to each word.', targetWords: Array.from({ length: 5 }, (_, index) => ({ id: 26 + setIndex * 5 + index, word: '', correctAnswer: letters[index] })), options: letters.map((label) => ({ label, text: '' })) }));

export function createGrammarTestDraft(mode = 'full') {
  return { id: null, mode, details: { title: '', pictureUrl: '' }, parts: { 1: { instruction: 'Choose the correct letter, A, B or C.', questions: structuredClone(grammarQuestions) }, 2: { sets: structuredClone(vocabularySets) } } };
}

export function normalizeGrammarTest(test) {
  const draft = createGrammarTestDraft(test?.mode || 'full');
  return { ...draft, ...test, details: { ...draft.details, ...test?.details }, parts: { 1: { ...draft.parts[1], ...test?.parts?.[1] }, 2: { ...draft.parts[2], ...test?.parts?.[2] } } };
}
