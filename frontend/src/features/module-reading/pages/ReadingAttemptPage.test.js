import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { part2AttemptChanges } from '../utils/part2Placement.js';
import { applyLocalChanges } from '../../test-attempts/utils/attemptSavePolicy.js';

const compiled = transformSync(readFileSync(new URL('./ReadingAttemptPage.jsx', import.meta.url), 'utf8'),
  { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const jsx = (type, props) => ({ type, props });
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
const match = optionId => ({ kind: 'MATCH', optionId });
const provider = () => null, component = { __esModule: true, default: () => null };
const part = { texts: ['t1', 't2'].map(id => ({ id, title: id, openingSentence: 'Opening.',
  options: 'ABCDE'.split('').map(label => ({ id: `${id}-${label}`, text: `Sentence ${label}` })),
  positions: [2, 3, 4, 5, 6].map(position => ({ key: `${id}:q${position}`, position })),
})) };

function harness(isPractice) {
  let answers = {}, batches = 0;
  const mocks = {
    react: { useMemo: factory => factory(), useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { useNavigate: () => () => {}, useParams: () => ({ part: 'part2' }),
      useSearchParams: () => [new URLSearchParams('attemptId=test')] },
    '../../test-attempts/context/testAttemptContextStore.js': { useTestAttempt: () => ({ answers, isPractice,
      attemptId: 'test', paper: { title: 'Reading', mode: 'full', parts: { 2: part } }, loading: false,
      setAnswer: () => { throw new Error('Part 2 must use one batch, not separate single-answer writes'); },
      setAnswerBatch: update => { batches += 1; answers = applyLocalChanges(answers, update(answers)); },
    }) },
    '../context/ReadingTestContext.jsx': { ReadingTestContext: { Provider: provider } },
    '../utils/part2Placement.js': { part2AttemptChanges },
    './ReadingAttemptPage.module.css': { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) },
    '../../../components/common/InstructionBlock.jsx': component, '../../../components/layout/TestFooter.jsx': component,
    '../../../components/shared/SubmitModal/SubmitModal.jsx': component,
    '../../practice/components/PracticeAnswerReveal.jsx': component,
    '../../test-attempts/components/AttemptPageState.jsx': { AttemptPageState: () => null, SaveIndicator: () => null },
    '../components/test-engine/parts/Part1GapFilling.jsx': component,
    '../components/test-engine/parts/Part2TextCohesion.jsx': component,
    '../components/test-engine/parts/Part3OpinionMatch.jsx': component,
    '../components/test-engine/parts/Part4MatchHeading.jsx': component,
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => mocks[name], URLSearchParams });
  return { get answers() { return answers; }, get batches() { return batches; },
    context: () => walk(module.exports.default()).find(node => node.type === provider).props.value };
}

for (const isPractice of [false, true]) {
  test(`${isPractice ? 'Practice' : 'Test'} Part 2 keeps placements, swaps, and both texts isolated`, () => {
    const h = harness(isPractice);
    h.context().handleSentencePlacement('t1-A', 2);
    h.context().handleSentencePlacement('t1-B', 3);
    h.context().handleSentencePlacement('t2-A', 2);
    h.context().handleSentencePlacement('t1-A', 3);
    assert.deepEqual(h.answers, { 't1:q2': match('t1-B'), 't1:q3': match('t1-A'), 't2:q2': match('t2-A') });
    h.context().handleSentencePlacement('t1-C', 3);
    assert.deepEqual(h.answers, { 't1:q2': match('t1-B'), 't1:q3': match('t1-C'), 't2:q2': match('t2-A') });
    const current = h.context();
    assert.equal(current.answers['t1-C'], 3); assert.equal(current.answers['t2-A'], 2);
    assert.equal(current.answers['t1-A'], undefined);
    assert.equal(h.batches, 5);
  });
}
