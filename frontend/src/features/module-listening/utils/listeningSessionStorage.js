const KEYS = {
  part1: 'listening_p1_answers',
  part2: 'listening_p2_answers',
  part3: 'listening_p3_answers',
  part4: 'listening_p4_answers',
  testId: 'listening_testId',
  startTime: 'listening_startTime',
};

export function savePartAnswers(partKey, answers) {
  sessionStorage.setItem(KEYS[partKey], JSON.stringify(answers));
}

export function getAllAnswers() {
  return {
    part1: JSON.parse(sessionStorage.getItem(KEYS.part1) || '{}'),
    part2: JSON.parse(sessionStorage.getItem(KEYS.part2) || '{}'),
    part3: JSON.parse(sessionStorage.getItem(KEYS.part3) || '{}'),
    part4: JSON.parse(sessionStorage.getItem(KEYS.part4) || '{}'),
  };
}

export function saveTestMeta(testId) {
  sessionStorage.setItem(KEYS.testId, String(testId));
  sessionStorage.setItem(KEYS.startTime, Date.now().toString());
}

export function startListeningSession(testId, mode, { force = false } = {}) {
  const currentTestId = sessionStorage.getItem(KEYS.testId);
  const currentMode = sessionStorage.getItem('listening_mode');
  const hasStartTime = sessionStorage.getItem(KEYS.startTime);

  if (force || currentTestId !== String(testId) || currentMode !== mode || !hasStartTime) {
    clearListeningSession();
    sessionStorage.setItem(KEYS.testId, String(testId));
    sessionStorage.setItem('listening_mode', mode);
    sessionStorage.setItem(KEYS.startTime, Date.now().toString());
  }
}

export function getTestMeta() {
  return {
    testId: sessionStorage.getItem(KEYS.testId),
    startTime: parseInt(sessionStorage.getItem(KEYS.startTime) || '0'),
  };
}

export const LISTENING_DURATION_SECONDS = 40 * 60;

export function clearListeningSession() {
  Object.values(KEYS).forEach(key => sessionStorage.removeItem(key));
}

export function getListeningRemainingSeconds() {
  const { startTime } = getTestMeta();
  if (!startTime) return LISTENING_DURATION_SECONDS;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(0, LISTENING_DURATION_SECONDS - elapsed);
}

// ------------------------------------------------------------------
// LocalStorage logic for persistent result tracking
// ------------------------------------------------------------------

export function saveListeningResult(testId, isFull, part, resultData) {
  const key = `listening_result_${testId}`;
  localStorage.setItem(key, JSON.stringify({
    testId,
    isFull,
    part,
    ...resultData,
    submittedAt: new Date().toISOString()
  }));
}

export function getListeningResult(testId) {
  const key = `listening_result_${testId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

export function getCompletedListeningTests() {
  const completed = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('listening_result_')) {
      const data = JSON.parse(localStorage.getItem(key));
      completed[data.testId] = data;
    }
  }
  return completed;
}
