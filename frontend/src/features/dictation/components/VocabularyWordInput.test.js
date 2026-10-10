import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const compiled = transformSync(readFileSync(new URL('./VocabularyWordInput.jsx', import.meta.url), 'utf8'),
  { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const jsx = (type, props) => ({ type, props });
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const complete = { word: 'friend', pronunciation: '/frend/', type: 'noun', meaning: 'bạn', example: 'She is my friend.' };

function harness(knownWords = []) {
  let cursor = 0, effects = [], timerId = 0;
  const slots = [], timers = new Map(), calls = [], resolved = [];
  const item = { word: '', pronunciation: '', type: 'noun', meaning: '', example: '' };
  let get = async (_url, options) => ({ data: options.params ? { words: ['friend'], unavailable: false } : {
    entries: [{ phonetics: [{ audio: '' }, { text: '/frend/' }], meanings: [{ partOfSpeech: 'noun', definitions: [{ example: complete.example }] }] }],
    translations: [{ partOfSpeech: 'noun', terms: ['bạn'] }], examples: [],
  } });
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useId: () => 'word-input', useMemo: compute => compute(),
    useEffect(effect, deps) { const index = cursor++; if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) {
      slots[index]?.cleanup?.(); slots[index] = { deps }; effects.push(() => { slots[index].cleanup = effect(); });
    } },
  };
  const mocks = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-i18next': { useTranslation: () => ({ t: key => key }) }, 'lucide-react': { Search: () => null },
    '../../../services/api': { __esModule: true, default: { get: (url, options) => { calls.push({ url, options }); return get(url, options); } } },
    '../../../services/endpoint': { API_ENDPOINTS: { dictionary: { suggestions: '/suggestions', lookup: word => `/lookup/${word}` } } },
    './VocabularyWordInput.module.css': { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) },
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => mocks[name], AbortController, Date, Map,
    window: { setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id) } });
  return {
    item, calls, resolved, timers, setGet: callback => { get = callback; },
    render() { cursor = 0; effects = []; const tree = module.exports.default({ item, knownWords,
      onChange: word => { item.word = word; }, onResolved: (word, fields, snapshot) => {
        resolved.push({ word, fields }); if (item.word.toLowerCase() !== word) return;
        for (const key of ['pronunciation', 'type', 'meaning', 'example']) {
          if (fields[key] && item[key] === snapshot[key]) item[key] = fields[key];
        }
      } }); effects.forEach(effect => effect()); return walk(tree); },
    type(word) { this.render().find(node => node.type === 'input').props.onChange({ target: { value: word } }); return this.render(); },
    async tick() { const pending = [...timers.values()]; timers.clear(); await Promise.all(pending.map(timer => timer.fn())); },
    lookup() { return this.render().find(node => node.type === 'button' && node.props.title === 'dictation.lookupWord').props.onClick(); },
    choose() { const option = this.render().find(node => node.type === 'li'); return option.props.children.props.onClick(); },
  };
}

test('saved word suggestions appear on the first letter without a network request', () => {
  const h = harness([complete]);
  assert.ok(h.type('f').some(node => node.type === 'strong' && node.props.children === 'friend'));
  assert.equal(h.calls.length, 0); assert.equal(h.timers.size, 0);
});

test('online suggestions use a short debounce and cancel intermediate input', async () => {
  const h = harness(); h.type('fr'); h.type('fri');
  assert.equal(h.timers.size, 1); assert.equal([...h.timers.values()][0].delay, 180);
  await h.tick();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].options.params.q, 'fri');
});

test('cached suggestion queries are shown without another network request', async () => {
  const h = harness(); h.type('fr'); await h.tick(); h.type('fri'); h.type('fr');
  assert.equal(h.timers.size, 0); assert.equal(h.calls.length, 1);
  assert.ok(h.render().some(node => node.type === 'strong' && node.props.children === 'friend'));
});

test('matching suggestions remain visible while typing a longer prefix', async () => {
  const h = harness(); h.type('fr'); await h.tick();
  assert.ok(h.type('fri').some(node => node.type === 'strong' && node.props.children === 'friend'));
  assert.equal(h.calls.length, 1);
  assert.equal(h.timers.size, 1);
});

test('complete saved words fill pronunciation and example immediately', async () => {
  const h = harness([complete]); h.type('fr'); await h.choose();
  assert.equal(h.item.word, 'friend'); assert.equal(h.item.example, complete.example);
  assert.equal(h.item.pronunciation, complete.pronunciation); assert.equal(h.calls.length, 0);
});

test('lookup uses phonetics and definition examples when top-level fields are absent', async () => {
  const h = harness(); h.type('friend'); await h.lookup();
  assert.equal(h.item.pronunciation, complete.pronunciation); assert.equal(h.item.example, complete.example);
  assert.equal(h.item.meaning, complete.meaning);
  assert.ok(h.render().some(node => node.props?.children === 'dictation.wordLookupDone'));
  h.type('friend'); await h.lookup(); assert.equal(h.calls.length, 1);
});

test('changing the word ignores a late lookup response', async () => {
  const h = harness(), pending = deferred(); h.setGet(() => pending.promise);
  h.type('friend'); const lookup = h.lookup(); h.type('free');
  pending.resolve({ data: { entries: [{ phonetic: '/frend/' }], translations: [{ terms: ['bạn'] }], examples: [complete.example] } });
  await lookup;
  assert.equal(h.item.word, 'free'); assert.equal(h.item.example, ''); assert.equal(h.resolved.length, 0);
});

test('lookup does not overwrite an example manually edited while waiting', async () => {
  const h = harness(), pending = deferred(); h.setGet(() => pending.promise);
  h.type('friend'); const lookup = h.lookup(); h.item.example = 'My own example.';
  pending.resolve({ data: { entries: [{ phonetic: '/frend/' }], translations: [{ terms: ['bạn'] }], examples: [complete.example] } });
  await lookup; assert.equal(h.item.example, 'My own example.'); assert.equal(h.item.pronunciation, '/frend/');
});

test('missing IPA and example are reported as incomplete, not fabricated', async () => {
  const h = harness(); h.setGet(async () => ({ data: { translations: [{ terms: ['bạn'] }], entries: [], examples: [] } }));
  h.type('friend'); await h.lookup();
  assert.equal(h.item.pronunciation, ''); assert.equal(h.item.example, '');
  assert.ok(h.render().some(node => node.props?.children === 'dictation.wordLookupPartial'));
});

test('API meanings exclude Han/Nom and other non-Latin scripts', async () => {
  const h = harness(); h.setGet(async () => ({ data: {
    translations: [{ partOfSpeech: 'noun', terms: ['giáo viên', '教員', 'cô giáo', '선생님', '教師'] }],
    entries: [{ phonetic: '/ˈtiːtʃə/' }], examples: ['She is a teacher.'],
  } }));
  h.type('teacher'); await h.lookup();
  assert.equal(h.item.meaning, 'giáo viên; cô giáo');
});

test('suggestions and instant fills filter old mixed meanings without mutating saved data', async () => {
  const saved = { ...complete, meaning: 'giáo viên; 教員; cô giáo' };
  const h = harness([saved]);
  assert.ok(h.type('fr').some(node => node.type === 'span' && node.props.children === 'giáo viên; cô giáo'));
  await h.choose(); assert.equal(h.item.meaning, 'giáo viên; cô giáo');
  assert.equal(saved.meaning, 'giáo viên; 教員; cô giáo');
  assert.equal(h.calls.length, 0);
});

test('meaning filter preserves Vietnamese accents including decomposed Unicode', async () => {
  const h = harness([{ ...complete, meaning: 'người bạn; tình bạn'.normalize('NFD') }]);
  h.type('fr'); await h.choose(); assert.equal(h.item.meaning, 'người bạn; tình bạn');
});
