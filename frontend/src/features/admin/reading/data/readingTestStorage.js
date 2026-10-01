const KEY = 'aptimate-admin-reading-tests';
export const READING_TESTS_EVENT = 'reading-tests-updated';
export function normalizeReadingTest(test) {
  const normalizedPart1 = test?.part1 ? { passageHtml: '', passageVersion: 1, ...test.part1 } : test?.part1;
  if (!test?.part4?.headings || test.part4.headings.length <= 7) return { ...test, part1: normalizedPart1 };
  const assigned = test.part4.headings.filter(heading => heading.correctParagraph).slice(0, 7);
  const headings = assigned.length === 7 ? assigned : test.part4.headings.slice(0, 7);
  return { ...test, part1: normalizedPart1, part4: { ...test.part4, headings } };
}
export function getStoredReadingTests() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(data) ? data.map(normalizeReadingTest) : [];
  } catch {
    return [];
  }
}
export function getStoredReadingTest(id) {
  return getStoredReadingTests().find(test => String(test.id) === String(id)) || null;
}
export function saveStoredReadingTest(test) {
  const saved = {
    ...test,
    id: test.id || `reading-${crypto.randomUUID()}`,
    title: test.details.title.trim(),
    name: test.details.title.trim(),
    component: 'Reading',
    section: test.mode === 'full' ? 'Full Test' : test.mode.replace('part', 'Part '),
    status: 'Done',
    dateAdded: test.dateAdded || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: test.attempts || 0,
    questionType: 'Reading'
  };
  saved.part3 = {
    ...test.part3,
    passage: test.part3.speakers.map((name, i) => `${name}: ${test.part3.posts[i]}`).join('\n\n')
  };
  const list = getStoredReadingTests();
  const index = list.findIndex(item => item.id === saved.id);
  if (index < 0) list.unshift(saved);else list[index] = saved;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(READING_TESTS_EVENT));
  return saved;
}
export function deleteStoredReadingTest(id) {
  localStorage.setItem(KEY, JSON.stringify(getStoredReadingTests().filter(test => test.id !== id)));
  window.dispatchEvent(new Event(READING_TESTS_EVENT));
}
