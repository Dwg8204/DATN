const KEY = 'aptimate-writing-session';
const DURATION_SECONDS = 50 * 60;

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function getWritingSession() { return readSession(); }

export function startWritingSession(testId, mode, { force = false } = {}) {
  const current = readSession();
  if (!force && current.startTime && current.testId === testId) return current;
  const next = { testId, mode, startTime: Date.now(), answers: {} };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getWritingRemainingSeconds() {
  const { startTime } = readSession();
  if (!startTime) return DURATION_SECONDS;
  return Math.max(0, DURATION_SECONDS - Math.floor((Date.now() - startTime) / 1000));
}

export function getWritingAnswers(part) { return readSession().answers?.[part] || {}; }

export function saveWritingAnswers(part, answers) {
  const current = readSession();
  sessionStorage.setItem(KEY, JSON.stringify({ ...current, answers: { ...current.answers, [part]: answers } }));
}

export function finishWritingSession() {
  const current = readSession();
  const next = { ...current, submittedAt: current.submittedAt || Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
