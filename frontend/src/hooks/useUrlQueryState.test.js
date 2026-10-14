import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { queryParam, readUrlQueryState } from './useUrlQueryState.js';

const schema = {
  skill: queryParam.enum(['Reading', 'Writing'], 'Reading'),
  query: { ...queryParam.string(''), param: 'q' },
  page: queryParam.positiveInt(1, 50),
};

test('URL state restores valid tabs, filters and pagination', () => {
  const state = readUrlQueryState(new URLSearchParams('skill=Writing&q=essay&page=4'), schema);
  assert.deepEqual(state, { skill: 'Writing', query: 'essay', page: 4 });
});

test('URL state rejects invalid enum and page values', () => {
  const state = readUrlQueryState(new URLSearchParams('skill=Unknown&page=999'), schema);
  assert.deepEqual(state, { skill: 'Reading', query: '', page: 1 });
});

test('Dashboard changes skill and resets part in one URL update', () => {
  const compiled = transformSync(readFileSync(new URL('../features/profile/pages/DashboardPage.jsx', import.meta.url), 'utf8'),
    { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
  const patches = [];
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const dummy = () => null;
  runInNewContext(compiled, { module, AbortController, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useState: initial => [initial, dummy], useEffect: dummy };
    if (name === 'react-i18next') return { useTranslation: () => ({ t: text => text }) };
    if (name.includes('useUiTranslation')) return { useUiTranslation: () => text => text };
    if (name.includes('useUrlQueryState')) return { __esModule: true, default: () => [{ skillFilter: 'all', partFilter: 'part3', dateFilter: '30' }, patch => patches.push(patch)], queryParam };
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) };
    return new Proxy({ __esModule: true, default: dummy }, { get: (target, key) => target[key] ?? dummy });
  } });
  const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
  const button = walk(module.exports.default()).find(node => node.type === 'button' && [node.props.children].flat(Infinity).includes('nav.speaking'));
  button.props.onClick();
  assert.equal(patches.length, 1);
  assert.equal(patches[0].skillFilter, 'speaking');
  assert.equal(patches[0].partFilter, 'all');
});
