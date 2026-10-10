import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { part2PlacementChanges } from '../../../utils/part2Placement.js';
import { getPart2Texts } from '../../../utils/part2Texts.js';
import { shuffleSentences } from '../../../utils/shuffleSentences.js';

const compiled = transformSync(readFileSync(new URL('./Part2TextCohesion.jsx', import.meta.url), 'utf8'),
  { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const jsx = (type, props) => ({ type, props });
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
const DndContext = () => null, DragOverlay = () => null, RichTextContent = () => null;
const pointerWithin = () => [];
const data = { texts: ['t1', 't2'].map(id => ({ id, title: id, sentences: [
  { id: `${id}-opening`, content: 'The fixed opening.', correctPosition: 1 },
  ...'ABCDE'.split('').map((label, i) => ({ id: `${id}-${label}`, content: `Sentence ${label}`, correctPosition: i + 2 })),
] })) };

function harness(initial = {}) {
  let answers = { ...initial }, cursor = 0, slots = [], draggingId = null;
  const stores = [[], []], moves = [];
  const hooks = {
    useContext: () => ({ answers, handleSentencePlacement: (id, position, sentences) => {
      moves.push({ id, position }); answers = { ...answers, ...part2PlacementChanges(sentences, answers, id, position) };
    } }),
    useMemo(factory, deps) { const index = cursor++; if (!slots[index] || deps.some((value, i) => slots[index].deps[i] !== value)) slots[index] = { deps, value: factory() }; return slots[index].value; },
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
  };
  const mocks = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@dnd-kit/core': { DndContext, DragOverlay, pointerWithin, PointerSensor: {}, TouchSensor: {},
      useSensor: () => ({}), useSensors: (...sensors) => sensors,
      useDraggable: ({ id }) => ({ isDragging: draggingId === id, attributes: {}, listeners: {}, setNodeRef() {} }),
      useDroppable: () => ({ isOver: false, setNodeRef() {} }) },
    'lucide-react': { GripVertical: () => null },
    '../../../../../components/common/RichTextContent': { __esModule: true, default: RichTextContent },
    '../../../context/ReadingTestContext': { ReadingTestContext: {} },
    '../../../utils/shuffleSentences': { shuffleSentences }, '../../../utils/part2Texts': { getPart2Texts },
    './Part2TextCohesion.module.css': { __esModule: true, default: { taskTitle: 'taskTitle' } },
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => mocks[name] });
  return {
    moves, get answers() { return answers; },
    render(index = 0) { cursor = 0; slots = stores[index]; const root = module.exports.default({ data });
      const text = root.props.children[index]; return walk(text.type(text.props)); },
    dnd(index = 0) { return this.render(index).find(node => node.type === DndContext).props; },
    start(id, index = 0) { draggingId = id; this.dnd(index).onDragStart({ active: { id } }); },
    drop(id, position, index = 0) { draggingId = null; this.dnd(index).onDragEnd({ active: { id },
      over: position ? { data: { current: { type: 'gap', position } } } : null }); },
    gaps(index = 0) { return this.render(index).filter(node => node.type?.name === 'DroppableGap'); },
  };
}

test('each text renders its own sentence in the same numbered position', () => {
  const h = harness({ 't1-A': 2, 't2-B': 2 });
  assert.equal(h.gaps(0)[0].props.droppedSentence.id, 't1-A');
  assert.equal(h.gaps(1)[0].props.droppedSentence.id, 't2-B');
});

test('dragging from the bank and swapping filled positions each perform one placement', () => {
  const h = harness({ 't1-A': 2, 't1-B': 3, 't2-A': 2 });
  h.start('t1-C'); h.drop('t1-C', 4);
  assert.equal(h.gaps()[2].props.droppedSentence.id, 't1-C');
  h.start('t1-A'); h.drop('t1-A', 3);
  assert.equal(h.gaps()[0].props.droppedSentence.id, 't1-B');
  assert.equal(h.gaps()[1].props.droppedSentence.id, 't1-A');
  assert.equal(h.gaps(1)[0].props.droppedSentence.id, 't2-A');
  assert.equal(h.moves.length, 2);
});

test('tap-to-place swaps answers using the same placement handler', () => {
  const h = harness({ 't1-A': 2, 't1-B': 3 });
  h.gaps()[0].props.onSelectPlaced('t1-A');
  const target = h.gaps()[1]; assert.equal(target.props.hasSelectedSentence, true);
  target.props.onPlace(3);
  assert.equal(h.answers['t1-A'], 3); assert.equal(h.answers['t1-B'], 2);
  assert.equal(h.gaps()[0].props.hasSelectedSentence, false);
});

test('dropping outside and cancelling do not change answers or leave a drag overlay', () => {
  const h = harness({ 't1-A': 2 });
  h.start('t1-A'); h.drop('t1-A', null);
  assert.deepEqual(h.answers, { 't1-A': 2 }); assert.equal(h.moves.length, 0);
  h.start('t1-A'); h.dnd().onDragCancel();
  assert.equal(h.render().find(node => node.type === DragOverlay).props.children, null);
  assert.equal(h.dnd().collisionDetection, pointerWithin);
  assert.equal(h.render().find(node => node.type === DragOverlay).props.dropAnimation, null);
});

test('dragging retains source sentence content and geometry instead of a smaller placeholder', () => {
  const h = harness({ 't1-A': 2 }); h.start('t1-A');
  const gap = h.gaps()[0], rendered = gap.type(gap.props);
  assert.ok(walk(rendered).some(node => node.type === RichTextContent && node.props.value === 'Sentence A'));
  assert.ok(rendered.props.className.includes('opacity-30'));
});
