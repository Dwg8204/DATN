import { EntityManager } from 'typeorm';
import { createHash } from 'node:crypto';

/** Persist the FINAL intent in the same transaction that ends/replaces the goal.
 * The report worker builds its numeric snapshot after the lifecycle commit. */
export async function queueFinalReport(manager: EntityManager, goalId: string) {
  await manager.query(
    `INSERT INTO learning_insights(user_id,goal_id,kind,period_key,covers_from,covers_to,
      snapshot_version,input_hash,snapshot)
     SELECT user_id,id,'FINAL','FINAL',start_date,
       LEAST((ended_at AT TIME ZONE timezone)::date,start_date+duration_days-1),
       1,$2,'{"awaitingFinalSnapshot":true}'::jsonb
     FROM learning_goals WHERE id=$1 AND ended_at IS NOT NULL
       AND (status IN ('COMPLETED','EXPIRED') OR
         (status='REPLACED' AND (ended_at AT TIME ZONE timezone)::date-start_date+1>=3))
     ON CONFLICT DO NOTHING`,
    [goalId, createHash('sha256').update(`final:${goalId}`).digest('hex')],
  );
}
