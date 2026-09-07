import test from 'node:test';
import assert from 'node:assert/strict';
import { getPassageHtml, htmlToLegacyPassage, legacyPassageToHtml, splitFormattedPassage } from '../src/features/admin/reading/utils/richPassage.js';

test('legacy Reading Part 1 passages remain compatible with the rich editor', () => {
  const legacy = 'First [1] line.\nSecond [2] line with [3], [4] and [5].';
  const html = legacyPassageToHtml(legacy);
  assert.match(html, /data-gap="1"/);
  assert.equal(htmlToLegacyPassage(html), legacy);
});

test('formatted passage splits into text and five ordered gap tokens', () => {
  const part = { passageHtml: '<p>Before <strong>bold</strong> <span data-gap="1" contenteditable="false">Gap 1</span> after.</p>' };
  const segments = splitFormattedPassage(part);
  assert.deepEqual(segments.map(segment => segment.gap).filter(Boolean), [1]);
  assert.match(segments[0].html, /strong/);
});

test('plain passage is safely escaped before rendering', () => {
  assert.match(getPassageHtml({ passage: '<script>alert(1)</script> [1]' }), /&lt;script&gt;/);
});
