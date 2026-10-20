import { addDays, dayNumber, localDay } from './calendar';
import {
  LearningGoalRow,
  StudyPlanItemRow,
} from '../types/personalization.type';

const skills: Record<string, string> = {
  GRAMMAR_VOCAB: 'Grammar & Vocabulary',
  READING: 'Reading',
  LISTENING: 'Listening',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
};

export function reminderContent(
  goal: LearningGoalRow,
  completed: number,
  items: StudyPlanItemRow[],
  now: Date,
): string {
  const today = localDay(now, goal.timezone);
  const lastDay = addDays(goal.start_date, goal.duration_days - 1);
  const days = Math.max(1, dayNumber(lastDay) - dayNumber(today) + 1);
  const remaining = Math.max(0, goal.target_test_count - completed);
  const progress =
    remaining > 0
      ? `Còn ${remaining} bài trong ${days} ngày để hoàn thành số bài mục tiêu, hướng tới ${goal.target_cefr}.`
      : `Bạn đã đủ ${goal.target_test_count} bài mục tiêu. Tiếp tục luyện tập hướng tới ${goal.target_cefr}.`;
  const activities = items.map((item) => {
    const count = Math.max(0, item.target_count - item.done_count);
    if (item.activity_type === 'VOCAB_REVIEW') return `ôn ${count} thẻ từ vựng`;
    if (item.activity_type === 'MISTAKE_REVIEW') return 'ôn lại câu sai';
    if (item.activity_type === 'TOPIC_REVIEW')
      return 'ôn chủ đề trong lộ trình';
    const skill = skills[item.component ?? ''] ?? 'luyện tập';
    return `${count} bài ${skill}${item.part_number ? ` Part ${item.part_number}` : ''}`;
  });
  return `${today === lastDay ? 'Hôm nay là ngày cuối của mục tiêu. ' : ''}${progress} Hôm nay: ${activities.join('; ')}.`;
}
