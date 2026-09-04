import { withinTextLimit } from '../utils/textLimits.js';
const filled = value => typeof value === 'string' && value.trim().length > 0;
export function validateReadingPart(number, part) {
  const errors = [];
  const limit = (value, words, label) => {
    if (!withinTextLimit(value || '', words)) errors.push(`${label}: maximum ${words} words. Please shorten the text.`);
  };
  if (number === 1) {
    limit(part.passage, 500, 'Passage');
    part.questions.forEach((q, i) => q.options.forEach(option => limit(option, 50, `Gap ${i + 1} option`)));
    if (!filled(part.passage)) errors.push('Enter the passage.');
    for (let i = 1; i <= 5; i++) {
      if (part.passage.split(`[${i}]`).length !== 2) errors.push(`Include gap [${i}] exactly once.`);
    }
    if (part.questions.some(q => q.options.some(o => !filled(o)) || new Set(q.options.map(o => o.trim().toLowerCase())).size !== 3 || !q.options.includes(q.answer) || !filled(q.answer))) errors.push('Each gap needs three different options and one correct answer.');
  }
  if (number === 2) {
    limit(part.title, 50, 'Title');
    part.sentences.forEach((s, i) => limit(s.content, 100, `Sentence ${i + 1}`));
    if (!filled(part.title) || part.sentences.some(s => !filled(s.content))) errors.push('Complete the title and all six sentences.');
    if (part.sentences[0]?.correctPosition !== 1 || part.sentences.some(s => !Number.isInteger(s.correctPosition) || s.correctPosition < 1 || s.correctPosition > 6) || new Set(part.sentences.map(s => s.correctPosition)).size !== 6) errors.push('Keep the opening sentence first and assign each remaining position (2–6) exactly once.');
  }
  if (number === 3) {
    part.speakers.forEach(name => limit(name, 50, 'Speaker name'));
    part.posts.forEach((post, i) => limit(post, 500, `Post ${i + 1}`));
    part.questions.forEach((q, i) => limit(q.statement, 100, `Statement ${i + 1}`));
    if (part.speakers.some(s => !filled(s)) || new Set(part.speakers).size !== 4 || part.posts.some(p => !filled(p))) errors.push('Provide four unique speaker names and their posts.');
    if (part.questions.some(q => !filled(q.statement) || !part.speakers.includes(q.answer))) errors.push('Complete all seven statements and choose their speakers.');
  }
  if (number === 4) {
    limit(part.title, 50, 'Title');
    part.paragraphs.forEach((p, i) => limit(p.content, 500, `Paragraph ${i + 1}`));
    part.headings.forEach((h, i) => limit(h.text, 50, `Heading ${i + 1}`));
    if (!filled(part.title) || part.paragraphs.length !== 7 || part.headings.length !== 7 || part.paragraphs.some(p => !filled(p.content)) || part.headings.some(h => !filled(h.text))) errors.push('Complete the title, seven paragraphs and seven headings.');
    const matches = part.headings.map(h => h.correctParagraph).filter(Boolean);
    if (matches.length !== 7 || new Set(matches).size !== 7 || matches.some(id => !part.paragraphs.some(p => p.id === id))) errors.push('Match one unique heading to each of the 7 paragraphs.');
  }
  return errors;
}
export function validateReadingTest(test) {
  const errors = [];
  if (!filled(test.details.title)) errors.push('Test title is required.');
  if (!filled(test.details.source)) errors.push('Source is required.');
  if (!withinTextLimit(test.details.title || '', 50) || !withinTextLimit(test.details.source || '', 50)) errors.push('Title and source must each be at most 50 words.');
  const parts = test.mode === 'full' ? [1, 2, 3, 4] : [Number(test.mode.slice(-1))];
  return [...errors, ...parts.flatMap(n => validateReadingPart(n, test[`part${n}`]).map(e => `Part ${n}: ${e}`))];
}
