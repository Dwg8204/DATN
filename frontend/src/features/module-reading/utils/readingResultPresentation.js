import { readingResultSections } from './readingResultSections.js';
import { displaySelectedAnswer } from '../../test-attempts/utils/answerDisplay.js';

const list = value => Array.isArray(value) ? value : [];
// Sentence content can contain editor formatting. The overview displays plain text only.
export function readingAnswerText(value) {
  if (typeof value !== 'string') return '';
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:p|div|br|li|blockquote)\b[^>]*>/gi, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
      if (!entity.startsWith('#')) return entities[entity.toLowerCase()];
      const code = /^#x/i.test(entity) ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
    })
    .replace(/\s+/g, ' ').trim();
}
export const readingStatus = outcome => outcome === 'CORRECT' ? 'correct' : outcome === 'INCORRECT' ? 'wrong' : 'skipped';
export const readingPercentage = (score, maximum) => maximum > 0 ? Math.max(0, Math.min(100, Math.round(Number(score) / Number(maximum) * 100))) : 0;

export function readingResultView(data) {
  if (!data?.result) return null;
  const score = Number(data.score ?? data.result.score ?? 0);
  const maximum = Number(data.maxScore ?? data.result.maxScore ?? 0);
  const items = list(data.result.items).map((item, index) => ({ ...item, number: index + 1,
    status: readingStatus(item.outcome),
    // Matching IDs are internal identities, not human-readable answer labels.
    answer: item.selectedAnswer && 'selectedAnswerText' in item ? readingAnswerText(item.selectedAnswerText) || 'Answer unavailable'
      : item.selectedAnswer?.kind === 'CHOICE' ? displaySelectedAnswer(item.selectedAnswer)
      : item.selectedAnswer ? 'Answered' : '—',
  }));
  return { score, maximum, percentage: readingPercentage(score, maximum), items,
    counts: data.result.counts ?? { correct: 0, incorrect: 0, skipped: 0 },
    parts: list(data.result.parts).map(part => ({ ...part, percentage: readingPercentage(part.score, part.maxScore) }))
      .sort((a, b) => a.partNumber - b.partNumber),
  };
}

export function readingOverviewColumns(view, { compact = false } = {}) {
  return view.parts.flatMap(part => {
    const items = view.items.filter(item => item.partNumber === part.partNumber);
    // A standard Part 2 contains two texts with five positions each.
    const groups = compact && part.partNumber === 2
      ? Array.from({ length: Math.ceil(items.length / 5) }, (_, index) => items.slice(index * 5, index * 5 + 5))
      : [items];
    return groups.map((group, index) => ({
      key: `${part.partNumber}:${index}`, partNumber: part.partNumber,
      items: group.map(item => {
        if (!compact || part.partNumber !== 2) return item;
        // Use the label saved in the sentence, never infer it from an internal
        // option ID or the correct-order index. Unlabelled content stays readable.
        const label = item.answer.match(/^(?:\(([A-Z])\)|([A-Z])[.)])(?:\s|$)/);
        return label ? { ...item, answer: label[1] || label[2] } : item;
      }),
    }));
  });
}

export function readingReviewPages(paper, partNumber, summaryItems = [], { singlePage = false } = {}) {
  const numbers = new Map(summaryItems.map((item, index) => [item.key, index + 1]));
  const sections = readingResultSections(paper, partNumber);
  let fallbackNumber = 0;
  const numbered = sections.map(section => ({ ...section, rows: section.rows.map(row => {
    fallbackNumber += 1;
    return { ...row, number: numbers.get(row.key) ?? fallbackNumber };
  }) }));
  if (partNumber === 4 && !singlePage) return numbered.flatMap(section => section.rows.map(row => ({
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
