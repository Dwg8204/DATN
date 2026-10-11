import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ApplicationError } from '../../../common/errors/application.error';
import { firstMutationRow } from '../../../common/database/mutation-result';
import { AssessmentResult } from '../types/attempt.type';

export type SpeakingJob = { attempt_id: string; lease_token: string; failures: number; responses: Record<string, string> };

@Injectable()
export class SpeakingGradingRepository {
  constructor(private readonly db: DataSource) {}

  async consent(attemptId: string, userId: string, policy: string, save: boolean) {
    return this.db.transaction(async manager => {
      const rows = await manager.query(`SELECT id FROM test_attempts WHERE id=$1 AND student_id=$2
        AND component='SPEAKING' AND status IN ('IN_PROGRESS','SUBMITTED') FOR UPDATE`, [attemptId, userId]);
      if (!rows.length) throw new ApplicationError('ATTEMPT_NOT_FOUND', 'Speaking attempt not found.', 404);
      if (save) await manager.query(`INSERT INTO speaking_ai_consents(attempt_id,user_id,policy_version,confirmed_adult)
        VALUES($1,$2,$3,true) ON CONFLICT(attempt_id) DO UPDATE SET policy_version=EXCLUDED.policy_version,accepted_at=now()
        WHERE speaking_ai_consents.policy_version<>EXCLUDED.policy_version`, [attemptId, userId, policy]);
      const consent = await manager.query(`SELECT policy_version,accepted_at FROM speaking_ai_consents WHERE attempt_id=$1 AND policy_version=$2`, [attemptId, policy]);
      return consent[0] ?? null;
    });
  }

  async claim(policy = 'speaking-ai-v1'): Promise<SpeakingJob | null> {
    return this.db.transaction(async manager => {
      // A worker crash during the final allowed run must not leave the attempt PROCESSING forever.
      const expired = await manager.query(`UPDATE speaking_grading_jobs SET status='FAILED',error_code='JOB_LEASE_EXPIRED',updated_at=now()
        WHERE status='PROCESSING' AND lease_until<now() AND failures>=3 RETURNING attempt_id`);
      const expiredRows = Array.isArray(expired[0]) ? expired[0] : expired;
      if (expiredRows.length) await manager.query(`UPDATE test_attempts SET grading_status='FAILED',assessment_revision=assessment_revision+1,
        result=jsonb_set(result,'{gradingNotice}',to_jsonb('Xử lý audio bị gián đoạn nhiều lần. Vui lòng liên hệ quản trị viên.'::text))
        WHERE id=ANY($1::uuid[]) AND result->>'method'='PENDING_AI'`, [expiredRows.map((row: { attempt_id: string }) => row.attempt_id)]);
      await manager.query(`INSERT INTO speaking_grading_jobs(attempt_id)
        SELECT a.id FROM test_attempts a JOIN speaking_ai_consents c ON c.attempt_id=a.id
        WHERE a.component='SPEAKING' AND a.status='SUBMITTED' AND a.result->>'method'='PENDING_AI'
        AND c.policy_version=$1 ON CONFLICT DO NOTHING`, [policy]);
      const candidates = await manager.query(`SELECT attempt_id FROM speaking_grading_jobs
        WHERE ((status IN ('QUEUED','BLOCKED') AND next_run_at<=now()) OR
          (status='PROCESSING' AND lease_until<now())) AND failures<3
        AND EXISTS(SELECT 1 FROM speaking_ai_consents c WHERE c.attempt_id=speaking_grading_jobs.attempt_id AND c.policy_version=$1)
        ORDER BY next_run_at LIMIT 1 FOR UPDATE SKIP LOCKED`, [policy]);
      if (!candidates.length) return null;
      const id = candidates[0].attempt_id;
      const result = await manager.query(`UPDATE speaking_grading_jobs SET status='PROCESSING',lease_token=$2,
        lease_until=now()+interval '10 minutes',updated_at=now(),failures=failures+1 WHERE attempt_id=$1 RETURNING *`, [id, randomUUID()]);
      await manager.query(`UPDATE test_attempts SET grading_status='PROCESSING',
        result=result-'gradingNotice',assessment_revision=assessment_revision+1 WHERE id=$1 AND result->>'method'='PENDING_AI'`, [id]);
      return firstMutationRow<SpeakingJob>(result);
    });
  }

  async renew(job: SpeakingJob): Promise<void> {
    const rows = await this.db.query(`UPDATE speaking_grading_jobs SET lease_until=now()+interval '10 minutes'
      WHERE attempt_id=$1 AND lease_token=$2 AND status='PROCESSING' RETURNING attempt_id`, [job.attempt_id, job.lease_token]);
    firstMutationRow(rows);
  }

  async owner(attemptId: string): Promise<string> {
    const rows = await this.db.query('SELECT student_id FROM test_attempts WHERE id=$1', [attemptId]);
    if (!rows.length) throw new Error('SPEAKING_ATTEMPT_NOT_FOUND');
    return rows[0].student_id as string;
  }

  async cache(job: SpeakingJob, key: string, transcript: string): Promise<void> {
    const rows = await this.db.query(`UPDATE speaking_grading_jobs SET responses=responses || $3::jsonb,updated_at=now()
      WHERE attempt_id=$1 AND lease_token=$2 AND status='PROCESSING' RETURNING attempt_id`,
      [job.attempt_id, job.lease_token, JSON.stringify({ [key]: transcript })]);
    firstMutationRow(rows);
    job.responses[key] = transcript;
  }

  async budget() {
    const rows = await this.db.query(`SELECT
      COALESCE(sum(charged_usd) FILTER (WHERE state='CHARGED' AND created_at>=date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0)::float8 AS used,
      COALESCE(sum(reserved_usd) FILTER (WHERE state='RESERVED'),0)::float8 AS reserved FROM speaking_ai_costs`);
    return rows[0] as { used: number; reserved: number };
  }

  async reserve(job: SpeakingJob, amount: number, model: string, snapshot: Record<string, unknown>, cap: number): Promise<string> {
    return this.db.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(1760000011)');
      const valid = await manager.query(`SELECT attempt_id FROM speaking_grading_jobs WHERE attempt_id=$1 AND lease_token=$2
        AND status='PROCESSING' AND lease_until>now() FOR UPDATE`, [job.attempt_id, job.lease_token]);
      if (!valid.length) throw new Error('JOB_LEASE_LOST');
      const rows = await manager.query(`SELECT COALESCE(sum(CASE WHEN state='RESERVED' THEN reserved_usd ELSE charged_usd END),0)::float8 AS total
        FROM speaking_ai_costs WHERE state='RESERVED' OR created_at>=date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`);
      if (rows[0].total + amount > cap) throw new ApplicationError('SPEAKING_BUDGET_EXCEEDED', 'Ngân sách chấm AI tháng này đã hết.', 503);
      await manager.query(`UPDATE speaking_grading_jobs SET config_snapshot=$3::jsonb WHERE attempt_id=$1 AND lease_token=$2`,
        [job.attempt_id, job.lease_token, JSON.stringify(snapshot)]);
      const result = await manager.query(`INSERT INTO speaking_ai_costs(attempt_id,provider,stage,model,reserved_usd)
        VALUES($1,'GEMINI','assessment',$2,$3) RETURNING id`, [job.attempt_id, model, amount]);
      return firstMutationRow<{ id: string }>(result).id;
    });
  }

  async charge(id: string, amount: number, usage: Record<string, unknown>): Promise<void> {
    await this.db.query(`UPDATE speaking_ai_costs SET state='CHARGED',charged_usd=$2,usage=$3::jsonb
      WHERE id=$1 AND state='RESERVED'`, [id, amount, JSON.stringify(usage)]);
  }

  async finish(job: SpeakingJob, result: AssessmentResult, cefr: string | null): Promise<void> {
    await this.db.transaction(async manager => {
      const rows = await manager.query(`UPDATE speaking_grading_jobs SET status='COMPLETED',lease_until=NULL,error_code=NULL,updated_at=now()
        WHERE attempt_id=$1 AND lease_token=$2 AND status='PROCESSING' RETURNING attempt_id`, [job.attempt_id, job.lease_token]);
      firstMutationRow(rows);
      await manager.query(`UPDATE test_attempts SET grading_status='COMPLETED',assessment_revision=assessment_revision+1,
        result=$2::jsonb,score=$3,max_score=50,estimated_cefr=$4,result_source='AUTOMATIC',completed_at=now(),updated_at=now()
        WHERE id=$1 AND result->>'method'='PENDING_AI'`, [job.attempt_id, JSON.stringify(result), result.score, cefr]);
    });
  }

  async fail(job: SpeakingJob, code: string, retry: boolean, notice: string): Promise<void> {
    await this.db.transaction(async manager => {
      const blocked = code === 'SPEAKING_BUDGET_EXCEEDED';
      const rows = await manager.query(`UPDATE speaking_grading_jobs SET status=$3,
        next_run_at=CASE WHEN $4 THEN (date_trunc('month',now() AT TIME ZONE 'UTC')+interval '1 month') AT TIME ZONE 'UTC'
          ELSE now()+interval '10 minutes' END,lease_until=NULL,error_code=$5,updated_at=now(),
        failures=CASE WHEN $4 THEN greatest(0,failures-1) ELSE failures END
        WHERE attempt_id=$1 AND lease_token=$2 AND status='PROCESSING' RETURNING attempt_id`,
        [job.attempt_id, job.lease_token, blocked ? 'BLOCKED' : retry && job.failures < 3 ? 'QUEUED' : 'FAILED', blocked, code]);
      if (!Array.isArray(rows) || !rows.length || Array.isArray(rows[0]) && !rows[0].length) return;
      await manager.query(`UPDATE test_attempts SET grading_status=$2::grading_status,
        result=jsonb_set(result,'{gradingNotice}',to_jsonb($3::text)),assessment_revision=assessment_revision+1
        WHERE id=$1 AND result->>'method'='PENDING_AI'`,
        [job.attempt_id, !blocked && retry && job.failures < 3 ? 'QUEUED' : 'FAILED', notice]);
    });
  }
}
