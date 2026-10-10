import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const compiled = transformSync(readFileSync(new URL('./DictationPage.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const ConfirmModal = () => null;
const jsx = (type, props) => ({ type, props });
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function harness(tab = 'words', topicMode = null) {
  let cursor = 0, effects = [], saving = false, owner = 'user-1', remove = async () => ({ deleted: true });
  const slots = [], calls = [], errors = [], spoken = [];
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect, deps) { const index = cursor++; if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) { slots[index] = { deps }; effects.push(effect); } },
  };
  const query = new URLSearchParams({ mode: 'notebook', tab });
  if (topicMode) { query.set('mode', topicMode); query.set('topic', 'topic-1'); }
  const word = { id: 'word-entry', notebookId: 'notebook-word', word: 'look after', meaning: 'chăm sóc', topic: 'Daily life', type: 'phrase' };
  const sentence = { id: 'exercise-id', notebookId: 'notebook-sentence', title: 'My morning', transcript: 'I wake up early.', topic: 'Daily life' };
  word.folderId = sentence.folderId = 'topic-1';
  const component = { __esModule: true, default: () => null };
  const mocks = {
    react: hooks,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-router-dom': { Link: () => null, useSearchParams: () => [query, updater => { const next = typeof updater === 'function' ? updater(query) : new URLSearchParams(updater); for (const key of [...query.keys()]) query.delete(key); next.forEach((value, key) => query.set(key, value)); }] },
    'react-i18next': { useTranslation: () => ({ t: (key, values) => `${key}${values?.name ? `:${values.name}` : ''}` }) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '../../../components/common/Pagination': component,
    '../../../components/common/AnswerSelect': component,
    '../../../components/common/ConfirmModal': { __esModule: true, default: ConfirmModal },
    '../../../context/AuthContext': { useAuth: () => ({ user: { id: owner }, isAuthReady: true }) },
    '../../../context/ToastContext': { useToast: () => ({ showError: message => errors.push(message), showSuccess() {}, showInfo() {}, dismissToast() {} }) },
    '../hooks/useStudyData': { useStudyData: () => ({ data: { topics: [{ id: 'topic-1', name: 'Daily life' }], words: [word], exercises: [sentence], progress: {}, ratings: {} }, loading: false, saving, mutate: async operation => { saving = true; try { return await operation(); } finally { saving = false; } } }) },
    '../services/studyApi': { studyApi: { remove: id => { calls.push(id); return remove(); } } },
    '../utils/legacyStudyImport': { hasLegacyStudyData: () => false },
    '../../../services/apiError': { normalizeApiError: cause => ({ message: cause.message }) },
    './DictationPage.module.css': { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) },
    '../components/VocabularyWordInput': component,
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; }, URLSearchParams,
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    window: { speechSynthesis: { cancel() {}, speak: utterance => spoken.push(utterance) }, addEventListener() {}, removeEventListener() {}, localStorage: { getItem: () => null }, confirm: () => { throw new Error('Native confirmation must not be used'); } } });
  return {
    word, sentence, calls, errors, query, spoken,
    setRemove: handler => { remove = handler; },
    setOwner: value => { owner = value; },
    render() { cursor = 0; effects = []; const tree = module.exports.default(); effects.forEach(effect => effect()); return walk(tree); },
    modal() { return this.render().find(node => node.type === ConfirmModal)?.props; },
    open() { const nodes = this.render(); nodes.find(node => node.props?.className === 'deleteSavedItem').props.onClick(); return this.modal(); },
  };
}

test('word/phrase deletion opens the shared popup, cancel never calls the API', () => {
  const h = harness(), popup = h.open();
  assert.equal(popup.title, 'dictation.deleteWordTitle');
  assert.equal(popup.message, 'dictation.deleteConfirm:look after');
  assert.equal(popup.confirmText, 'dictation.deleteAction');
  assert.equal(h.calls.length, 0);
  popup.onCancel();
  assert.equal(h.modal(), undefined);
  assert.equal(h.calls.length, 0);
});

test('confirm removes only the captured notebook id and closes the popup on success', async () => {
  const h = harness();
  await h.open().onConfirm();
  assert.deepEqual(h.calls, ['notebook-word']);
  assert.equal(h.modal(), undefined);
  assert.ok(h.render().some(node => [node.props?.children].flat(Infinity).includes('dictation.itemDeleted:look after')));
});

test('saved sentences use the same popup and their notebook id, not the exercise id', async () => {
  const h = harness('sentences'), popup = h.open();
  assert.equal(popup.title, 'dictation.deleteSentenceTitle');
  assert.equal(popup.message, 'dictation.deleteConfirm:My morning');
  await popup.onConfirm();
  assert.deepEqual(h.calls, ['notebook-sentence']);
});

test('pending deletion prevents duplicate requests and cancellation', async () => {
  const h = harness(), pending = deferred(); h.setRemove(() => pending.promise);
  const popup = h.open(), first = popup.onConfirm();
  await popup.onConfirm();
  popup.onCancel();
  assert.equal(h.modal().busy, true);
  assert.deepEqual(h.calls, ['notebook-word']);
  pending.resolve({ deleted: true }); await first;
  assert.equal(h.modal(), undefined);
});

test('failed deletion keeps the popup and can be retried without a false success notice', async () => {
  const h = harness(); h.setRemove(async () => { throw new Error('offline'); });
  await h.open().onConfirm();
  assert.deepEqual(h.errors, ['offline']);
  assert.ok(h.modal());
  assert.equal(h.modal().busy, false);
  h.setRemove(async () => ({ deleted: true })); await h.modal().onConfirm();
  assert.equal(h.modal(), undefined);
});

test('account changes dismiss the previous account deletion target', async () => {
  const h = harness(); h.open(); h.setOwner('user-2'); h.render();
  assert.equal(h.modal(), undefined);
  assert.equal(h.calls.length, 0);
});

test('topic study modes hide Notebook while keeping Dictation and the four vocabulary activities', () => {
  const expected = ['dictation.dictation', 'dictation.browseWords', 'dictation.flashcard', 'dictation.quiz', 'dictation.matching'];
  for (const mode of ['dictation', 'browse', 'flashcard', 'quiz', 'matching']) {
    const h = harness('words', mode);
    const nav = h.render().find(node => node.props?.className === 'selectedTopicModes');
    assert.ok(nav, mode);
    const buttons = walk(nav).filter(node => node.type === 'button');
    assert.deepEqual(buttons.map(node => node.props.children.find(child => typeof child === 'string' && child.startsWith('dictation.'))), expected);
    assert.equal(buttons.filter(node => node.props.className === 'activeStudyMode').length, 1);
  }
});

test('remaining activities retain the selected topic and Notebook stays accessible from the landing page', () => {
  const h = harness('words', 'dictation');
  const nav = h.render().find(node => node.props?.className === 'selectedTopicModes');
  walk(nav).find(node => node.type === 'button' && node.props.children.includes('dictation.flashcard')).props.onClick();
  assert.equal(h.query.get('mode'), 'flashcard');
  assert.equal(h.query.get('topic'), 'topic-1');
  const nodes = h.render();
  nodes.find(node => node.props?.['aria-label'] === 'dictation.backToTopics').props.onClick();
  assert.equal(h.query.get('topic'), null);
  assert.ok(h.render().some(node => node.type === 'button' && [node.props?.children].flat(Infinity).includes('dictation.notebook')));
});

test('notebook word audio reads the displayed word or phrase, not its meaning or example', () => {
  const h = harness(); h.word.example = 'My colleague looks after the children.';
  h.render().find(node => node.props?.['aria-label'] === 'dictation.listenTo').props.onClick();
  assert.equal(h.spoken.length, 1);
  assert.equal(h.spoken[0].text, 'look after');
  assert.equal(h.spoken[0].lang, 'en-GB');
  assert.equal(h.spoken[0].rate, 0.85);
});

test('saved sentence audio reads the title phrase, not the longer practice transcript', () => {
  const h = harness('sentences');
  h.sentence.title = 'make progress';
  h.sentence.transcript = 'Practicing every day helps me make progress quickly.';
  h.render().find(node => node.props?.['aria-label'] === 'dictation.listenTo').props.onClick();
  assert.equal(h.spoken.length, 1);
  assert.equal(h.spoken[0].text, 'make progress');
  assert.notEqual(h.spoken[0].text, h.sentence.transcript);
});

test('Dictation exercise playback still reads the full transcript for listening practice', () => {
  const h = harness('words', 'dictation'); h.sentence.accent = 'en-GB';
  h.render().find(node => node.props?.['aria-label'] === 'dictation.playSentence').props.onClick();
  assert.equal(h.spoken.length, 1);
  assert.equal(h.spoken[0].text, h.sentence.transcript);
});
