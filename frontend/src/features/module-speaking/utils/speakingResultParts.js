export function speakingResultParts(attempt) {
  if (attempt?.scope === 'FULL_SKILL') return [1, 2, 3, 4];
  if (attempt?.scope === 'PART' && Number.isInteger(attempt.partNumber)) return [attempt.partNumber];
  return [...new Set((attempt?.result?.parts ?? []).map(part => part.partNumber))]
    .filter(part => Number.isInteger(part) && part >= 1 && part <= 4)
    .sort((a, b) => a - b);
}

export function speakingPartStatus(attempt, partNumber) {
  const items = (attempt?.result?.items ?? []).filter(item => item.partNumber === partNumber);
  const recorded = items.filter(item => item.selectedAnswer?.kind === 'AUDIO' && item.selectedAnswer.mediaKey).length;
  return { recorded, total: items.length, skipped: Math.max(0, items.length - recorded) };
}
