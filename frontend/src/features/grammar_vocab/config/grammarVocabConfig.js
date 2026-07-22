export const GRAMMAR_VOCAB_CONFIG = {
  skillKey: 'grammar-vocab',
  parts: ['part1', 'part2'],
  tabs: [
    { id: 'part1', label: 'Part 1' },
    { id: 'part2', label: 'Part 2' },
    { id: 'full', label: 'Full test' },
  ],
  tests: [
    { id: 1, title: 'Grammar Practice Set 1', desc: 'Multiple-choice grammar questions\nAptis Practice Test', part: 'Part 1', tabId: 'part1', status: 'Not Started' },
    { id: 2, title: 'Vocabulary Practice Set 1', desc: 'Synonyms and word matching\nAptis Practice Test', part: 'Part 2', tabId: 'part2', status: 'Not Started' },
    { id: 3, title: 'Full Grammar & Vocabulary Test 1', desc: 'Grammar and vocabulary\n50 questions in 25 minutes', part: 'Full Test', tabId: 'full', status: 'Not Started' },
  ],
};
