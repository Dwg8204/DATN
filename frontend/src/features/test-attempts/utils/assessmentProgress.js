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
  if (paused) return 'LONG_WAIT';
  return status === 'PROCESSING' ? 'PROCESSING' : 'QUEUED';
}

export function estimatedProgress(stage, seconds, previous = 0) {
  if (stage === 'COMPLETED') return 100;
  if (['FAILED', 'PAUSED', 'CONNECTION_ERROR', 'LONG_WAIT'].includes(stage)) return Math.min(previous, 95);
  const [start, ceiling, rate] = stage === 'SUBMITTING' ? [2, 10, 0.5]
    : stage === 'LOADING_RESULT' ? [10, 15, 0.5]
      : stage === 'PROCESSING' ? [25, 90, 0.35] : [15, 25, 0.1];
  return Math.min(95, Math.max(previous, Math.min(ceiling, start + seconds * rate)));
}
