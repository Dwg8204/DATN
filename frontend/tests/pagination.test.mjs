import test from 'node:test';
import assert from 'node:assert/strict';
import { getPagination, isValidPageInput, pageNumbers, paginate } from '../src/components/common/paginationUtils.js';

test('pagination supports arbitrary page sizes and clamps after deletion', () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(paginate(items, 2, 7).items, [8, 9, 10, 11, 12, 13, 14]);
  assert.deepEqual(paginate(items, 4, 7).items, [22, 23]);
  assert.equal(paginate(items.slice(0, 14), 4, 7).page, 2);
  assert.deepEqual(paginate([], 8, 5), { items: [], totalPages: 1, page: 1 });
  assert.equal(getPagination(10, -1, 5).current, 1);
});

test('page input rejects fractions, negative, empty and out-of-range values', () => {
  for (const value of ['', '0', '-1', '1.5', '11', 'abc', 'Infinity']) assert.equal(isValidPageInput(value, 10), false);
  assert.equal(isValidPageInput('7', 10), true);
});

test('page numbers stay compact and include boundary and active pages', () => {
  assert.deepEqual(pageNumbers(1, 1), [1]);
  assert.deepEqual(pageNumbers(50, 100), [1, 'gap-49', 49, 50, 51, 'gap-100', 100]);
  assert.ok(pageNumbers(100, 100).includes(100));
});
