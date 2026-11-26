import test from 'node:test';
import assert from 'node:assert/strict';
import { trackReturnPage } from './returnPage.js';

function journey(pathname, search = '') {
  let key = 0, update;
  const history = {state: {idx: 0}, replaceState(state) { this.state = state; }};
  trackReturnPage({state: {location: {key, pathname, search, hash: ''}}, subscribe(fn) {update = fn;}}, history);
  return (pathname, historyAction = 'PUSH', search = '') => {
    history.state = {idx: history.state.idx + Number(historyAction === 'PUSH')};
    update({location: {key: ++key, pathname, search, hash: ''}, historyAction});
    return history.state.returnPage?.href;
  };
}

test('history filters survive direct detailed review and question changes', () => {
  const go = journey('/profile/history', '?type=PRACTICE&page=2');
  assert.equal(go('/reading/detail-result'), '/profile/history?type=PRACTICE&page=2');
  assert.equal(go('/reading/detail-result', 'REPLACE', '?part=2'), '/profile/history?type=PRACTICE&page=2');
});
test('submission skips introduction and all attempt steps; details return to score', () => {
  const go = journey('/profile/dashboard');
  go('/reading/introduction');
  go('/reading/test/part1');
  go('/reading/test/part2');
  assert.equal(go('/reading/result', 'REPLACE', '?attemptId=abc'), '/profile/dashboard');
  assert.equal(go('/reading/detail-result'), '/reading/result?attemptId=abc');
});
