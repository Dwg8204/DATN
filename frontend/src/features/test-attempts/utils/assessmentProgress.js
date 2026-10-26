export function progressStage({ loading, error, data, submissionState, paused }) {
  if (error) return 'CONNECTION_ERROR';
  if (submissionState === 'submitting' || submissionState === 'verifying') return 'SUBMITTING';
  if (loading || !data) return 'LOADING_RESULT';
  const status = data.gradingStatus;
  if (['FAILED', 'PARTIAL_FAILED'].includes(status)) return 'FAILED';
  const ready = data.result && (data.result.method === 'OBJECTIVE'
    || data.result.method === 'AI' && (data.component === 'WRITING' ? data.result.writing : data.result.speaking));
  if (ready) return 'COMPLETED';
  if (['UNASSESSED', 'SIMULATED'].includes(data.result?.method)) return 'PAUSED';
  if (status === 'COMPLETED') return 'LOADING_RESULT';
  if (data.assessment?.enabled === false || status === 'NOT_STARTED') return 'PAUSED';
  if (status === 'QUEUED' && ['GROQ_RATE_WAIT','GROQ_DAILY_WAIT'].includes(data.assessment?.errorCode)) return 'RATE_WAIT';
  if (status === 'QUEUED' && data.assessment?.nextRetryAt && Date.parse(data.assessment.nextRetryAt) > Date.now()) return 'RETRY_WAIT';
  if (paused) return 'LONG_WAIT';
  return status === 'PROCESSING' ? 'PROCESSING' : 'QUEUED';
}

export function groqPartProgress(stage, completedParts = []) {
  if (stage === 'COMPLETED') return 100;
  const count = new Set(completedParts.filter(part => Number.isInteger(part) && part >= 1 && part <= 4)).size;
  return [0, 25, 36, 67, 90][count];
}

export function groqFailureReason(code = '') {
  if (/EVIDENCE|JSON|INVALID|INCOMPLETE/.test(code)) return 'invalidOutput';
  if (/429|RATE|DAILY/.test(code)) return 'quota';
  if (/NETWORK|TIMEOUT|HTTP_5/.test(code)) return 'unavailable';
  return 'unknown';
}

export function estimatedProgress(stage, seconds, previous = 0) {
  if (stage === 'COMPLETED') return 100;
  if (['FAILED', 'PAUSED', 'CONNECTION_ERROR', 'LONG_WAIT', 'RETRY_WAIT', 'RATE_WAIT'].includes(stage)) return Math.min(previous, 95);
  const [start, ceiling, rate] = stage === 'SUBMITTING' ? [2, 10, 0.5]
    : stage === 'LOADING_RESULT' ? [10, 15, 0.5]
      : stage === 'PROCESSING' ? [25, 90, 0.35] : [15, 25, 0.1];
  return Math.min(95, Math.max(previous, Math.min(ceiling, start + seconds * rate)));
}

// UI estimates only: never store answers, and never infer completion from this cache.
export function progressStorageKey(attemptId, provider = 'gemini', runKey = 0) {
  let user = 'anonymous';
  try { user = JSON.parse(localStorage.getItem('aptimate.auth.user'))?.id || user; } catch { /* Storage unavailable. */ }
  return `aptimate.assessment-progress:${user}:${attemptId}:${provider}:${runKey}`;
}

export function readProgress(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    return saved && Date.now() - saved.at < 86400000 && Number.isFinite(saved.value)
      ? Math.max(0, Math.min(95, saved.value)) : 0;
  } catch { return 0; }
}

export function saveProgress(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify({ value, at: Date.now() })); } catch { /* Optional UI cache. */ }
}
