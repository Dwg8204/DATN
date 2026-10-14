import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { queryParam } from '../../../hooks/useUrlQueryState.js';
import { speakingResultParts } from '../utils/speakingResultParts.js';

const criteria = { grammarVocabulary: 70, pronunciation: 60, fluency: 65, taskFulfillment: 80 };
function render(page, { view = 'student', part = 1, recorded = true, sample = 'Teacher reference', suggestion = 'AI suggestion', partLoading = false, partFeedback } = {}) {
  const patches = [];
  let partCalls = 0;
  const jsx = (type, props) => ({ type, props });
  const noop = () => null;
  const summary = { data: { title: 'Speaking test', scope: 'FULL_SKILL', estimatedCefr: 'B1', result: {
    method: 'AI', speaking: { provider: 'LLM', estimatedCefr: 'B1', criteria, cefrReason: 'Overall feedback', partFeedback },
  } } };
  const detail = { data: { paper: part === 4
    ? { responseKey: 'q', topic: 'Topic', questions: [{ text: 'Follow-up' }] }
    : { questions: [{ key: 'q', text: 'Question' }] }, items: [{ key: 'q', sampleAnswer: sample,
      selectedAnswer: recorded ? { kind: 'AUDIO', mediaKey: 'https://example.test/audio.webm' } : null,
      assessment: recorded ? { feedback: 'Feedback', transcript: 'Transcript', criteria, details: {
        suggestedAnswer: suggestion, criterionFeedback: Object.fromEntries(Object.keys(criteria).map(key => [key,
          { comment: 'Criterion feedback', strengths: ['Strength'], weaknesses: [], suggestions: [] }])) } } : null }] } };
  const module = { exports: {} };
  const code = transformSync(readFileSync(new URL(page, import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
  runInNewContext(code, { module, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return { useMemo: fn => fn() };
    if (name === 'react-router-dom') return { useNavigate: () => noop, useSearchParams: () => [new URLSearchParams('attemptId=test')] };
    if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
    if (name.includes('useUiTranslation')) return { useUiTranslation: () => text => text };
    if (name.includes('useUrlQueryState')) return { __esModule: true, default: () => [{ part, view }, patch => patches.push(patch)], queryParam };
    if (name.includes('useAttemptResult')) return { useAttemptResult: () => summary, useAttemptPartResult: () => { partCalls++; return partLoading ? { loading: true, data: null } : detail; } };
    if (name.includes('speakingResultParts')) return { speakingResultParts };
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) };
    return { __esModule: true, default: noop };
  } });
  const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
  return { nodes: walk(module.exports.default()), patches, get partCalls() { return partCalls; } };
}

test('summary retains four score rings without audio, part feedback or part API requests', () => {
  const result = render('./SpeakingAttemptResultPage.jsx');
  assert.equal(result.partCalls, 0);
  assert.equal(result.nodes.filter(node => node.type === 'svg').length, 4);
  assert.equal(result.nodes.some(node => node.type === 'audio'), false);
  assert.equal(result.nodes.some(node => node.props?.className === 'tabsRow'), false);
});

test('detail shows persisted CEFR rationale and only the selected Part summary', () => {
  const { nodes } = render('./SpeakingAttemptDetailPage.jsx', { part: 2, partFeedback: [
    { partNumber: 1, overview: 'First part', strengths: [], weaknesses: [], suggestions: [] },
    { partNumber: 2, overview: 'Second part', strengths: [], weaknesses: [], suggestions: [] },
  ] });
  assert.ok(nodes.some(node => node.props?.children === 'B1'));
  assert.ok(nodes.some(node => node.props?.children === 'Overall feedback'));
  assert.ok(nodes.some(node => node.props?.children === 'Second part'));
  assert.equal(nodes.some(node => node.props?.children === 'First part'), false);
});

test('legacy results explicitly show missing Part summary without fabricating feedback', () => {
  const { nodes } = render('./SpeakingAttemptDetailPage.jsx');
  assert.ok(nodes.some(node => node.props?.children === 'speakingDetailedFeedback.noPartFeedback'));
});

test('Your Answer includes recording and two levels of collapsed feedback', () => {
  const { nodes, patches } = render('./SpeakingAttemptDetailPage.jsx');
  assert.equal(nodes.filter(node => node.type === 'audio').length, 1);
  const disclosures = nodes.filter(node => node.type === 'details');
  assert.equal(disclosures.length, 5);
  assert.ok(disclosures.every(node => !node.props.open));
  assert.ok(disclosures[0].props.className.includes('questionFeedback'));
  assert.equal(nodes.filter(node => node.props?.className === 'criterionFeedback').length, 4);
  const partNav = nodes.find(node => node.props?.className === 'partTabs');
  assert.equal(partNav.props.children.length, 4);
  partNav.props.children[3].props.onClick();
  assert.equal(patches[0].part, 4);
});

test('changing Part keeps navigation visible without a full-page progress component or stale audio', () => {
  const { nodes } = render('./SpeakingAttemptDetailPage.jsx', { part: 2, partLoading: true });
  assert.ok(nodes.some(node => node.props?.className === 'partTabs'));
  assert.ok(nodes.some(node => node.props?.className === 'viewTabs'));
  assert.ok(nodes.some(node => node.props?.['aria-busy'] === true));
  assert.equal(nodes.some(node => node.type === 'audio'), false);
  assert.equal(nodes.some(node => node.props?.loading === true), false);
});

test('suggestion and reference tabs keep AI and teacher sources separate', () => {
  for (const view of ['ai', 'sample']) {
    const { nodes } = render('./SpeakingAttemptDetailPage.jsx', { view });
    assert.equal(nodes.some(node => node.type === 'audio' || node.type === 'details'), false);
    if (view === 'ai') {
      assert.ok(nodes.some(node => node.type === 'p' && node.props.children === 'AI suggestion'));
      assert.equal(nodes.some(node => node.props?.value === 'Teacher reference'), false);
    } else {
      assert.ok(nodes.some(node => node.props?.value === 'Teacher reference'));
      assert.equal(nodes.some(node => node.props?.children === 'AI suggestion'), false);
    }
  }
});

test('missing reference and suggestion display explicit empty states', () => {
  for (const [view, expected] of [['sample', 'writingAi.noSample'], ['ai', 'writingAi.noRevision']]) {
    const { nodes } = render('./SpeakingAttemptDetailPage.jsx', { view, sample: '', suggestion: null });
    assert.ok(nodes.some(node => node.type === 'p' && node.props.children === expected));
  }
});

test('skipped Part 4 remains selectable and displays its combined prompt without audio', () => {
  const { nodes } = render('./SpeakingAttemptDetailPage.jsx', { part: 4, recorded: false });
  assert.equal(nodes.some(node => node.type === 'audio'), false);
  assert.ok(nodes.some(node => node.props?.value === 'Topic'));
  assert.ok(nodes.some(node => node.props?.children === 'Skipped — no recording submitted'));
  assert.equal(nodes.find(node => node.props?.className === 'partTabs').props.children.length, 4);
});
