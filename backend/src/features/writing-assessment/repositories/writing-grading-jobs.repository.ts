import { Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { firstMutationRow } from '../../../common/database/mutation-result';
import { ApplicationError } from '../../../common/errors/application.error';
import { AssessmentResult, LockedAttemptRow } from '../../test-attempts/types/attempt.type';
import { WritingInput } from '../contracts/writing-assessment-input';
import { WritingJobConfig } from '../writing-ai-config.service';

export type WritingJob = {
  id: string;
  attempt_id: string;
  assessment_revision: number;
  input_hash: string;
  config_snapshot: WritingJobConfig;
  attempt_count: number;
  lease_token: string;
  error_code: string | null;
};
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export const writingInputHash = (input: WritingInput, config: WritingJobConfig) =>
  createHash('sha256').update(canonical({ input, config })).digest('hex');

@Injectable()
export class WritingGradingJobsRepository {
  constructor(readonly db: DataSource) {}
  async enqueue(
    manager: EntityManager,
    attempt: LockedAttemptRow,
    input: WritingInput,
    config: WritingJobConfig,
  ): Promise<LockedAttemptRow> {
    if (attempt.component !== 'WRITING' || attempt.status !== 'SUBMITTED')
      throw new Error('WRITING_ATTEMPT_INVALID');
    const revision = attempt.assessment_revision + 1;
    await manager.query(
      `INSERT INTO writing_grading_jobs(attempt_id,assessment_revision,input_hash,config_snapshot)
      VALUES($1,$2,$3,$4::jsonb)`,
      [attempt.id, revision, writingInputHash(input, config), JSON.stringify(config)],
    );
    const rows = await manager.query(
      `UPDATE test_attempts SET assessment_revision=$2,grading_status='QUEUED',completed_at=NULL,
      result=result-'gradingNotice',updated_at=now() WHERE id=$1 AND component='WRITING' AND status='SUBMITTED' RETURNING *`,
      [attempt.id, revision],
    );
    return firstMutationRow<LockedAttemptRow>(rows);
  }
  async claim(minIntervalMs: number): Promise<WritingJob | null> {
    return this.db.transaction(async (manager) => {
      const [gate] = await manager.query('SELECT pg_try_advisory_xact_lock(1760000012) AS acquired');
      if (!gate.acquired) return null;
      const [busy] = await manager.query(
        `SELECT EXISTS(SELECT 1 FROM writing_grading_jobs WHERE status='PROCESSING' AND lease_expires_at>now())
        OR EXISTS(SELECT 1 FROM writing_grading_jobs WHERE attempt_count>0 AND updated_at>now()-($1::integer * interval '1 millisecond')) AS busy`,
        [minIntervalMs],
      );
      if (busy.busy) return null;
      // Every Writing transaction locks the attempt before its job. Progress is sealed and read-only here.
      const [candidate] =
        await manager.query(`SELECT a.id,j.id AS job_id FROM test_attempts a JOIN writing_grading_jobs j ON j.attempt_id=a.id
        AND j.assessment_revision=a.assessment_revision WHERE a.component='WRITING' AND a.status='SUBMITTED' AND a.result->>'method'='PENDING_AI'
        AND ((j.status='QUEUED' AND j.available_at<=now()) OR (j.status='PROCESSING' AND j.lease_expires_at<=now()))
        ORDER BY j.available_at,j.created_at LIMIT 1 FOR UPDATE OF a SKIP LOCKED`);
      if (!candidate) return null;
      const [job] = await manager.query('SELECT * FROM writing_grading_jobs WHERE id=$1 FOR UPDATE', [
        candidate.job_id,
      ]);
      if (job.attempt_count >= job.config_snapshot.maxAttempts) {
        await manager.query(
          `UPDATE writing_grading_jobs SET status='FAILED',error_code='JOB_LEASE_EXPIRED',completed_at=now(),updated_at=now() WHERE id=$1`,
          [job.id],
        );
        await manager.query(
          `UPDATE test_attempts SET grading_status='FAILED',updated_at=now() WHERE id=$1 AND component='WRITING'`,
          [candidate.id],
        );
        return null;
      }
      const result = await manager.query(
        `UPDATE writing_grading_jobs SET status='PROCESSING',attempt_count=attempt_count+1,
        lease_token=$2,lease_expires_at=now()+interval '120 seconds',updated_at=now() WHERE id=$1 RETURNING *`,
        [job.id, randomUUID()],
      );
      await manager.query(
        `UPDATE test_attempts SET grading_status='PROCESSING',updated_at=now() WHERE id=$1 AND component='WRITING'`,
        [candidate.id],
      );
      return firstMutationRow<WritingJob>(result);
    });
  }
  async context(job: WritingJob) {
    const [row] = await this.db.query(
      `SELECT a.*,s.snapshot,p.answers,p.sealed_at FROM test_attempts a
      JOIN test_snapshots s ON s.id=a.snapshot_id JOIN attempt_progress p ON p.attempt_id=a.id
      WHERE a.id=$1 AND a.component='WRITING' AND a.status='SUBMITTED' AND a.assessment_revision=$2`,
      [job.attempt_id, job.assessment_revision],
    );
    if (!row?.sealed_at) throw new Error('WRITING_PROGRESS_NOT_SEALED');
    return row;
  }
  private async ownedLease(manager: EntityManager, job: WritingJob): Promise<boolean> {
    const [attempt] = await manager.query(
      `SELECT id FROM test_attempts WHERE id=$1 AND component='WRITING' AND status='SUBMITTED'
      AND assessment_revision=$2 AND result->>'method'='PENDING_AI' FOR UPDATE`,
      [job.attempt_id, job.assessment_revision],
    );
    if (!attempt) return false;
    const [lease] = await manager.query(
      `SELECT id FROM writing_grading_jobs WHERE id=$1 AND status='PROCESSING'
      AND lease_token=$2 AND lease_expires_at>now() FOR UPDATE`,
      [job.id, job.lease_token],
    );
    return !!lease;
  }
  async finish(job: WritingJob, result: AssessmentResult): Promise<void> {
    await this.db.transaction(async (manager) => {
      if (!(await this.ownedLease(manager, job))) return;
      await manager.query(
        `UPDATE test_attempts SET grading_status='COMPLETED',result=$2::jsonb,score=NULL,max_score=NULL,
        estimated_cefr=$3,result_source='AUTOMATIC',completed_at=now(),updated_at=now() WHERE id=$1 AND component='WRITING'`,
        [job.attempt_id, JSON.stringify(result), result.writing?.cefr.level ?? null],
      );
      await manager.query(
        `UPDATE writing_grading_jobs SET status='COMPLETED',error_code=NULL,lease_token=NULL,lease_expires_at=NULL,
        completed_at=now(),updated_at=now() WHERE id=$1`,
        [job.id],
      );
    });
  }
  async fail(job: WritingJob, code: string, retry: boolean, delayMs: number): Promise<void> {
    await this.db.transaction(async (manager) => {
      if (!(await this.ownedLease(manager, job))) return;
      const status = retry && job.attempt_count < job.config_snapshot.maxAttempts ? 'QUEUED' : 'FAILED';
      await manager.query(
        `UPDATE writing_grading_jobs SET status=$2::varchar,error_code=$3,available_at=now()+($4::integer * interval '1 millisecond'),
        lease_token=NULL,lease_expires_at=NULL,completed_at=CASE WHEN $2::varchar='FAILED' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1`,
        [job.id, status, code, Math.min(86400000, Math.max(1000, delayMs))],
      );
      await manager.query(
        `UPDATE test_attempts SET grading_status=$2::grading_status,updated_at=now() WHERE id=$1 AND component='WRITING'`,
        [job.attempt_id, status],
      );
    });
  }
  async status(attemptId: string, manager?: EntityManager) {
    const [job] = await (manager ?? this.db.manager).query(
      `SELECT j.status,j.error_code,j.available_at FROM writing_grading_jobs j JOIN test_attempts a ON a.id=j.attempt_id
      WHERE j.attempt_id=$1 AND a.component='WRITING' AND j.assessment_revision=a.assessment_revision`,
      [attemptId],
    );
    return job as { status: string; error_code: string | null; available_at: Date } | undefined;
  }
  async retry(
    attemptId: string,
    userId: string,
    purpose: 'EXAM' | 'PRACTICE',
    build: (manager: EntityManager, attempt: LockedAttemptRow) => Promise<LockedAttemptRow>,
  ) {
    return this.db.transaction(async (manager) => {
      const [attempt] = await manager.query(
        `SELECT * FROM test_attempts WHERE id=$1 AND student_id=$2 AND component='WRITING' AND purpose=$3 FOR UPDATE`,
        [attemptId, userId, purpose],
      );
      if (!attempt) throw new ApplicationError('ATTEMPT_NOT_FOUND', 'Writing attempt not found.', 404);
      if (attempt.status !== 'SUBMITTED' || attempt.grading_status !== 'FAILED')
        throw new ApplicationError(
          'WRITING_RETRY_NOT_ALLOWED',
          'Only failed Writing assessments can be retried.',
          409,
        );
      const [limits] = await manager.query(
        `SELECT count(*) FILTER (WHERE created_at>=now()-interval '24 hours'
          AND assessment_revision<>(SELECT min(assessment_revision) FROM writing_grading_jobs WHERE attempt_id=$1)) AS recent,
        COALESCE(max(created_at)>now()-interval '60 seconds',false) AS cooling_down
        FROM writing_grading_jobs WHERE attempt_id=$1`,
        [attemptId],
      );
      if (Number(limits.recent) >= 3 || limits.cooling_down) {
        throw new ApplicationError(
          'WRITING_RETRY_LIMIT',
          'Please wait before retrying this assessment.',
          429,
        );
      }
      return build(manager, attempt as LockedAttemptRow);
    });
  }
}
