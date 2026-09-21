import assert from 'node:assert/strict';
import test from 'node:test';
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
