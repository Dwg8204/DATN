import { EntityManager } from 'typeorm';
import { LearningGoalRow } from '../types/personalization.type';

/** Enqueue atomically; the existing notification worker delivers and emits after commit. */
export async function recordGoalAchievement(
  manager: EntityManager,
  goal: LearningGoalRow,
) {
  await manager.query(
    `WITH notification AS (
    INSERT INTO notifications(title,content,type,channel,audience_type,action_path,status,scheduled_at,dedupe_key)
    VALUES($1,$2,'LEARNING_REMINDER','IN_APP','SELECTED_USERS','/profile/dashboard','SCHEDULED',now(),$3)
    ON CONFLICT(dedupe_key) DO NOTHING RETURNING id)
    INSERT INTO notification_recipients(notification_id,user_id,delivery_status)
    SELECT id,$4,'PENDING' FROM notification ON CONFLICT(notification_id,user_id) DO NOTHING`,
    [
      'Bạn đã đạt số bài mục tiêu!',
      `Bạn đã hoàn thành ${goal.target_test_count} bài. Tiếp tục luyện tập hướng tới ${goal.target_cefr} hoặc kết thúc mục tiêu sớm trong trang cá nhân.`,
      `goal-reached:${goal.id}:IN_APP`,
      goal.user_id,
    ],
  );
}
