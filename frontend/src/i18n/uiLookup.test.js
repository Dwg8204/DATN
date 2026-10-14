import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createUiLookup, translateUiText, translateUiErrorText, normalizeUiText } from './uiLookup.js';

const en = JSON.parse(readFileSync(new URL('./locales/en.json', import.meta.url), 'utf8'));
const vi = JSON.parse(readFileSync(new URL('./locales/vi.json', import.meta.url), 'utf8'));
function flatten(object, prefix = '', result = {}) {
  for (const [name, value] of Object.entries(object)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (typeof value === 'string') result[key] = value;
    else flatten(value, key, result);
  }
  return result;
}
const english = flatten(en), vietnamese = flatten(vi), lookup = createUiLookup(en, vi);
const t = (resource, key, values = {}) => resource[key].replace(/\{\{(\w+)\}\}/g, (match, name) => values[name] ?? match);

test('English and Vietnamese have matching nonempty keys and interpolation tokens', () => {
  assert.deepEqual(Object.keys(english).sort(), Object.keys(vietnamese).sort());
  for (const key of Object.keys(english)) {
    assert.ok(english[key].trim(), key);
    assert.ok(vietnamese[key].trim(), key);
    const tokens = text => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
    assert.deepEqual(tokens(english[key]), tokens(vietnamese[key]), key);
  }
});

test('static UI lookups localize both source languages and dynamic labels without altering unknown content', () => {
  const trVi = (text, values) => translateUiText(lookup, (key, vars) => t(vietnamese, key, vars), text, values);
  const trEn = text => translateUiText(lookup, (key, vars) => t(english, key, vars), text);
  assert.equal(trVi('Create test'), 'Tạo đề');
  assert.equal(trEn('Đang nộp bài'), 'Submitting your test');
  assert.equal(trVi('Question {{value0}}', { value0: 3 }), 'Câu 3');
  assert.equal(trVi('Answer for gap 4'), 'Đáp án cho chỗ trống 4');
  assert.equal(trVi('My actual English answer.'), 'My actual English answer.');
  assert.equal(trVi(' Writing '), ' Viết ');
  assert.equal(trVi(42), 42);
  assert.equal(translateUiErrorText(lookup, (key, vars) => t(vietnamese, key, vars), 'Question 1: question content is required'), 'Câu 1: cần nhập nội dung câu hỏi');
});

test('every literal passed to the UI translator has a paired JSON translation', () => {
  const root = fileURLToPath(new URL('../', import.meta.url)), missing = [];
  function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (file.endsWith('.jsx') && !file.includes('.test.')) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/\bui(?:Feedback)?\(\s*("(?:\\.|[^"\\])*")/g)) {
          const text = JSON.parse(match[1]);
          if (!lookup.has(normalizeUiText(text))) missing.push({ file: path.relative(root, file), text });
        }
      }
    }
  }
  scan(root);
  assert.deepEqual(missing, []);
});
