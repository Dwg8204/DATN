const validPosition = position => Number.isInteger(position) && position >= 2 && position <= 6;

// Legacy UI stores sentence -> position. Changes are scoped to one text only.
export function part2PlacementChanges(sentences, answers, sentenceId, position) {
  const options = sentences.filter(sentence => sentence.correctPosition !== 1);
  if (!validPosition(position) || !options.some(sentence => sentence.id === sentenceId)) return {};
  const previousPosition = validPosition(answers[sentenceId]) ? answers[sentenceId] : null;
  if (previousPosition === position) return {};
  const occupant = options.find(sentence => sentence.id !== sentenceId && answers[sentence.id] === position);
  return {
    [sentenceId]: position,
    ...(occupant ? { [occupant.id]: previousPosition } : {}),
  };
}

// Published attempts store position-key -> option. Build one final patch so a
// swap cannot clear the newly placed answer during a second stale update.
export function part2AttemptChanges(part, answers, sentenceId, position) {
  const texts = Array.isArray(part?.texts) ? part.texts : part ? [part] : [];
  const text = texts.find(item => item.options?.some(option => option.id === sentenceId));
  if (!text?.positions?.some(item => item.position === position)) return {};
  const optionIds = new Set(text.options.map(option => option.id));
  const legacy = Object.fromEntries(text.positions.flatMap(item => {
    const optionId = answers[item.key]?.optionId;
    return optionIds.has(optionId) ? [[optionId, item.position]] : [];
  }));
  const patch = part2PlacementChanges(text.options, legacy, sentenceId, position);
  if (!Object.keys(patch).length) return {};
  const next = { ...legacy, ...patch };
  return Object.fromEntries(text.positions.flatMap(item => {
    const selected = text.options.find(option => next[option.id] === item.position)?.id;
    const previous = answers[item.key]?.optionId;
    if (selected === previous) return [];
    return [[item.key, selected ? { kind: 'MATCH', optionId: selected } : null]];
  }));
}
