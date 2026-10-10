import { readingResultSections } from './readingResultSections.js';
import { displaySelectedAnswer } from '../../test-attempts/utils/answerDisplay.js';

const list = value => Array.isArray(value) ? value : [];
export const readingStatus = outcome => outcome === 'CORRECT' ? 'correct' : outcome === 'INCORRECT' ? 'wrong' : 'skipped';
export const readingPercentage = (score, maximum) => maximum > 0 ? Math.max(0, Math.min(100, Math.round(Number(score) / Number(maximum) * 100))) : 0;

export function readingResultView(data) {
  if (!data?.result) return null;
  const score = Number(data.score ?? data.result.score ?? 0);
  const maximum = Number(data.maxScore ?? data.result.maxScore ?? 0);
  const items = list(data.result.items).map((item, index) => ({ ...item, number: index + 1,
    status: readingStatus(item.outcome),
    // Matching IDs are internal identities, not human-readable answer labels.
    answer: item.selectedAnswer?.kind === 'CHOICE' ? displaySelectedAnswer(item.selectedAnswer)
      : item.selectedAnswer ? 'Answered' : '—',
  }));
  return { score, maximum, percentage: readingPercentage(score, maximum), items,
    counts: data.result.counts ?? { correct: 0, incorrect: 0, skipped: 0 },
    parts: list(data.result.parts).map(part => ({ ...part, percentage: readingPercentage(part.score, part.maxScore) }))
      .sort((a, b) => a.partNumber - b.partNumber),
  };
}

export function readingReviewPages(paper, partNumber, summaryItems = []) {
  const numbers = new Map(summaryItems.map((item, index) => [item.key, index + 1]));
  const sections = readingResultSections(paper, partNumber);
  let fallbackNumber = 0;
  const numbered = sections.map(section => ({ ...section, rows: section.rows.map(row => {
    fallbackNumber += 1;
    return { ...row, number: numbers.get(row.key) ?? fallbackNumber };
  }) }));
  if (partNumber === 4) return numbered.flatMap(section => section.rows.map(row => ({
    id: row.key, title: paper?.title || 'Long text comprehension', rows: [row],
  })));
  return numbered.filter(section => section.rows.length);
}

export function readingReviewAnswer(row, item) {
  return { status: readingStatus(item?.outcome?.outcome),
    selected: row.options.find(option => option.id === item?.selectedAnswer?.optionId),
    correct: row.options.find(option => option.id === item?.correctAnswer),
  };
}

export function readingFeedback(percentage) {
  if (percentage >= 90) return ['Outstanding!', 'Your reading comprehension is excellent. Keep practising across all four parts.'];
  if (percentage >= 75) return ['Great job!', 'You performed well. Review the missed questions and their explanations to improve further.'];
  if (percentage >= 55) return ['Good effort!', 'Focus on sentence order, matching opinions and identifying the main idea of paragraphs.'];
  if (percentage >= 35) return ['Keep practising!', 'Read the passages carefully and use the explanations to understand each answer.'];
  return ["Don't give up!", 'Review each part step by step, then try another reading exercise.'];
}
