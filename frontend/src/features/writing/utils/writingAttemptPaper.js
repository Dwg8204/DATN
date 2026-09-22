export const WRITING_PARTS = ['part1', 'part2', 'part3', 'part4'];

const PART_META = {
  part1: { title: 'Part 1 – Word-level writing', type: 'short', guides: ['1–5 words'] },
  part2: { title: 'Part 2 – Short text writing', type: 'long', guides: ['20–30 words'] },
  part3: { title: 'Part 3 – Three written responses', type: 'long', guides: ['30–40 words each'] },
  part4: { title: 'Part 4 – Formal and informal writing', type: 'email', guides: ['40–50 words', '120–150 words'] },
};

export function writingPartNumber(part) {
  const number = Number(String(part).replace('part', ''));
  return number >= 1 && number <= 4 ? number : 1;
}

export function writingTaskFromPaper(paper, part) {
  const number = writingPartNumber(part);
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
