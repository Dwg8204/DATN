export function writingAnswerMaxCharacters(partNumber: number, key: string): number {
  if (partNumber === 1) return 250;
  if (partNumber === 2 || partNumber === 3) return 4_000;
  return key === 'p4:q1' ? 4_000 : 8_000;
}
