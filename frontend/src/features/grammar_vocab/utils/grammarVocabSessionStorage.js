const PREFIX = 'grammar_vocab';

const KEYS = {
  part1: `${PREFIX}_part1_answers`,
  part2: `${PREFIX}_part2_answers`,
  testId: `${PREFIX}_test_id`,
  mode: `${PREFIX}_mode`,
  startTime: `${PREFIX}_start_time`,
};

export const GRAMMAR_VOCAB_DURATION_SECONDS = 25 * 60;

function readJson(key) {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

export function startGrammarVocabSession(testId, mode, { force = false } = {}) {
  const currentTestId = window.sessionStorage.getItem(KEYS.testId);
  const currentMode = window.sessionStorage.getItem(KEYS.mode);
  const hasStartTime = window.sessionStorage.getItem(KEYS.startTime);

  if (force || currentTestId !== String(testId) || currentMode !== mode || !hasStartTime) {
    clearGrammarVocabSession();
    window.sessionStorage.setItem(KEYS.testId, String(testId));
    window.sessionStorage.setItem(KEYS.mode, mode);
    window.sessionStorage.setItem(KEYS.startTime, Date.now().toString());
  }
}

export function saveGrammarVocabAnswers(part, answers) {
  if (KEYS[part]) {
    window.sessionStorage.setItem(KEYS[part], JSON.stringify(answers));
  }
}

export function getGrammarVocabAnswers(part) {
  return KEYS[part] ? readJson(KEYS[part]) : {};
}

export function getAllGrammarVocabAnswers() {
  return {
    part1: getGrammarVocabAnswers('part1'),
    part2: getGrammarVocabAnswers('part2'),
  };
}

export function getGrammarVocabSession() {
  return {
    testId: window.sessionStorage.getItem(KEYS.testId),
    mode: window.sessionStorage.getItem(KEYS.mode),
    startTime: Number(window.sessionStorage.getItem(KEYS.startTime) || 0),
  };
}

export function getGrammarVocabRemainingSeconds() {
  const { startTime } = getGrammarVocabSession();
  if (!startTime) return GRAMMAR_VOCAB_DURATION_SECONDS;

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(0, GRAMMAR_VOCAB_DURATION_SECONDS - elapsedSeconds);
}

export function clearGrammarVocabSession() {
  Object.values(KEYS).forEach((key) => window.sessionStorage.removeItem(key));
}
