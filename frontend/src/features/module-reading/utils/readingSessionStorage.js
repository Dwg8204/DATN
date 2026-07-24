const PREFIX = 'reading';

const KEYS = {
  testId: `${PREFIX}_test_id`,
  mode: `${PREFIX}_mode`,
  startTime: `${PREFIX}_start_time`,
};

export function getReadingDuration(mode) {
  if (mode === 'part1') return 5 * 60;
  if (mode === 'part2') return 6 * 60;
  if (mode === 'part3') return 10 * 60;
  if (mode === 'part4') return 14 * 60;
  return 35 * 60; // default to 35 mins for full test
}

export function startReadingSession(testId, mode, { force = false } = {}) {
  const currentTestId = window.sessionStorage.getItem(KEYS.testId);
  const currentMode = window.sessionStorage.getItem(KEYS.mode);
  const hasStartTime = window.sessionStorage.getItem(KEYS.startTime);

  if (force || currentTestId !== String(testId) || currentMode !== mode || !hasStartTime) {
    clearReadingSession();
    window.sessionStorage.setItem(KEYS.testId, String(testId));
    window.sessionStorage.setItem(KEYS.mode, mode);
    window.sessionStorage.setItem(KEYS.startTime, Date.now().toString());
  }
}

export function getReadingSession() {
  return {
    testId: window.sessionStorage.getItem(KEYS.testId),
    mode: window.sessionStorage.getItem(KEYS.mode) || 'full',
    startTime: Number(window.sessionStorage.getItem(KEYS.startTime) || 0),
  };
}

export function getReadingRemainingSeconds() {
  const { startTime, mode } = getReadingSession();
  if (!startTime) return getReadingDuration(mode);

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const totalDuration = getReadingDuration(mode);
  return Math.max(0, totalDuration - elapsedSeconds);
}

export function clearReadingSession() {
  Object.values(KEYS).forEach((key) => window.sessionStorage.removeItem(key));
}
