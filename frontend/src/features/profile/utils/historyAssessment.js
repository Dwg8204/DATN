export function writingHistoryStatus(attempt) {
  if (attempt.component !== 'WRITING') return null;
  return ['QUEUED', 'PROCESSING', 'FAILED', 'PARTIAL_FAILED', 'NOT_STARTED', 'COMPLETED'].includes(
    attempt.gradingStatus,
  )
    ? `writingAi.${attempt.gradingStatus}`
    : null;
}
