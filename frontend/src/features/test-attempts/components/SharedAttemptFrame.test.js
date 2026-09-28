import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('./SharedAttemptFrame.jsx', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const settle = async () => { for (let step = 0; step < 20; step += 1) await Promise.resolve(); };

test('expired attempt pauses after bounded failures and resumes on reconnection', async () => {
  let cursor = 0;
  const slots = [];
  let effects = [];
  const timers = [];
  const online = new Set();
  const errors = [];
  const destinations = [];
  let submitCalls = 0;
  let connected = false;
  let approved = false;
  const hooks = {
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, position) => value !== slots[index].dependencies[position])) {
        slots[index] = { callback, dependencies };
      }
      return slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, position) => value !== slots[index].dependencies[position])) {
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const attempt = { status: 'IN_PROGRESS', canAnswer: false };
  const context = {
    attemptId: 'attempt-1', attempt, submissionState: 'idle',
    submit: async () => {
      submitCalls += 1;
      if (!connected) throw new Error('Offline');
      attempt.status = 'SUBMITTED';
      attempt.canAnswer = false;
      return { status: 'SUBMITTED' };
    },
    reconcileSubmission: async () => null,
    approveNavigation: () => { approved = true; },
    isNavigationApproved: () => approved,
  };
  const toast = { showError: error => errors.push(error) };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: hooks,
    'react-router-dom': { useNavigate: () => destination => destinations.push(destination) },
    '../../../components/layout/TestLayout.jsx': { default: () => null },
    '../../../context/ToastContext.jsx': { useToast: () => toast },
    './AttemptNavigationGuard.jsx': { default: () => null },
    '../../practice/components/DictionaryPopover.jsx': { default: () => null },
    '../context/testAttemptContextStore.js': { useAttemptTimer: () => 0, useTestAttempt: () => context },
    '../utils/attemptTime.js': { formatRemainingTime: () => '00:00' },
    './SharedAttemptFrame.module.css': { default: { recovery: 'recovery' } },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => mocks[name],
    window: { setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
      addEventListener: (name, callback) => { if (name === 'online') online.add(callback); },
      removeEventListener: (name, callback) => { if (name === 'online') online.delete(callback); } } });
  const navigate = destination => destinations.push(destination);
  mocks['react-router-dom'].useNavigate = () => navigate;
  const render = () => {
    cursor = 0;
    module.exports.default({ resultPath: '/writing/result', testPathPrefix: '/writing/test/' });
    const commits = effects;
    effects = [];
    commits.forEach(commit => commit());
  };
  render();
  await settle();
  while (timers.length) {
    timers.shift().callback();
    await settle();
  }
  render();
  assert.equal(submitCalls, 5);
  assert.equal(timers.length, 0);
  assert.equal(errors.length, 1);
  connected = true;
  for (const callback of online) callback();
  render();
  await settle();
  render();
  assert.equal(submitCalls, 6);
  assert.equal(destinations[0], '/writing/result?attemptId=attempt-1&timedOut=true');
  slots.forEach(slot => slot?.cleanup?.());
});
