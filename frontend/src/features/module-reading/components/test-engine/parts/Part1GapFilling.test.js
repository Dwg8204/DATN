import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('./Part1GapFilling.jsx', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const AnswerSelect = () => null;
const jsx = (type, props) => ({ type, props });
const data = { questions: Array.from({ length: 5 }, (_, i) => ({ id: `p1:q${i + 1}`, position: i + 1, options: ['a', 'b', 'c'] })) };
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];

function render(isPractice, answers = {}) {
  const changes = [], reveals = [], revealOptions = [];
  const context = { answers, handleAnswerChange: (...args) => changes.push(args), renderAnswerReveal: (id, options) => {
    revealOptions.push(options);
    reveals.push(id); return jsx('reveal', { questionKey: id });
  } };
  const mocks = {
    react: { useContext: () => context, useRef: current => ({ current }) },
    '../../../../../components/common/AnswerSelect': { __esModule: true, default: AnswerSelect },
    '../../../context/ReadingTestContext': { ReadingTestContext: {} },
    '../../../../admin/reading/utils/richPassage': { splitFormattedPassage: () => [
      { html: 'Dear Sarah, ', gap: null }, ...data.questions.map(item => ({ gap: item.position })),
    ] },
    './Part1GapFilling.module.css': { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => mocks[name] });
  const tree = module.exports.default({ data, isPractice });
  return { tree, nodes: walk(tree), changes, reveals, revealOptions };
}

test('practice places each answer reveal next to its selector inside the passage', () => {
  const { nodes, reveals, revealOptions } = render(true);
  const passage = nodes.find(node => node.props?.className === 'passage');
  assert.equal(walk(passage).filter(node => node.type === AnswerSelect).length, 5);
  assert.equal(walk(passage).filter(node => node.type === 'reveal').length, 5);
  assert.equal(nodes.filter(node => node.type === 'aside').length, 0);
  for (const question of data.questions) {
    const gap = nodes.find(node => node.props?.id === `question-${question.position}`);
    assert.equal(walk(gap).find(node => node.type === 'reveal').props.questionKey, question.id);
    assert.equal(walk(gap).find(node => node.type === AnswerSelect).props.ariaLabel, `Answer for gap ${question.position}`);
  }
  assert.deepEqual(reveals, data.questions.map(question => question.id));
  assert.ok(revealOptions.every(options => options.inline === true));
});

test('practice inline selections retain the same answer keys and selected value', () => {
  const { nodes, changes } = render(true, { 'p1:q1': 'b' });
  const selector = nodes.find(node => node.type === AnswerSelect && node.props.ariaLabel === 'Answer for gap 1');
  assert.equal(selector.props.value, 'b');
  selector.props.onChange({ target: { value: 'c' } });
  assert.deepEqual(changes, [['p1:q1', 'c']]);
  assert.equal(nodes.filter(node => node.props?.className === 'answerReveal').length, 5);
});

test('exam uses its own spacious passage panel and retains inline answer selectors', () => {
  const { tree, nodes, changes, revealOptions } = render(false, { 'p1:q1': 'a' });
  assert.equal(tree.props.className, 'part examLayout');
  assert.equal(nodes.find(node => node.type === 'h2').props.children, 'Reading passage');
  assert.ok(revealOptions.every(options => options.inline === false));
  assert.equal(nodes.filter(node => node.type === 'aside').length, 0);
  const passage = nodes.find(node => node.props?.className === 'passage');
  assert.equal(walk(passage).filter(node => node.type === AnswerSelect).length, 5);
  const selector = walk(passage).find(node => node.type === AnswerSelect);
  assert.equal(selector.props.value, 'a');
  selector.props.onChange({ target: { value: 'c' } });
  assert.deepEqual(changes, [['p1:q1', 'c']]);
  assert.equal(render(true).tree.props.className, 'part practiceLayout');
});
