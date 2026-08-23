const STORAGE_KEY = 'aptimate-admin-writing-tests';

export function getStoredWritingTests() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function getStoredWritingTest(id) {
  return getStoredWritingTests().find((test) => test.id === id) || null;
}

export function saveStoredWritingTest(test) {
  const tests = getStoredWritingTests();
  const savedTest = {
    ...test,
    id: test.id || `writing-${Date.now()}`,
    name: test.details?.title || 'Untitled Writing Test',
    component: 'Writing',
    section: 'Full Writing',
    status: 'Done',
    dateAdded: test.dateAdded || new Date().toISOString(),
    attempts: test.attempts || 0,
    questionType: 'Writing',
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = tests.findIndex((item) => item.id === savedTest.id);
  if (existingIndex >= 0) tests[existingIndex] = savedTest;
  else tests.unshift(savedTest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  window.dispatchEvent(new Event('writing-tests-updated'));
  return savedTest;
}

export function deleteStoredWritingTest(id) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getStoredWritingTests().filter((test) => test.id !== id)));
  window.dispatchEvent(new Event('writing-tests-updated'));
}
