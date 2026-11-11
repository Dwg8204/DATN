export const QUESTION_TEXT_VERSION = 'q-text-v1';
export const QUESTION_TYPES = [
  'GRAMMAR_MULTIPLE_CHOICE',
  'VOCABULARY_MATCHING',
  'READING_GAP_CHOICE',
  'READING_ORDER',
  'READING_OPINION_MATCH',
  'READING_HEADING_MATCH',
  'MCQ_LISTENING_P1',
  'MATCHING_LISTENING_P2',
  'OPINION_LISTENING_P3',
  'MCQ_LISTENING_P4',
  'WRITING_SHORT_RESPONSE',
  'WRITING_SHORT_TEXT',
  'WRITING_CHAT_RESPONSE',
  'WRITING_EMAIL',
  'OPEN_SPEAKING_P1',
  'OPEN_SPEAKING_P2',
  'OPEN_SPEAKING_P3',
  'OPEN_SPEAKING_P4',
];
export interface QuestionTextRow {
  question_type: string;
  component: string;
  part_number: number;
  question_key: string;
  group_key?: string;
  content: any;
  correct_answer?: unknown;
  sample_answer?: unknown;
  explanation?: unknown;
  part_contents?: any;
}
function clean(value: any): any {
  if (typeof value === 'string')
    return value
      .replace(/<[^>]*>/gu, ' ')
      .replace(/https?:\/\/\S+/gu, '')
      .replace(/&nbsp;/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/(?:url|audio|image|media|avatar)/iu.test(key))
        .map(([key, v]) => [key, clean(v)]),
    );
  return value;
}
export function buildQuestionText(row: QuestionTextRow): string {
  if (!QUESTION_TYPES.includes(row.question_type))
    throw Error('UNSUPPORTED_QUESTION_TYPE');
  const parts = row.part_contents ?? {};
  let context =
    parts.parts?.[String(row.part_number)] ??
    parts[`part${row.part_number}`] ??
    parts[String(row.part_number)] ??
    {};
  if (row.question_type === 'VOCABULARY_MATCHING')
    context =
      (parts.sets ?? []).find((s: any) => s.groupKey === row.group_key) ?? {};
  if (row.question_type === 'READING_ORDER')
    context =
      context.texts?.find((t: any) => t.id === row.content?.textId) ?? context;
  if (row.question_type === 'READING_HEADING_MATCH')
    context = { headings: context.headings };
  if (row.question_type === 'MCQ_LISTENING_P4')
    context = parts.part4?.recordings?.[row.content?.recordingIndex] ?? context;
  const bounded = (value: unknown, limit: number) => {
    const text = JSON.stringify(clean(value));
    return text.length > limit
      ? text.slice(0, limit - 12) + ' [TRUNCATED]'
      : text;
  };
  const lines = [
    `[Skill] ${row.component} [Part] ${row.part_number} [Type] ${row.question_type}`,
    `[Question] ${bounded(row.content, 650)}`,
    `[Answer] ${bounded(row.correct_answer ?? row.sample_answer ?? {}, 250)}`,
  ];
  // Context precedes optional editorial explanation: a question may only contain options or a speaker label.
  lines.push(`[Context] ${bounded(context, 700)}`);
  if (row.explanation)
    lines.push(`[Explanation] ${bounded(row.explanation, 200)}`);
  return lines.join('\n').slice(0, 2000);
}
