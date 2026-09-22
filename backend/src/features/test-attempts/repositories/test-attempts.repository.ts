import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { firstMutationRow } from '../../../common/database/mutation-result';
import { ApplicationError } from '../../../common/errors/application.error';
import { Answers, AssessmentResult, AttemptMetadata, AttemptRow, LockedAttemptRow, ProgressRow, SavedProgressRow, SkillComponent } from '../types/attempt.type';

type PublishedTest = {
  id: string; component: SkillComponent;
  snapshot_id: string; version: number; schema_version: number;
};

@Injectable()
export class TestAttemptsRepository {
  constructor(readonly dataSource: DataSource) {}

  async published(testId: string, manager: EntityManager): Promise<PublishedTest | null> {
    const rows = await manager.query<PublishedTest[]>(
      `SELECT t.id,t.component,ts.id AS snapshot_id,ts.version,ts.schema_version
       FROM tests t JOIN test_snapshots ts ON ts.id=t.published_snapshot_id
       WHERE t.id=$1 AND t.status='PUBLISHED' AND t.archived_at IS NULL`, [testId]);
    return rows[0] ?? null;
  }

  async find(attemptId: string, studentId: string, manager?: EntityManager): Promise<AttemptRow | null> {
    const rows = await (manager ?? this.dataSource.manager).query<AttemptRow[]>(
      `SELECT a.*,s.test_id,s.version FROM test_attempts a
       JOIN test_snapshots s ON s.id=a.snapshot_id WHERE a.id=$1 AND a.student_id=$2`,
      [attemptId, studentId]);
    return rows[0] ?? null;
  }

  async findSummary(attemptId: string, studentId: string): Promise<LockedAttemptRow | null> {
    const rows = await this.dataSource.query<LockedAttemptRow[]>(
      `SELECT a.*,s.test_id,s.version FROM test_attempts a
       JOIN test_snapshots s ON s.id=a.snapshot_id WHERE a.id=$1 AND a.student_id=$2`,
      [attemptId, studentId]);
    return rows[0] ?? null;
  }

  async metadata(attemptId: string, studentId: string): Promise<AttemptMetadata | null> {
    const rows = await this.dataSource.query<AttemptMetadata[]>(
      'SELECT id,snapshot_id,component FROM test_attempts WHERE id=$1 AND student_id=$2', [attemptId, studentId]);
    return rows[0] ?? null;
  }

  async serverTime(manager?: EntityManager): Promise<Date> {
    const rows = await (manager ?? this.dataSource.manager).query<Array<{ current_time: Date }>>(
      'SELECT clock_timestamp() AS current_time');
    return rows[0].current_time;
  }

  async snapshot(snapshotId: string, manager?: EntityManager): Promise<Record<string, unknown>> {
    const rows = await (manager ?? this.dataSource.manager).query<Array<{ snapshot: Record<string, unknown> }>>(
      'SELECT snapshot FROM test_snapshots WHERE id=$1 AND schema_version=1', [snapshotId]);
    if (!rows[0]) throw new ApplicationError('ATTEMPT_INVALID_SNAPSHOT', 'Test snapshot is missing or unsupported.', 422);
    return rows[0].snapshot;
  }

  async idExists(attemptId: string, manager: EntityManager): Promise<boolean> {
    const rows = await manager.query<Array<{ id: string }>>('SELECT id FROM test_attempts WHERE id=$1', [attemptId]);
    return rows.length > 0;
  }

  async active(testId: string, studentId: string, manager: EntityManager): Promise<AttemptRow | null> {
    const rows = await manager.query<AttemptRow[]>(
      `SELECT a.*,s.test_id,s.version FROM test_attempts a
       JOIN test_snapshots s ON s.id=a.snapshot_id
       JOIN attempt_progress p ON p.attempt_id=a.id
       WHERE s.test_id=$1 AND a.student_id=$2 AND a.status='IN_PROGRESS'
         AND p.sealed_at IS NULL AND (a.expires_at IS NULL OR a.expires_at>clock_timestamp())
       ORDER BY a.started_at DESC LIMIT 1`, [testId, studentId]);
    return rows[0] ?? null;
  }

  async progress(attemptId: string, manager?: EntityManager, lock = false): Promise<ProgressRow | null> {
    const rows = await (manager ?? this.dataSource.manager).query<ProgressRow[]>(
      `SELECT * FROM attempt_progress WHERE attempt_id=$1${lock ? ' FOR UPDATE' : ''}`, [attemptId]);
    return rows[0] ?? null;
  }

  async lockAttempt(attemptId: string, studentId: string, manager: EntityManager): Promise<LockedAttemptRow | null> {
    const rows = await manager.query<LockedAttemptRow[]>(
      `SELECT * FROM test_attempts WHERE id=$1 AND student_id=$2 FOR UPDATE`, [attemptId, studentId]);
    return rows[0] ?? null;
  }

  async dueProgress(manager: EntityManager, excludedIds: string[] = []): Promise<Array<ProgressRow & { student_id: string }>> {
    return manager.query<Array<ProgressRow & { student_id: string }>>(
      `SELECT p.*,a.student_id FROM attempt_progress p
       JOIN test_attempts a ON a.id=p.attempt_id
        WHERE a.status='IN_PROGRESS' AND a.expires_at<=clock_timestamp() AND p.sealed_at IS NULL
          AND NOT (p.attempt_id=ANY($1::uuid[]))
        ORDER BY a.expires_at,a.id LIMIT 1 FOR UPDATE OF p SKIP LOCKED`, [excludedIds]);
  }

  async saveProgress(manager: EntityManager, attemptId: string, answers: Answers, revision: number, progress: Record<string, unknown>): Promise<SavedProgressRow> {
    const rows = await manager.query<SavedProgressRow[]>(
      `UPDATE attempt_progress SET answers=$2::jsonb,progress=$3::jsonb,revision=$4,saved_at=clock_timestamp()
       WHERE attempt_id=$1 AND sealed_at IS NULL RETURNING revision,saved_at,progress`,
      [attemptId, JSON.stringify(answers), JSON.stringify(progress), revision]);
    const saved = firstMutationRow<SavedProgressRow>(rows);
    return saved;
  }

  async complete(manager: EntityManager, attemptId: string, result: AssessmentResult, submittedAt?: Date, estimatedCefr?: string | null): Promise<LockedAttemptRow> {
    const rows = await manager.query<LockedAttemptRow[]>(
      `UPDATE test_attempts SET status='SUBMITTED',grading_status=$2,
       result=$3::jsonb,score=$4,max_score=$5,result_source=$6,
       submitted_at=COALESCE($7::timestamptz,clock_timestamp()),
       completed_at=CASE WHEN $6::result_source='AUTOMATIC'::result_source THEN clock_timestamp() ELSE NULL END,
       estimated_cefr=$8,
       updated_at=clock_timestamp()
       WHERE id=$1 RETURNING *`,
      [attemptId, result.method === 'OBJECTIVE' ? 'COMPLETED' : 'QUEUED', JSON.stringify(result),
        result.score, result.maxScore, result.method === 'OBJECTIVE' ? 'AUTOMATIC' : null, submittedAt ?? null, estimatedCefr ?? null]);
    const completed = firstMutationRow<LockedAttemptRow>(rows);
    return completed;
  }

  async history(studentId: string, component: SkillComponent | undefined, page: number, pageSize: number,
    mode?: string, search?: string, sort = 'desc') {
    const values: unknown[] = [studentId];
    const filters = ["a.status='SUBMITTED'"];
    if (component) { values.push(component); filters.push(`a.component=$${values.length}`); }
    if (mode === 'full') filters.push("a.scope='FULL_SKILL'");
    else if (/^part[1-4]$/.test(mode ?? '')) {
      values.push(Number(mode!.slice(4)));
      filters.push(`a.scope='PART' AND a.part_number=$${values.length}`);
    }
    if (search?.trim()) {
      values.push(`%${search.trim().replace(/[%_\\]/g, value => `\\${value}`)}%`);
      filters.push(`(s.snapshot #>> '{details,title}') ILIKE $${values.length} ESCAPE '\\'`);
    }
    const filter = filters.length ? `AND ${filters.join(' AND ')}` : '';
    const direction = sort === 'asc' ? 'ASC' : 'DESC';
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT a.id AS "attemptId",s.test_id AS "testId",s.version,
              s.snapshot #>> '{details,title}' AS title,a.component,a.scope,a.part_number AS "partNumber",
               a.status,a.grading_status AS "gradingStatus",a.score::float8 AS score,a.max_score::float8 AS "maxScore",a.started_at AS "startedAt",
              a.submitted_at AS "submittedAt",a.completed_at AS "completedAt"
       FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id
       WHERE a.student_id=$1 ${filter} ORDER BY a.started_at ${direction},a.id ${direction}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize]);
    const count = await this.dataSource.query<Array<{ total: string }>>(
      `SELECT count(*)::text AS total FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id
       WHERE a.student_id=$1 ${filter}`, values);
    return { rows, total: Number(count[0]?.total ?? 0) };
  }

  async states(studentId: string, testIds: string[]) {
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT DISTINCT ON (s.test_id)
              a.id AS "attemptId",s.test_id AS "testId",a.status,a.score::float8 AS score,
              a.max_score::float8 AS "maxScore",a.started_at AS "startedAt",a.submitted_at AS "submittedAt"
       FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id
       WHERE a.student_id=$1 AND s.test_id=ANY($2::uuid[])
       ORDER BY s.test_id,a.started_at DESC,a.id DESC`,
      [studentId, testIds],
    );
  }
}
