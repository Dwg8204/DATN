export function displaySelectedAnswer(answer) {
  if (!answer) return null;
  if (answer.kind === 'TEXT') return answer.text?.trim() || null;
  if (answer.kind === 'AUDIO') return 'Recording';
  const optionId = String(answer.optionId ?? '').trim();
  if (!optionId) return null;
  const indexedOption = /^o(\d+)$/i.exec(optionId);
  if (indexedOption) {
    const index = Number(indexedOption[1]);
    return index >= 0 && index < 26 ? String.fromCharCode(65 + index) : optionId;
  }
  return optionId;
}
