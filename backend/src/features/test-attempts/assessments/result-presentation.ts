import { Answers, AssessmentPaper, AssessmentResult } from '../types/attempt.type';

type ReadingText = { positions?: Array<{ key: string }>; options?: Array<{ id: string; text: string }> };
type ReadingOpinions = { questions?: Array<{ key: string }>; speakers?: Array<{ id: string; name: string }> };
type ReadingHeadings = { paragraphs?: Array<{ key: string }>; headings?: Array<{ id: string; text: string }> };
type ReadingGaps = { questions?: Array<{ key: string; options?: Array<{ id: string; text: string }> }> };

/** Add learner answers to the API response without duplicating them in result JSONB. */
export function presentAssessmentResult(result: AssessmentResult | null, answers?: Answers, paper?: AssessmentPaper): AssessmentResult | null {
  if (!result || !answers) return result;
  const part = paper?.component === 'READING' ? paper.parts['2'] as (ReadingText & { texts?: ReadingText[] }) | undefined : undefined;
  // Each text owns its options. The same option ID may occur in another text.
  const optionsByKey = new Map<string, ReadingText['options']>();
  const gaps = paper?.component === 'READING' ? paper.parts['1'] as ReadingGaps | undefined : undefined;
  for (const question of gaps?.questions ?? []) optionsByKey.set(question.key, question.options);
  for (const text of part ? (Array.isArray(part.texts) ? part.texts : [part]) : []) {
    for (const position of text.positions ?? []) optionsByKey.set(position.key, text.options);
  }
  const opinions = paper?.component === 'READING' ? paper.parts['3'] as ReadingOpinions | undefined : undefined;
  const speakers = opinions?.speakers?.map(speaker => ({ id: speaker.id, text: speaker.name }));
  for (const question of opinions?.questions ?? []) optionsByKey.set(question.key, speakers);
  const headings = paper?.component === 'READING' ? paper.parts['4'] as ReadingHeadings | undefined : undefined;
  for (const paragraph of headings?.paragraphs ?? []) optionsByKey.set(paragraph.key, headings?.headings);
  return {
    ...result,
    items: result.items.map(item => {
      const selectedAnswer = answers[item.key] ?? item.selectedAnswer ?? null;
      const options = optionsByKey.get(item.key);
      return {
        ...item,
        selectedAnswer,
        ...(options ? {
          selectedAnswerText: selectedAnswer?.kind === 'MATCH' || selectedAnswer?.kind === 'CHOICE'
            ? options.find(option => option.id === selectedAnswer.optionId)?.text ?? null : null,
        } : {}),
      };
    }),
  };
}
