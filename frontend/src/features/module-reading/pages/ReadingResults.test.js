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
  options: 'ABCDE'.split('').map(label => ({ id: `${id}-${label}`, text: `<b>(${label})</b> ${id} sentence ${label}` })),
  positions: [2, 3, 4, 5, 6].map((position, index) => ({ key: `${id}:q${index + 1}`, position })) });
const papers = {
  1: { passage: 'Choose [1] in this passage.', questions: [{ key: 'p1:q1', position: 1, options: [{ id: 'o0', text: 'correct word' }, { id: 'o1', text: 'wrong word' }] }] },
  2: { texts: [text('t1'), text('t2')] },
  3: { speakers: [{ id: 'speaker1', name: 'A', post: 'Person A enjoys reading.' }, { id: 'speaker2', name: 'B', post: 'Person B enjoys cycling.' }],
    questions: [{ key: 'p3:q1', statement: 'Who enjoys reading?' }] },
  4: { title: 'An article', headings: [{ id: 'h1', text: 'Correct heading' }, { id: 'h2', text: 'Wrong heading' }],
    paragraphs: ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'].map((word, index) => ({
      key: `p4:q${index + 1}`, label: `Paragraph ${String.fromCharCode(65 + index)}`, content: `${word} paragraph` })), },
};

function harness(kind, { practice = false, part = 2, page = 1, question = '', outcome = 'INCORRECT', error = '', full = true, standard = false, estimate = null, score = 3 } = {}) {
  const fixturePapers = standard ? { ...papers,
    1: { ...papers[1], questions: Array.from({ length: 5 }, (_, index) => ({ ...papers[1].questions[0], key: `p1:q${index + 1}` })) },
    3: { ...papers[3], questions: Array.from({ length: 7 }, (_, index) => ({ ...papers[3].questions[0], key: `p3:q${index + 1}` })) },
  } : papers;
  const rows = Object.entries(fixturePapers).flatMap(([number, paper]) => presentation.readingReviewPages(paper, Number(number)).flatMap(page => page.rows.map(row => ({ ...row, partNumber: Number(number) }))));
  const items = rows.map(row => ({ key: row.key, partNumber: row.partNumber, outcome,
    selectedAnswer: outcome === 'SKIPPED' ? null : { kind: row.partNumber === 1 ? 'CHOICE' : 'MATCH', optionId: row.options[1].id },
    selectedAnswerText: outcome === 'SKIPPED' ? null : row.options[1].text }));
  const data = { title: 'Reading exercise', scope: full ? 'FULL_SKILL' : 'PART', score, maxScore: 29, estimatedCefr: estimate?.level ?? null, cefrEstimate: estimate, result: {
    parts: (full ? [1, 2, 3, 4] : [part]).map(partNumber => ({ partNumber, score: 1, maxScore: 5 })),
    counts: { correct: 3, incorrect: 24, skipped: 2 }, items,
    assistance: { revealedKeys: practice ? ['p2:q1'] : [] },
  } };
  const h = { url: { part, page, question }, navigated: [], apiCalls: [], effects: [], scrolled: [] };
  const mocks = {
    react: { useMemo: factory => factory(), useEffect: effect => h.effects.push(effect) }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { useNavigate: () => href => h.navigated.push(href),
      useSearchParams: () => [new URLSearchParams(`attemptId=attempt-1${practice ? '&practice=true' : ''}`)] },
    '../../test-attempts/hooks/useAttemptResult.js': {
      useAttemptResult: (_id, component) => { h.apiCalls.push(component); return { data, loading: false, error }; },
      useAttemptPartResult: (_id, activePart, component) => {
        h.apiCalls.push(component);
        return { loading: false, data: { paper: fixturePapers[activePart], items: rows.filter(row => row.partNumber === activePart).map(row => ({ key: row.key,
          selectedAnswer: outcome === 'SKIPPED' ? null : { kind: row.partNumber === 1 ? 'CHOICE' : 'MATCH', optionId: row.options[outcome === 'CORRECT' ? 0 : 1].id }, correctAnswer: row.options[0].id, explanation: `Reason for ${row.key}`,
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
  runInNewContext(files[kind], { module, require: name => mocks[name], URLSearchParams,
    document: { getElementById: id => ({ scrollIntoView: options => h.scrolled.push({ id, ...options }) }) } });
  h.render = () => module.exports.default();
  return h;
}

for (const practice of [false, true]) for (const [outcome, label, symbol] of [['CORRECT', 'Correct', '✓'], ['INCORRECT', 'Incorrect', '✕'], ['SKIPPED', 'Skipped', '—']]) {
  test(`Full Reading ${practice ? 'Practice' : 'Test'} renders five compact columns and accessible ${label} markers`, () => {
    const h = harness('summary', { practice, standard: true, outcome });
    const nodes = walk(h.render());
    assert.ok(nodes.some(node => node.props?.className?.includes('fullPracticeOverview')));
    const columns = nodes.filter(node => node.type === 'div' && node.props.className?.startsWith('partColumn'));
    assert.deepEqual(columns.map(column => walk(column).filter(node => node.type === 'button').length), [5, 5, 5, 7, 7]);
    assert.deepEqual(columns.map(column => textContent(walk(column).find(node => node.type === 'h3'))), ['Part  1', 'Part  2', 'Part  2', 'Part  3', 'Part  4']);
    const rows = nodes.filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Question '));
    assert.equal(rows.length, 29);
    assert.ok(rows.every(row => row.props['aria-label'].endsWith(label)));
    assert.ok(rows.every(row => textContent(row).includes(symbol)));
    assert.ok(!nodes.some(node => node.props?.className?.startsWith('statusLabel')));
    const answer = column => walk(columns[column]).find(node => node.props?.className === 'userAns').props.children;
    assert.equal(answer(0), outcome === 'SKIPPED' ? '—' : 'wrong word');
    assert.equal(answer(1), outcome === 'SKIPPED' ? '—' : 'B');
    assert.equal(answer(2), outcome === 'SKIPPED' ? '—' : 'B');
    assert.equal(answer(3), outcome === 'SKIPPED' ? '—' : 'B');
    assert.equal(answer(4), outcome === 'SKIPPED' ? '—' : 'Wrong heading');
    rows[10].props.onClick();
    assert.match(h.navigated[0], /part=2&question=t2%3Aq1/);
    assert.equal(h.navigated[0].includes('practice=true'), practice);
    const detail = harness('detail', { practice, standard: true, part: 2, question: 't2:q1' });
    assert.match(textContent(detail.render()), /Opening t2/);
  });
}

test('single-part results retain full selected answer text and status labels', () => {
  for (const options of [{ practice: false, full: false }, { practice: true, full: false }]) {
    const nodes = walk(harness('summary', options).render());
    assert.ok(!nodes.some(node => node.props?.className?.includes('fullPracticeOverview')));
    assert.ok(nodes.some(node => node.props?.className?.startsWith('statusLabel')));
    const columns = nodes.filter(node => node.type === 'div' && node.props.className?.startsWith('partColumn'));
    assert.equal(columns.length, 1);
  }
});

for (const practice of [false, true]) {
  test(`${practice ? 'Practice' : 'Test'} summary displays scores, part statistics and navigates to its own result flow`, () => {
    const h = harness('summary', { practice });
    const tree = h.render(), nodes = walk(tree), content = textContent(tree);
    assert.match(content, /Answer overview/); assert.match(content, /Statistics/); assert.match(content, /3\s*\/\s*29/);
    assert.match(content, practice ? /CEFR Level/ : /Not converted/);
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

for (const practice of [false, true]) test(`${practice ? 'Practice Full Test' : 'Reading Test'} retains estimated CEFR and raw score without explanatory text`, () => {
  const estimate = { kind: 'PRACTICE_ESTIMATE', level: 'B2', bands: [
    { level: 'A1', minimumPercentage: 0 }, { level: 'A2', minimumPercentage: 30 },
    { level: 'B1', minimumPercentage: 50 }, { level: 'B2', minimumPercentage: 70 }, { level: 'C', minimumPercentage: 90 },
  ] };
  const tree = harness('summary', { practice, estimate, score: 21 }).render();
  const content = textContent(tree);
  assert.match(content, /Estimated CEFR/);
  assert.match(content, /B2/);
  assert.match(content, /Score:\s*21\s*\/\s*29/);
  assert.doesNotMatch(content, /AptiMate practice estimate|How is this estimated|Based on the percentage|without rounding up|to below/);
  assert.equal(walk(tree).filter(node => node.type === 'details').length, 0);
});

test('single-part Reading practice retains raw score rather than a full-skill CEFR band', () => {
  const tree = harness('summary', { practice: true, full: false }).render();
  assert.match(textContent(tree), /Practice score/);
  assert.doesNotMatch(textContent(tree), /Estimated CEFR|How is this estimated/);
});

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

for (const [outcome, label, symbol] of [['CORRECT', 'Correct', '✓'], ['INCORRECT', 'Incorrect', '✕'], ['SKIPPED', 'Skipped', '—']]) {
  test(`Part 2 practice overview shows the selected sentence and ${label} status`, () => {
    const h = harness('summary', { practice: true, full: false, outcome });
    const nodes = walk(h.render());
    const rows = nodes.filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Question '));
    assert.equal(rows.length, 10);
    assert.match(textContent(rows[0]), outcome === 'SKIPPED' ? /—/ : /t1 sentence B/);
    assert.match(textContent(rows[5]), outcome === 'SKIPPED' ? /—/ : /t2 sentence B/);
    for (const row of rows) {
      assert.ok(textContent(row).includes(label));
      assert.ok(textContent(row).includes(symbol));
      assert.ok(!textContent(row).includes('Answered'));
      assert.ok(!textContent(row).includes('<b>'));
      assert.ok(!textContent(row).includes('</b>'));
    }
    rows[5].props.onClick();
    assert.match(h.navigated[0], /practice=true&part=2&question=t2%3Aq1/);
  });
}

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

for (const practice of [false, true]) for (const part of [1, 2, 3]) test(`Part ${part} ${practice ? 'practice' : 'test'} places an expanded explanation below both answer fields in each card`, () => {
  const nodes = walk(harness('detail', { practice, part }).render());
  const cards = nodes.filter(node => node.type === 'article' && node.props['aria-label']?.startsWith('Question '));
  assert.equal(cards.length, part === 2 ? 5 : 1);
  for (const card of cards) {
    assert.match(card.props.className, /matchingPracticeCard/);
    const children = [card.props.children].flat(Infinity).filter(child => child && typeof child === 'object');
    const answersIndex = children.findIndex(child => child.props.className === 'answerColumn');
    const explanationIndex = children.findIndex(child => child.props['aria-label'] === 'Answer explanation');
    assert.ok(explanationIndex > answersIndex);
    assert.match(textContent(children[answersIndex]), /Your answer/);
    assert.match(textContent(children[answersIndex]), /Correct answer/);
    const explanation = walk(children[explanationIndex]).find(node => node.type === 'explanation');
    assert.equal(explanation.props.open, true);
    assert.ok(explanation.props.text.startsWith('Reason for'));
  }
});

for (const practice of [false, true]) for (const part of [1, 2, 3, 4]) test(`Part ${part} ${practice ? 'practice' : 'test'} stacks its text above the entire answer detail section`, () => {
  const nodes = walk(harness('detail', { practice, part }).render());
  const layout = nodes.find(node => node.type === 'div' && node.props.className?.includes('matchingPracticeLayout'));
  assert.ok(layout);
  const sections = [layout.props.children].flat(Infinity).filter(Boolean);
  assert.match(textContent(sections[0]), part === 1 ? /Choose/ : part === 2 ? /Opening t1/ : part === 3 ? /Person A enjoys reading/ : /First paragraph/);
  assert.match(textContent(sections[0]), part === 1 ? /wrong word/ : part === 2 ? /Correct reading order/ : part === 3 ? /Person B enjoys cycling/ : /Seventh paragraph/);
  assert.equal(sections[1].props['aria-label'], 'Answers and explanations');
  assert.match(textContent(sections[1]), /Your answer/);
});

test('all Reading test parts use the same expanded explanation component as practice', () => {
  for (const part of [1, 2, 3, 4]) {
    const practice = false;
    const nodes = walk(harness('detail', { practice, part }).render());
    assert.ok(nodes.some(node => node.props?.['aria-label'] === 'Answer explanation'));
    assert.ok(nodes.filter(node => node.type === 'explanation').every(node => node.props.open === true));
  }
});

for (const [outcome, label] of [['CORRECT', 'Correct'], ['INCORRECT', 'Incorrect'], ['SKIPPED', 'Skipped']]) {
  test(`Part 1 practice overview shows the chosen word and ${label} status`, () => {
    const h = harness('summary', { practice: true, full: false, part: 1, outcome });
    const rows = walk(h.render()).filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Question '));
    assert.equal(rows.length, 1);
    assert.ok(textContent(rows[0]).includes(outcome === 'SKIPPED' ? '—' : 'wrong word'));
    assert.ok(textContent(rows[0]).includes(label));
    rows[0].props.onClick();
    assert.match(h.navigated[0], /practice=true&part=1&question=p1%3Aq1/);
  });
}

test('Part 1 practice uses the same focused answer and explanation layout as Part 2', () => {
  const nodes = walk(harness('detail', { practice: true, part: 1 }).render());
  assert.ok(!nodes.some(node => node.props?.className === 'optionsList'));
  assert.ok(nodes.some(node => node.type === 'explanation' && node.props.open === true));
  const exam = walk(harness('detail', { practice: false, part: 1 }).render());
  assert.ok(!exam.some(node => node.props?.className === 'optionsList'));
  assert.ok(exam.some(node => node.type === 'explanation' && node.props.open === true));
});

for (const [outcome, label, symbol] of [['CORRECT', 'Correct', '✓'], ['INCORRECT', 'Incorrect', '✕'], ['SKIPPED', 'Skipped', '—']]) {
  test(`Part 3 practice overview shows the chosen speaker and ${label} status`, () => {
    const h = harness('summary', { practice: true, full: false, part: 3, outcome });
    const rows = walk(h.render()).filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Question '));
    assert.equal(rows.length, 1);
    const content = textContent(rows[0]);
    assert.ok(content.includes(outcome === 'SKIPPED' ? '—' : 'B'));
    assert.ok(content.includes(label));
    assert.ok(content.includes(symbol));
    assert.ok(!content.includes('Answered'));
    assert.ok(!content.includes('speaker2'));
    rows[0].props.onClick();
    assert.match(h.navigated[0], /practice=true&part=3&question=p3%3Aq1/);
  });
}

for (const [outcome, label] of [['CORRECT', 'Correct'], ['INCORRECT', 'Incorrect'], ['SKIPPED', 'Skipped']]) {
  test(`Part 4 practice overview shows its selected heading and ${label} status`, () => {
    const h = harness('summary', { practice: true, full: false, part: 4, outcome });
    const rows = walk(h.render()).filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Question '));
    assert.equal(rows.length, 7);
    for (const row of rows) {
      assert.ok(textContent(row).includes(outcome === 'SKIPPED' ? '—' : 'Wrong heading'));
      assert.ok(textContent(row).includes(label));
      assert.ok(!textContent(row).includes('Answered'));
    }
    rows[6].props.onClick();
    assert.match(h.navigated[0], /practice=true&part=4&question=p4%3Aq7/);
  });
}

for (const practice of [false, true]) test(`Part 4 ${practice ? 'practice' : 'test'} combines all seven paragraphs, answers and explanations on one page`, () => {
  const h = harness('detail', { practice, part: 4, full: false, question: 'p4:q7' });
  const nodes = walk(h.render());
  const layout = nodes.find(node => node.type === 'div' && node.props.className?.includes('contentRow'));
  assert.ok(layout);
  assert.ok(layout.props.className.includes('matchingPracticeLayout'));
  const columns = [layout.props.children].flat(Infinity).filter(Boolean);
  assert.match(textContent(columns[0]), /First paragraph/);
  assert.match(textContent(columns[0]), /Seventh paragraph/);
  assert.equal(columns[1].props['aria-label'], 'Answers and explanations');
  const cards = nodes.filter(node => node.type === 'article' && node.props['aria-label']?.startsWith('Question '));
  for (const card of cards) {
    assert.ok(card.props.className.includes('partFourPracticeCard'));
    const children = [card.props.children].flat(Infinity).filter(child => child && typeof child === 'object');
    assert.ok(children.some(child => child.props.className === 'answerColumn'));
    const explanation = children.find(child => child.props['aria-label'] === 'Answer explanation');
    assert.ok(explanation);
    assert.equal(walk(explanation).find(node => node.type === 'explanation').props.open, true);
  }
  assert.equal(nodes.filter(node => node.type === 'article' && node.props['aria-label']?.startsWith('Question ')).length, 7);
  assert.equal(nodes.filter(node => node.type === 'explanation').length, 7);
  assert.ok(nodes.some(node => node.props?.id === 'p4:q7' && node.props['data-focused']));
  assert.match(textContent(h.render()), /First paragraph/);
  assert.match(textContent(h.render()), /Seventh paragraph/);
  assert.doesNotMatch(textContent(h.render()), /Page \d+\//);
  const footer = nodes.find(node => node.type === 'footer');
  assert.equal(footer.props.currentPageQuestionIds.length, 7);
  assert.equal(footer.props.hasPrev, false);
  assert.equal(footer.props.hasNext, false);
  h.effects.forEach(effect => effect());
  assert.equal(h.scrolled.at(-1).id, 'p4:q7');
  footer.props.onQuestionClick('p4:q3');
  assert.equal(h.url.page, 1);
  assert.ok(walk(h.render()).some(node => node.props?.id === 'p4:q3' && node.props['data-focused']));
  h.effects.at(-1)();
  assert.equal(h.scrolled.at(-1).id, 'p4:q3');
});
