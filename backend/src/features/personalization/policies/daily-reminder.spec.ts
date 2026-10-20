import { reminderContent } from './daily-reminder';
import {
  LearningGoalRow,
  StudyPlanItemRow,
} from '../types/personalization.type';

describe('daily reminder templates', () => {
  const goal = {
    start_date: '2026-10-01',
    duration_days: 5,
    timezone: 'Asia/Bangkok',
    target_test_count: 10,
    target_cefr: 'B2',
  } as LearningGoalRow;
  const items = [
    {
      activity_type: 'TEST',
      component: 'WRITING',
      part_number: 2,
      target_count: 3,
      done_count: 1,
    },
    { activity_type: 'VOCAB_REVIEW', target_count: 20, done_count: 5 },
    { activity_type: 'MISTAKE_REVIEW', target_count: 1, done_count: 0 },
  ] as StudyPlanItemRow[];
  it('describes remaining work rather than the full assigned count', () => {
    const text = reminderContent(
      goal,
      4,
      items,
      new Date('2026-10-02T12:00:00Z'),
    );
    expect(text).toContain('Còn 6 bài trong 4 ngày');
    expect(text).toContain(
      '2 bài Writing Part 2; ôn 15 thẻ từ vựng; ôn lại câu sai',
    );
    expect(text).not.toContain('ngày cuối');
  });
  it('uses the goal calendar for the final day even across UTC midnight', () => {
    expect(
      reminderContent(goal, 4, items, new Date('2026-10-04T17:00:00Z')),
    ).toMatch(/^Hôm nay là ngày cuối/);
  });
  it('keeps encouraging practice after the test count is reached without claiming the target band', () => {
    const text = reminderContent(
      goal,
      12,
      items,
      new Date('2026-10-03T12:00:00Z'),
    );
    expect(text).toContain('đã đủ 10 bài mục tiêu');
    expect(text).toContain('hướng tới B2');
    expect(text).not.toContain('Còn -');
  });
});
