import { plainRichText } from '../../../common/content/rich-text';

export type WritingWordLimit = {
  minimum: number;
  maximum: number;
  policy: 'guidance' | 'required';
};

// These defaults are attached to newly saved tests, never retroactively to old snapshots.
export function defaultWritingWordLimits(part: number): WritingWordLimit[] {
  const ranges: Record<number, Array<[number, number]>> = {
    1: Array.from({ length: 5 }, () => [1, 5]),
    2: [[20, 30]],
    3: Array.from({ length: 3 }, () => [30, 40]),
    4: [
      [40, 50],
      [120, 150],
    ],
  };
  return (ranges[part] ?? []).map(([minimum, maximum]) => ({
    minimum,
    maximum,
    policy: 'guidance',
  }));
}

export function isWritingWordLimit(value: unknown): value is WritingWordLimit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as WritingWordLimit;
  return (
    Number.isInteger(row.minimum) &&
    Number.isInteger(row.maximum) &&
    row.minimum >= 1 &&
    row.maximum >= row.minimum &&
    row.maximum <= 2000 &&
    ['guidance', 'required'].includes(row.policy)
  );
}

// Only an explicit "write N–M words" instruction is recognised. Ambiguous or conflicting ranges stay unknown.
export function explicitWritingWordLimit(...values: Array<string | undefined>): WritingWordLimit | null {
  const ranges = values.flatMap((value) =>
    [...plainRichText(value ?? '').matchAll(/\bwrite\s+(\d{1,4})\s*[-–—]\s*(\d{1,4})\s+words\b/giu)].map(
      (match) => ({
        minimum: Number(match[1]),
        maximum: Number(match[2]),
        policy: 'required' as const,
      }),
    ),
  );
  if (!ranges.length || ranges.some((range) => !isWritingWordLimit(range))) return null;
  const first = ranges[0];
  return ranges.every((range) => range.minimum === first.minimum && range.maximum === first.maximum)
    ? first
    : null;
}

export function writingQuestionWordLimits(
  partNumber: number,
  part: {
    wordLimits?: Array<WritingWordLimit | null>;
    context?: string;
    instruction?: string;
    prompt?: string;
    questions?: string[];
    messages?: string[];
    informalPrompt?: string;
    formalPrompt?: string;
  },
): Array<WritingWordLimit | null> {
  const prompts =
    partNumber === 1
      ? (part.questions ?? [])
      : partNumber === 2
        ? [part.prompt]
        : partNumber === 3
          ? (part.messages ?? [])
          : [part.informalPrompt, part.formalPrompt];
  return prompts.map((prompt, index) => {
    if (part.wordLimits) return part.wordLimits[index] ?? null;
    // Part 4 shared context can describe two different ranges; only the individual email prompt is safe.
    return explicitWritingWordLimit(
      prompt,
      partNumber === 4 ? undefined : (part.instruction ?? part.context),
    );
  });
}
