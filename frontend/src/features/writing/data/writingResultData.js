import { WRITING_TASKS } from './writingTasks';
import { countWords } from '../utils/wordCount';

export const WRITING_PART_ORDER = ['part1', 'part2', 'part3', 'part4'];

export const WRITING_SAMPLE_ANSWERS = {
  part1: ['Software developer', 'Visited my grandparents', 'Dark blue', 'Warm and sunny', 'By bus'],
  part2: ['I enjoy capturing everyday moments and would like to learn how to use lighting and composition to create more expressive photographs.'],
  part3: [
    'I most enjoy taking street photographs because they capture real people and spontaneous moments. I also like experimenting with light, reflections and unusual angles when I explore a new place.',
    'My most memorable photograph shows my family watching the sunset by the sea. The warm colours were beautiful, but the picture matters most because it reminds me of a happy day together.',
    'The club could organise practical workshops, pair beginners with experienced members and provide friendly feedback. Short weekly challenges would also encourage new photographers to practise regularly and share their progress.',
  ],
  part4: [
    'Hi Sam, I’m really disappointed that the exhibition has been cancelled because I was looking forward to seeing everyone’s work. Why don’t we meet at the city gallery instead and take some photographs afterwards? Let me know what you think. Best, Alex',
    'Dear Club Manager, I am writing regarding the cancellation of this weekend’s photography exhibition. Although I understand that unexpected circumstances can occur, many members have spent considerable time preparing their work and arranging transport. Could you please explain why the event was cancelled and confirm whether it will be rescheduled? I would also appreciate information about refunds for any entry fees and whether submitted photographs will remain eligible for the replacement event. Clear guidance would help members adjust their plans and continue preparing with confidence. Thank you for your assistance. I look forward to receiving an update soon. Yours sincerely, Alex Morgan',
  ],
};

const ranges = { part1: [1, 5], part2: [20, 30], part3: [30, 40], part4: [[40, 50], [120, 150]] };

function rangeScore(value, range) {
  const words = countWords(value);
  if (!words) return 0;
  if (words >= range[0] && words <= range[1]) return 100;
  const distance = words < range[0] ? range[0] - words : words - range[1];
  return Math.max(35, 100 - Math.round((distance / Math.max(range[1], 1)) * 100));
}

export function getWritingAssessment(session, requestedParts = WRITING_PART_ORDER) {
  const answers = session.answers || {};
  const scores = requestedParts.flatMap((part) => {
    const values = Object.values(answers[part] || {});
    return WRITING_TASKS[part].questions.map((_, index) => rangeScore(values[index] || '', part === 'part4' ? ranges.part4[index] : ranges[part]));
  });
  const rawAchievement = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const partCaps = { part1: 65, part2: 75, part3: 85, part4: 100 };
  const assessmentCap = Math.round(requestedParts.reduce((sum, part) => sum + partCaps[part], 0) / Math.max(requestedParts.length, 1));
  const achievement = Math.min(rawAchievement, assessmentCap);
  const completion = scores.filter(Boolean).length / Math.max(scores.length, 1);
  const coherence = Math.round(Math.min(assessmentCap, achievement * .82 + completion * 12));
  const lexical = Math.round(Math.min(assessmentCap, achievement * .86 + completion * 9));
  const grammar = Math.round(Math.min(assessmentCap, achievement * .84 + completion * 10));
  const overall = Math.round((achievement + coherence + lexical + grammar) / 4);
  const band = overall >= 90 ? 'C2' : overall >= 75 ? 'C1' : overall >= 60 ? 'B2' : overall >= 40 ? 'B1' : overall > 0 ? 'A2' : 'A1';
  return {
    band, overall,
    criteria: [
      { key: 'achievement', label: 'Task Achievement', score: achievement },
      { key: 'coherence', label: 'Coherence & Cohesion', score: coherence },
      { key: 'lexical', label: 'Lexical Resource', score: lexical },
      { key: 'grammar', label: 'Grammar Accuracy', score: grammar },
    ],
    feedback: overall >= 75
      ? 'Your responses address the tasks clearly and generally follow the recommended length. Continue refining sentence variety and word choice to make your writing more natural and precise.'
      : overall >= 45
        ? 'You completed most of the required writing. Review the recommended word limits, organise each response around one clear idea and check grammar before submitting.'
        : 'Several responses are incomplete or outside the recommended length. Complete every task first, then develop each answer with clear, relevant details.',
  };
}

export function getAiImprovedAnswer(part, index, userAnswer) {
  if (!String(userAnswer || '').trim()) return WRITING_SAMPLE_ANSWERS[part][index];
  if (part === 'part1') return String(userAnswer).trim().replace(/^./, (letter) => letter.toUpperCase());
  return `${String(userAnswer).trim().replace(/([.!?])?$/, '.')}`;
}
