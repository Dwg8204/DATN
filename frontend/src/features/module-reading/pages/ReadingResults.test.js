import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import * as presentation from '../utils/readingResultPresentation.js';
import { splitFormattedPassage } from '../../admin/reading/utils/richPassage.js';

const compile = filename => transformSync(readFileSync(new URL(filename, import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const files = { summary: compile('./ReadingAttemptResultPage.jsx'), detail: compile('./ReadingAttemptDetailPage.jsx') };
const jsx = (type, props) => ({ type, props });
const component = type => ({ __esModule: true, default: type });
const walk = node => {
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return [node, ...walk(node.type(node.props))];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
};
const textContent = node => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  if (typeof node.type === 'function') return textContent(node.type(node.props));
  if (node.type === 'rich') return node.props.value;
  if (node.props?.dangerouslySetInnerHTML) return node.props.dangerouslySetInnerHTML.__html;
  return [node.props?.children].flat(Infinity).map(textContent).join(' ');
};
const text = id => ({ id, title: `Story ${id}`, openingSentence: `Opening ${id}`,
  options: 'ABCDE'.split('').map(label => ({ id: `${id}-${label}`, text: `${id} sentence ${label}` })),
  positions: [2, 3, 4, 5, 6].map((position, index) => ({ key: `${id}:q${index + 1}`, position })) });
const papers = {
  1: { passage: 'Choose [1] in this passage.', questions: [{ key: 'p1:q1', position: 1, options: [{ id: 'o0', text: 'correct word' }, { id: 'o1', text: 'wrong word' }] }] },
  2: { texts: [text('t1'), text('t2')] },
  3: { speakers: [{ id: 'speaker1', name: 'A', post: 'Person A enjoys reading.' }, { id: 'speaker2', name: 'B', post: 'Person B enjoys cycling.' }],
    questions: [{ key: 'p3:q1', statement: 'Who enjoys reading?' }] },
  4: { title: 'An article', headings: [{ id: 'h1', text: 'Correct heading' }, { id: 'h2', text: 'Wrong heading' }],
    paragraphs: [{ key: 'p4:q1', label: 'Paragraph A', content: 'First paragraph' }, { key: 'p4:q2', label: 'Paragraph B', content: 'Second paragraph' }] },
};

function harness(kind, { practice = false, part = 2, page = 1, question = '', outcome = 'INCORRECT', error = '', full = true } = {}) {
  const rows = Object.entries(papers).flatMap(([number, paper]) => presentation.readingReviewPages(paper, Number(number)).flatMap(page => page.rows.map(row => ({ ...row, partNumber: Number(number) }))));
  const items = rows.map(row => ({ key: row.key, partNumber: row.partNumber, outcome,
    selectedAnswer: { kind: row.partNumber === 1 ? 'CHOICE' : 'MATCH', optionId: row.options[1].id } }));
  const data = { title: 'Reading exercise', score: 3, maxScore: 29, estimatedCefr: null, result: {
    parts: (full ? [1, 2, 3, 4] : [part]).map(partNumber => ({ partNumber, score: 1, maxScore: 5 })),
    counts: { correct: 3, incorrect: 24, skipped: 2 }, items,
    assistance: { revealedKeys: practice ? ['p2:q1'] : [] },
  } };
  const h = { url: { part, page, question }, navigated: [], apiCalls: [] };
  const mocks = {
    react: { useMemo: factory => factory() }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { useNavigate: () => href => h.navigated.push(href),
      useSearchParams: () => [new URLSearchParams(`attemptId=attempt-1${practice ? '&practice=true' : ''}`)] },
    '../../test-attempts/hooks/useAttemptResult.js': {
      useAttemptResult: (_id, component) => { h.apiCalls.push(component); return { data, loading: false, error }; },
      useAttemptPartResult: (_id, activePart, component) => {
        h.apiCalls.push(component);
        return { loading: false, data: { paper: papers[activePart], items: rows.filter(row => row.partNumber === activePart).map(row => ({ key: row.key,
          selectedAnswer: outcome === 'SKIPPED' ? null : { kind: 'MATCH', optionId: row.options[outcome === 'CORRECT' ? 0 : 1].id }, correctAnswer: row.options[0].id, explanation: `Reason for ${row.key}`,
          revealed: practice, outcome: { outcome } })) } };
      },
    },
    '../../test-attempts/components/AttemptPageState.jsx': { AttemptPageState: 'state' },
    '../../test-attempts/components/AttemptScoreSummary.jsx': component('score'),
    '../../test-attempts/utils/attemptTime.js': { formatDuration: () => '00:10:00' },
    '../../../components/common/RichTextContent.jsx': component('rich'),
    '../../../components/common/AnswerExplanation.jsx': component('explanation'),
    '../../../components/layout/TestFooter.jsx': component('footer'),
    '../../../hooks/useUrlQueryState.js': { __esModule: true, queryParam: { positiveInt: () => ({}), string: () => ({}) },
      default: () => [h.url, patch => { h.url = { ...h.url, ...patch }; }] },
    '../../admin/reading/utils/richPassage.js': { splitFormattedPassage },
    '../utils/readingResultPresentation.js': presentation,
    './ReadingAttemptResultPage.module.css': component(new Proxy({}, { get: (_target, key) => key })),
    './ReadingAttemptDetailPage.module.css': component(new Proxy({}, { get: (_target, key) => key })),
  };
  const module = { exports: {} };
  runInNewContext(files[kind], { module, require: name => mocks[name], URLSearchParams });
  h.render = () => module.exports.default();
  return h;
}

for (const practice of [false, true]) {
  test(`${practice ? 'Practice' : 'Test'} summary displays scores, part statistics and navigates to its own result flow`, () => {
    const h = harness('summary', { practice });
    const tree = h.render(), nodes = walk(tree), content = textContent(tree);
    assert.match(content, /Answer overview/); assert.match(content, /Statistics/); assert.match(content, /3\s*\/\s*29/);
    assert.match(content, practice ? /Practice score/ : /Not converted/);
    const question = nodes.find(node => node.props?.['aria-label'] === 'Question 2: Incorrect');
    question.props.onClick();
    assert.match(h.navigated[0], /part=2&question=t1%3Aq1/);
    assert.equal(h.navigated[0].includes('practice=true'), practice);
    nodes.find(node => node.type === 'button' && node.props.children === 'Back to tests').props.onClick();
    assert.equal(h.navigated[1], practice ? '/reading/practice' : '/reading/tests');
    assert.ok(h.apiCalls.every(component => component === 'READING'));
  });

  for (const part of [1, 2, 3, 4]) test(`${practice ? 'Practice' : 'Test'} Part ${part} review shows reading context, both answers and explanation`, () => {
    const h = harness('detail', { practice, part });
    const tree = h.render(), content = textContent(tree), nodes = walk(tree);
    assert.match(content, /Your answer/); assert.match(content, /Correct answer/); assert.match(content, /Incorrect/);
    assert.ok(nodes.some(node => node.type === 'explanation' && node.props.text.startsWith('Reason for')));
    if (part === 1) assert.match(content, /Choose/);
    if (part === 2) { assert.match(content, /Opening t1/); assert.match(content, /Correct reading order/); assert.doesNotMatch(content, /t2 sentence/); }
    if (part === 3) assert.match(content, /Person A enjoys reading/);
    if (part === 4) assert.match(content, /First paragraph/);
    const footer = nodes.find(node => node.type === 'footer');
    footer.props.onSubmitClick();
    assert.equal(h.navigated[0], practice ? '/reading/practice' : '/reading/tests');
  });
}

test('Part 2 overview target opens the second text and footer navigation clears the target', () => {
  const h = harness('detail', { part: 2, question: 't2:q1' });
  const tree = h.render(), nodes = walk(tree);
  assert.match(textContent(tree), /Opening t2/); assert.doesNotMatch(textContent(tree), /t1 sentence/);
  const footer = nodes.find(node => node.type === 'footer');
  assert.deepEqual(Array.from(footer.props.currentPageQuestionIds), ['t2:q1', 't2:q2', 't2:q3', 't2:q4', 't2:q5']);
  footer.props.onPrevClick();
  assert.deepEqual(h.url, { part: 2, page: 1, question: '' });
  assert.match(textContent(h.render()), /Opening t1/);
});

test('out-of-range page is clamped and a single-part practice only navigates its own paragraphs', () => {
  const h = harness('detail', { part: 4, page: 999, practice: true, full: false, outcome: 'SKIPPED' });
  const tree = h.render(), footer = walk(tree).find(node => node.type === 'footer');
  assert.match(textContent(tree), /Second paragraph/); assert.match(textContent(tree), /Skipped/);
  assert.match(textContent(tree), /No answer/);
  assert.equal(footer.props.hasNext, false);
  footer.props.onQuestionClick('p4:q1');
  assert.match(textContent(h.render()), /First paragraph/);
});

test('result loading failures render the shared error state instead of partial grading UI', () => {
  for (const kind of ['summary', 'detail']) assert.equal(harness(kind, { error: 'Unavailable' }).render().type, 'state');
});

test('correct answers retain their explanation and green status in both result flows', () => {
  for (const practice of [false, true]) {
    const tree = harness('detail', { practice, part: 2, outcome: 'CORRECT' }).render();
    assert.ok(walk(tree).some(node => node.type === 'span' && node.props.children === 'Correct'));
    assert.ok(walk(tree).some(node => node.type === 'explanation' && node.props.text === 'Reason for t1:q1'));
    assert.doesNotMatch(textContent(tree), /Incorrect/);
  }
});
