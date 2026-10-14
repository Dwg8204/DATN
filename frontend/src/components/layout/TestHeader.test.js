import { withUiTranslationMocks } from "../../../tests/helpers/mockUiTranslation.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const code = transformSync(readFileSync(new URL('./TestHeader.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
function harness(pathname, props) {
  let index = 0;
  const slots = [], destinations = [];
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  runInNewContext(code, { module, require: withUiTranslationMocks(name => ({
    react: { useState: initial => { const n = index++; if (!(n in slots)) slots[n] = typeof initial === 'function' ? initial() : initial;
      return [slots[n], next => { slots[n] = next; }]; }, useEffect: () => {} },
    'react-router-dom': { useNavigate: () => to => destinations.push(to), useLocation: () => ({ pathname }) },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    './TestHeader.module.css': { __esModule: true, default: { logoBtn: 'logoBtn', modalOverlay: 'modalOverlay', exitBtn: 'exitBtn' } },
    '../../features/module-reading/utils/readingSessionStorage': { getReadingRemainingSeconds: () => null },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  })[name]) });
  const render = () => { index = 0; return module.exports.default(props); };
  const find = (node, className) => {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.className === className) return node;
    return [node.props?.children].flat(Infinity).map(child => find(child, className)).find(Boolean);
  };
  return { render, find, destinations };
}

test('all result headers navigate directly without an exit confirmation, including Grammar and Vocabulary', () => {
  for (const pathname of ['/grammar-vocab/result-detail', '/grammar-vocab/result-detail?part=2', '/reading/detail-result',
    '/reading/review/session', '/listening/detail-result', '/writing/result-detail', '/speaking/detail-result']) {
    const h = harness(pathname, { showTimer: false, showExit: false, confirmExit: false });
    h.find(h.render(), 'logoBtn').props.onClick();
    assert.deepEqual(h.destinations, ['/']);
    assert.equal(h.find(h.render(), 'modalOverlay'), undefined);
  }
});

test('active test headers still require confirmation when the logo or Exit is clicked', () => {
  for (const button of ['logoBtn', 'exitBtn']) {
    const h = harness('/writing/test/part1', { controlledTimer: true });
    h.find(h.render(), button).props.onClick();
    assert.deepEqual(h.destinations, []);
    assert.ok(h.find(h.render(), 'modalOverlay'));
  }
});
