export const WRITING_PARTS = ['part1', 'part2', 'part3', 'part4'];

const PART_META = {
  part1: { title: 'Part 1 – Word-level writing', type: 'short', guides: ['1–5 words'] },
  part2: { title: 'Part 2 – Short text writing', type: 'long', guides: ['20–30 words'] },
  part3: { title: 'Part 3 – Three written responses', type: 'long', guides: ['30–40 words each'] },
  part4: { title: 'Part 4 – Formal and informal writing', type: 'email', guides: ['40–50 words', '120–150 words'] },
};

export function writingPartNumber(part) {
  const match = /^part([1-4])$/.exec(String(part));
  return match ? Number(match[1]) : null;
}

export function writingTaskFromPaper(paper, part) {
  const number = writingPartNumber(part);
  if (!number) return null;
  const data = paper?.parts?.[String(number)];
  if (!data) return null;
  const meta = PART_META[part] ?? PART_META.part1;
  if (number === 1) return { ...meta, instruction: data.context, questions: data.questions ?? [] };
  if (number === 2) return { ...meta, instruction: data.instruction, questions: [{ key: data.key, text: data.prompt }] };
  if (number === 3) return { ...meta, instruction: data.context, questions: data.messages ?? [] };
  return { ...meta, instruction: data.context, questions: [
    { key: data.informalKey, text: data.informalPrompt },
    { key: data.formalKey, text: data.formalPrompt },
  ] };
}

export function writingWordGuide(part, index) {
  const guides = PART_META[part]?.guides ?? [];
  return guides[index] ?? guides[0] ?? '';
}

export function partsInWritingPaper(paper) {
  return WRITING_PARTS.filter((_, index) => Boolean(paper?.parts?.[String(index + 1)]));
}

export function resumableQuestionKey(task, savedKey) {
  return task?.questions?.find(question => question.key === savedKey)?.key ?? task?.questions?.[0]?.key ?? null;
}

export function resumePartFromAttempt(attempt, fallbackMode = 'part1') {
  const available = partsInWritingPaper(attempt?.paper);
  const currentKey = attempt?.progress?.currentQuestionKey;
  const match = typeof currentKey === 'string' ? /^p([1-4]):/.exec(currentKey) : null;
  const savedPart = match ? `part${match[1]}` : null;
  if (savedPart && available.includes(savedPart)) return savedPart;
  if (fallbackMode !== 'full' && available.includes(fallbackMode)) return fallbackMode;
  return available[0] ?? 'part1';
}
